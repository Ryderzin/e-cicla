package br.com.ecicla.api.report;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import br.com.ecicla.api.device.ItemKind;
import br.com.ecicla.api.point.Material;

/**
 * Items delivered in each day or month of a period, by kind of item (PB31). Counts units: 20 batteries
 * delivered together count 20. Only aggregated numbers: nothing says who registered them. Every day or month
 * of the period is present, with zeros when there were none.
 *
 * @param granularity {@code DAY} (keys {@code yyyy-MM-dd}) or {@code MONTH} (keys {@code yyyy-MM})
 * @param from        first day of the period, {@code yyyy-MM-dd}
 * @param to          last day of the period, {@code yyyy-MM-dd}
 */
public record DisposalsByMonth(
        Instant generatedAt,
        ReportPeriod period,
        String granularity,
        String from,
        String to,
        List<Bucket> buckets,
        Totals totals) {

    public record Bucket(String key, long total, Map<Material, Long> byCategory, Map<ItemKind, Long> byKind) {
    }

    public record Totals(long total, long deliveries, Map<Material, Long> byCategory, Map<ItemKind, Long> byKind) {
    }
}
