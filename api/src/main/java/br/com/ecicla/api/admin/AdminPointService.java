package br.com.ecicla.api.admin;

import java.text.Normalizer;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.stereotype.Service;

import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.CollectionPointRepository;
import br.com.ecicla.api.point.PointSource;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.SourceType;

/**
 * Maintenance of collection points by administrators. Every change records {@code adminEditedAt}, so
 * the import from public sources does not overwrite it later.
 */
@Service
public class AdminPointService {

    private static final Comparator<CollectionPoint> BY_NAME = Comparator
            .comparing((CollectionPoint p) -> p.name() == null ? null : normalize(p.name()),
                    Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(p -> p.address() == null ? null : normalize(p.address()),
                    Comparator.nullsLast(Comparator.naturalOrder()));

    private final CollectionPointRepository repository;

    public AdminPointService(CollectionPointRepository repository) {
        this.repository = repository;
    }

    /**
     * All points, by name. {@code query} matches the name, address or operator, ignoring accents and
     * case; {@code status} keeps only active or only deactivated points.
     */
    public List<AdminPointView> list(Optional<String> query, Optional<PointStatus> status) {
        Optional<String> terms = query.map(AdminPointService::normalize).filter(q -> !q.isBlank());
        return repository.findAll().stream()
                .filter(p -> status.map(s -> s == p.status()).orElse(true))
                .filter(p -> terms.map(q -> matches(p, q)).orElse(true))
                .sorted(BY_NAME)
                .map(AdminPointView::from)
                .toList();
    }

    public Optional<AdminPointView> find(String id) {
        return findPoint(id).map(AdminPointView::from);
    }

    /** New points are kept by the team itself, so they count as manual entries. */
    public AdminPointView create(PointInput input) {
        PointInput valid = input.validated();
        Instant now = Instant.now();
        CollectionPoint point = new CollectionPoint(
                null,
                valid.name(),
                new GeoJsonPoint(valid.longitude(), valid.latitude()),
                valid.address(),
                false,
                valid.acceptedMaterials(),
                valid.openingHours(),
                valid.operator(),
                valid.notes(),
                new PointSource(SourceType.MANUAL, "admin/" + UUID.randomUUID(), now),
                PointStatus.ACTIVE,
                now,
                now);
        return AdminPointView.from(repository.save(point));
    }

    public Optional<AdminPointView> update(String id, PointInput input) {
        PointInput valid = input.validated();
        return findPoint(id).map(stored -> {
            Instant now = Instant.now();
            // An approximate address the administrator left untouched is still approximate.
            boolean approximate = Boolean.TRUE.equals(stored.addressApproximate())
                    && valid.address() != null && valid.address().equals(stored.address());
            CollectionPoint updated = new CollectionPoint(
                    stored.id(),
                    valid.name(),
                    new GeoJsonPoint(valid.longitude(), valid.latitude()),
                    valid.address(),
                    approximate,
                    valid.acceptedMaterials(),
                    valid.openingHours(),
                    valid.operator(),
                    valid.notes(),
                    stored.source(),
                    stored.status(),
                    now,
                    now);
            return AdminPointView.from(repository.save(updated));
        });
    }

    /** Deactivated points leave the map but stay in the database, and can be reactivated. */
    public Optional<AdminPointView> changeStatus(String id, PointStatus status) {
        return findPoint(id).map(stored -> AdminPointView.from(repository.save(new CollectionPoint(
                stored.id(), stored.name(), stored.location(), stored.address(), stored.addressApproximate(),
                stored.acceptedMaterials(), stored.openingHours(), stored.operator(), stored.notes(), stored.source(),
                status, Instant.now(), stored.adminEditedAt()))));
    }

    private Optional<CollectionPoint> findPoint(String id) {
        return ObjectId.isValid(id) ? repository.findById(id) : Optional.empty();
    }

    private static boolean matches(CollectionPoint point, String terms) {
        return Stream.of(point.name(), point.address(), point.operator())
                .filter(Objects::nonNull)
                .map(AdminPointService::normalize)
                .anyMatch(text -> text.contains(terms));
    }

    /** "Ecoponto São João" and "ecoponto sao joao" compare equal. */
    static String normalize(String text) {
        String withoutAccents = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return withoutAccents.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").strip();
    }
}
