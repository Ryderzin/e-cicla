package br.com.ecicla.api.importer;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.data.mongodb.core.BulkOperations;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.bulk.BulkWriteResult;

import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.PointStatus;

/**
 * Imports collection points from OpenStreetMap and from the manual seed file. Points are upserted by
 * {@code source.externalId}, so running the import again updates them instead of duplicating. Points
 * without an address get an approximate one from their coordinates (Nominatim), looked up only once.
 */
@Service
public class PointImportService {

    private static final Logger log = LoggerFactory.getLogger(PointImportService.class);

    private static final int OSM_ATTEMPTS = 3;
    private static final Duration OSM_RETRY_WAIT = Duration.ofSeconds(30);
    private static final int NOMINATIM_MAX_CONSECUTIVE_FAILURES = 3;

    private final OverpassClient overpassClient;
    private final NominatimClient nominatimClient;
    private final MongoTemplate mongoTemplate;
    private final ObjectMapper objectMapper;
    private final Resource seedFile;
    private final boolean lookUpMissingAddresses;

    PointImportService(
            OverpassClient overpassClient,
            NominatimClient nominatimClient,
            MongoTemplate mongoTemplate,
            ObjectMapper objectMapper,
            @Value("${app.import.seed-file}") Resource seedFile,
            @Value("${app.import.look-up-missing-addresses}") boolean lookUpMissingAddresses) {
        this.overpassClient = overpassClient;
        this.nominatimClient = nominatimClient;
        this.mongoTemplate = mongoTemplate;
        this.objectMapper = objectMapper;
        this.seedFile = seedFile;
        this.lookUpMissingAddresses = lookUpMissingAddresses;
    }

    public record ImportResult(int fromOsm, int fromSeed, int inserted, int updated) {
    }

    public ImportResult importAll() {
        List<ImportedPoint> osmPoints = fetchFromOsm();
        List<ImportedPoint> seedPoints = readSeed();

        // The same id could appear twice (e.g. repeated in the seed); keep the last one.
        Map<String, ImportedPoint> byExternalId = new LinkedHashMap<>();
        osmPoints.forEach(p -> byExternalId.put(p.externalId(), p));
        seedPoints.forEach(p -> byExternalId.put(p.externalId(), p));

        ImportResult result = upsert(byExternalId.values(), osmPoints.size(), seedPoints.size());
        log.info("Import finished: {} points from OpenStreetMap, {} from the seed file, {} inserted, {} updated",
                result.fromOsm(), result.fromSeed(), result.inserted(), result.updated());
        return result;
    }

    private List<ImportedPoint> fetchFromOsm() {
        List<OverpassResponse.Element> elements = null;
        for (int attempt = 1; elements == null; attempt++) {
            try {
                log.info("Fetching collection points from OpenStreetMap, attempt {} of {} (this can take a few minutes)...",
                        attempt, OSM_ATTEMPTS);
                elements = overpassClient.fetchElements();
            } catch (RestClientException e) {
                if (attempt == OSM_ATTEMPTS || !isTemporary(e)) {
                    log.error("Could not fetch points from OpenStreetMap ({}); continuing with the seed file only",
                            describe(e));
                    return List.of();
                }
                log.warn("OpenStreetMap is busy ({}); trying again in {} seconds", describe(e),
                        OSM_RETRY_WAIT.toSeconds());
                if (!waitBeforeRetry()) {
                    return List.of();
                }
            }
        }
        List<ImportedPoint> points = elements.stream()
                .map(OsmPointMapper::toImportedPoint)
                .flatMap(Optional::stream)
                .toList();
        log.info("OpenStreetMap returned {} elements, {} usable", elements.size(), points.size());
        return points;
    }

    /** Overpass answers 429/502/503/504 or times out when it is overloaded; those are worth retrying. */
    private static boolean isTemporary(RestClientException e) {
        if (e instanceof RestClientResponseException response) {
            int status = response.getStatusCode().value();
            return status == 429 || status == 502 || status == 503 || status == 504;
        }
        return e instanceof ResourceAccessException;
    }

    /** Short description of the failure; error responses carry a whole HTML page we do not want in the log. */
    private static String describe(RestClientException e) {
        if (e instanceof RestClientResponseException response) {
            return "HTTP " + response.getStatusCode().value();
        }
        return e.getMessage();
    }

