package br.com.ecicla.api.report;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.SourceType;

/**
 * Collection point report for administrators (PB30): the filtered list and its totals. The totals are
 * computed over the same list, so they always match what is shown. A point that accepts several materials
 * counts once in each of them, so {@code byMaterial} may add up to more than {@code count}.
 */
public record PointReport(Instant generatedAt, Filters filters, List<Item> items, Totals totals) {

    public record Filters(String status, Material material, String q) {
    }

    public record Item(
            String id,
            String name,
            String address,
            boolean addressApproximate,
            List<Material> acceptedMaterials,
            PointStatus status,
            SourceType sourceType,
            Instant updatedAt) {
    }

    public record Totals(
            int count,
            Map<PointStatus, Long> byStatus,
            Map<Material, Long> byMaterial,
            Map<SourceType, Long> bySource) {
    }
}
