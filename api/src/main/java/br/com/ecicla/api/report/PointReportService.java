package br.com.ecicla.api.report;

import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;

import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.CollectionPointRepository;
import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.SourceType;

/** Builds the collection point report with its totals (PB30). */
@Service
public class PointReportService {

    private static final Comparator<CollectionPoint> BY_NAME = Comparator
            .comparing((CollectionPoint p) -> p.name() == null || p.name().isBlank() ? null : normalize(p.name()),
                    Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(p -> p.address() == null ? null : normalize(p.address()),
                    Comparator.nullsLast(Comparator.naturalOrder()));

    private final CollectionPointRepository points;
    private final Clock clock;

    public PointReportService(CollectionPointRepository points, Clock clock) {
        this.points = points;
        this.clock = clock;
    }

    /**
     * @param status   {@code ACTIVE}, {@code INACTIVE} or empty for all points
     * @param material keeps only the points that accept it
     * @param query    matches the name, address or operator, ignoring accents and case
     */
    public PointReport build(Optional<PointStatus> status, Optional<Material> material, Optional<String> query) {
        Optional<String> terms = query.map(PointReportService::normalize).filter(q -> !q.isBlank());
        List<CollectionPoint> selected = points.findAll().stream()
                .filter(p -> status.map(s -> s == p.status()).orElse(true))
                .filter(p -> material.map(m -> accepted(p).contains(m)).orElse(true))
                .filter(p -> terms.map(q -> matches(p, q)).orElse(true))
                .sorted(BY_NAME)
                .toList();

        Map<PointStatus, Long> byStatus = new EnumMap<>(PointStatus.class);
        Map<Material, Long> byMaterial = new EnumMap<>(Material.class);
        Map<SourceType, Long> bySource = new EnumMap<>(SourceType.class);
        for (PointStatus s : PointStatus.values()) {
            byStatus.put(s, 0L);
        }
        for (Material m : Material.values()) {
            byMaterial.put(m, 0L);
        }
        for (SourceType t : SourceType.values()) {
            bySource.put(t, 0L);
        }
        for (CollectionPoint p : selected) {
            if (p.status() != null) {
                byStatus.merge(p.status(), 1L, Long::sum);
            }
            accepted(p).stream().distinct().forEach(m -> byMaterial.merge(m, 1L, Long::sum));
            if (p.source() != null && p.source().type() != null) {
                bySource.merge(p.source().type(), 1L, Long::sum);
            }
        }

        List<PointReport.Item> items = selected.stream().map(p -> new PointReport.Item(
                p.id(),
                p.name() == null || p.name().isBlank() ? null : p.name(),
                p.address(),
                p.address() != null && Boolean.TRUE.equals(p.addressApproximate()),
                accepted(p),
                p.status(),
                p.source() == null ? null : p.source().type(),
                p.updatedAt())).toList();

        return new PointReport(
                Instant.now(clock),
                new PointReport.Filters(status.map(Enum::name).orElse("ALL"), material.orElse(null),
                        terms.isPresent() ? query.get().strip() : null),
                items,
                new PointReport.Totals(items.size(), byStatus, byMaterial, bySource));
    }

    private static List<Material> accepted(CollectionPoint point) {
        return point.acceptedMaterials() == null ? List.of() : point.acceptedMaterials();
    }

    private static boolean matches(CollectionPoint point, String terms) {
        return Stream.of(point.name(), point.address(), point.operator())
                .filter(Objects::nonNull)
                .map(PointReportService::normalize)
                .anyMatch(text -> text.contains(terms));
    }

    static String normalize(String text) {
        String withoutAccents = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return withoutAccents.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").strip();
    }
}