    private static boolean waitBeforeRetry() {
        try {
            Thread.sleep(OSM_RETRY_WAIT);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private List<ImportedPoint> readSeed() {
        if (!seedFile.exists()) {
            log.warn("Seed file {} not found; skipping manual points", seedFile);
            return List.of();
        }
        List<SeedPoint> entries;
        try (InputStream in = seedFile.getInputStream()) {
            entries = objectMapper.readValue(in, new TypeReference<List<SeedPoint>>() {
            });
        } catch (IOException e) {
            log.error("Could not read seed file {}; skipping manual points: {}", seedFile, e.getMessage());
            return List.of();
        }
        List<ImportedPoint> points = new ArrayList<>();
        for (int i = 0; i < entries.size(); i++) {
            try {
                points.add(entries.get(i).toImportedPoint());
            } catch (IllegalArgumentException e) {
                log.warn("Skipping seed entry #{} ({}): {}", i + 1, entries.get(i).externalId(), e.getMessage());
            }
        }
        return points;
    }

    /** What the import does with a point's address. */
    enum AddressAction {
        /** The source (OpenStreetMap or seed) has an address: use it. */
        FROM_SOURCE,
        /** This location was already looked up (found or not): keep the result, do not ask Nominatim again. */
        KEEP_STORED,
        /** No address yet: look up an approximate one from the coordinates. */
        LOOK_UP
    }

    static AddressAction addressAction(ImportedPoint point, CollectionPoint stored) {
        if (point.address() != null) {
            return AddressAction.FROM_SOURCE;
        }
        boolean alreadyLookedUp = stored != null && Boolean.TRUE.equals(stored.addressApproximate());
        if (alreadyLookedUp && sameLocation(stored.location(), point)) {
            return AddressAction.KEEP_STORED;
        }
        return AddressAction.LOOK_UP;
    }

    private static boolean sameLocation(GeoJsonPoint location, ImportedPoint point) {
        return location != null
                && Math.abs(location.getX() - point.longitude()) < 1e-7
                && Math.abs(location.getY() - point.latitude()) < 1e-7;
    }

    private Map<String, CollectionPoint> findStored(Collection<ImportedPoint> points) {
        List<String> externalIds = points.stream().map(ImportedPoint::externalId).toList();
        Query query = Query.query(Criteria.where("source.externalId").in(externalIds));
        return mongoTemplate.find(query, CollectionPoint.class).stream()
                .collect(Collectors.toMap(p -> p.source().externalId(), p -> p, (a, b) -> a));
    }

    /**
     * Approximate addresses by external id. A point is in the map when Nominatim answered, with an
     * empty value when it had no useful address there; points whose lookup failed are left out.
     */
    private Map<String, Optional<String>> lookUpAddresses(List<ImportedPoint> points) {
        Map<String, Optional<String>> answered = new HashMap<>();
        if (points.isEmpty() || !lookUpMissingAddresses) {
            return answered;
        }
        log.info("Looking up approximate addresses for {} points without one (about {} seconds)...",
                points.size(), points.size() + 1);
        int consecutiveFailures = 0;
        for (ImportedPoint point : points) {
            try {
                answered.put(point.externalId(), nominatimClient.reverse(point.latitude(), point.longitude()));
                consecutiveFailures = 0;
            } catch (RestClientException e) {
                log.warn("Could not look up the address of {} ({})", point.externalId(), describe(e));
                if (++consecutiveFailures == NOMINATIM_MAX_CONSECUTIVE_FAILURES) {
                    log.error("Nominatim failed {} times in a row; skipping the remaining addresses",
                            consecutiveFailures);
                    break;
                }
            }
        }
        log.info("Found approximate addresses for {} of {} points",
                answered.values().stream().filter(Optional::isPresent).count(), points.size());
        return answered;
    }

    /** An administrator changed this point by hand; the import must not overwrite those changes. */
    static boolean editedByAdmin(CollectionPoint stored) {
        return stored != null && stored.adminEditedAt() != null;
    }

    private ImportResult upsert(Collection<ImportedPoint> allPoints, int fromOsm, int fromSeed) {
        Map<String, CollectionPoint> stored = findStored(allPoints);
        List<ImportedPoint> points = allPoints.stream()
                .filter(p -> !editedByAdmin(stored.get(p.externalId())))
                .toList();
        if (points.size() < allPoints.size()) {
            log.info("Keeping {} points edited by administrators as they are", allPoints.size() - points.size());
        }
        Map<String, AddressAction> addressActions = new HashMap<>();
        points.forEach(p -> addressActions.put(p.externalId(), addressAction(p, stored.get(p.externalId()))));
        Map<String, Optional<String>> lookedUp = lookUpAddresses(points.stream()
                .filter(p -> addressActions.get(p.externalId()) == AddressAction.LOOK_UP)
                .toList());

        Instant now = Instant.now();
        BulkOperations bulk = mongoTemplate.bulkOps(BulkOperations.BulkMode.UNORDERED, CollectionPoint.class);
        int operations = 0;
        for (ImportedPoint point : points) {
            Query byExternalId = Query.query(Criteria.where("source.externalId").is(point.externalId()));
            Update update = new Update()
                    .set("name", point.name())
                    .set("location", new GeoJsonPoint(point.longitude(), point.latitude()))
                    .set("acceptedMaterials", point.acceptedMaterials())
                    .set("openingHours", point.openingHours())
                    .set("operator", point.operator())
                    .set("notes", point.notes())
                    .set("source.type", point.sourceType())
                    .set("source.importedAt", now)
                    .set("updatedAt", now)
                    // Only new points start active; later changes by administrators are kept.
                    .setOnInsert("status", PointStatus.ACTIVE);
            switch (addressActions.get(point.externalId())) {
                case FROM_SOURCE -> update.set("address", point.address()).set("addressApproximate", false);
                case KEEP_STORED -> {
                    // Leave the stored approximate address as it is.
                }
                case LOOK_UP -> {
                    // Stored even when nothing was found, so the location is not looked up again.
                    // When the lookup failed, whatever is stored stays and is retried on the next import.
                    Optional<String> address = lookedUp.get(point.externalId());
                    if (address != null) {
                        update.set("address", address.orElse(null)).set("addressApproximate", true);
                    }
                }
            }
            bulk.upsert(byExternalId, update);
            operations++;
        }
        if (operations == 0) {
            return new ImportResult(fromOsm, fromSeed, 0, 0);
        }
        BulkWriteResult result = bulk.execute();
        return new ImportResult(fromOsm, fromSeed, result.getUpserts().size(), result.getMatchedCount());
    }
}
