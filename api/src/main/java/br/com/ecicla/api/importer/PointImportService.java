package br.com.ecicla.api.importer;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.bulk.BulkWriteResult;

import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.PointStatus;

/**
 * Imports collection points from OpenStreetMap and from the manual seed file. Points are upserted by
 * {@code source.externalId}, so running the import again updates them instead of duplicating.
 */
@Service
public class PointImportService {

    private static final Logger log = LoggerFactory.getLogger(PointImportService.class);

    private final OverpassClient overpassClient;
    private final MongoTemplate mongoTemplate;
    private final ObjectMapper objectMapper;
    private final Resource seedFile;

    PointImportService(
            OverpassClient overpassClient,
            MongoTemplate mongoTemplate,
            ObjectMapper objectMapper,
            @Value("${app.import.seed-file}") Resource seedFile) {
        this.overpassClient = overpassClient;
        this.mongoTemplate = mongoTemplate;
        this.objectMapper = objectMapper;
        this.seedFile = seedFile;
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
        List<OverpassResponse.Element> elements;
        try {
            log.info("Fetching collection points from OpenStreetMap (this can take a few minutes)...");
            elements = overpassClient.fetchElements();
        } catch (RestClientException e) {
            log.error("Could not fetch points from OpenStreetMap; continuing with the seed file only: {}",
                    e.getMessage());
            return List.of();
        }
        List<ImportedPoint> points = elements.stream()
                .map(OsmPointMapper::toImportedPoint)
                .flatMap(Optional::stream)
                .toList();
        log.info("OpenStreetMap returned {} elements, {} usable", elements.size(), points.size());
        return points;
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

    private ImportResult upsert(Iterable<ImportedPoint> points, int fromOsm, int fromSeed) {
        Instant now = Instant.now();
        BulkOperations bulk = mongoTemplate.bulkOps(BulkOperations.BulkMode.UNORDERED, CollectionPoint.class);
        int operations = 0;
        for (ImportedPoint point : points) {
            Query byExternalId = Query.query(Criteria.where("source.externalId").is(point.externalId()));
            Update update = new Update()
                    .set("name", point.name())
                    .set("location", new GeoJsonPoint(point.longitude(), point.latitude()))
                    .set("address", point.address())
                    .set("acceptedMaterials", point.acceptedMaterials())
                    .set("openingHours", point.openingHours())
                    .set("operator", point.operator())
                    .set("notes", point.notes())
                    .set("source.type", point.sourceType())
                    .set("source.importedAt", now)
                    .set("updatedAt", now)
                    // Only new points start active; later changes by administrators are kept.
                    .setOnInsert("status", PointStatus.ACTIVE);
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
