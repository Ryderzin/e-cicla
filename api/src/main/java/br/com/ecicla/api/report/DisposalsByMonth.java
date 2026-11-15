package br.com.ecicla.api.report;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import br.com.ecicla.api.point.Material;

/**
 * Disposals registered each month, by kind of device (PB31). Only aggregated numbers: nothing says who
 * registered them. Every month of the period is present, with zeros when there were none.
 */
public record DisposalsByMonth(Instant generatedAt, List<Month> months, Totals totals) {

    /** {@code month} is {@code yyyy-MM}. */
    public record Month(String month, long total, Map<Material, Long> byCategory) {
    }

    public record Totals(long total, Map<Material, Long> byCategory) {
    }
}
