package br.com.ecicla.api.report;

import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import br.com.ecicla.api.common.TimeConfig;
import br.com.ecicla.api.disposal.Disposal;
import br.com.ecicla.api.disposal.DisposalRepository;
import br.com.ecicla.api.point.Material;

/** Counts the disposals of each month, ending in the current month in São Paulo (PB31). */
@Service
public class DisposalReportService {

    static final List<Integer> ALLOWED_MONTHS = List.of(6, 12);

    private final DisposalRepository disposals;
    private final Clock clock;

    public DisposalReportService(DisposalRepository disposals, Clock clock) {
        this.disposals = disposals;
        this.clock = clock;
    }

    public DisposalsByMonth byMonth(int months) {
        if (!ALLOWED_MONTHS.contains(months)) {
            throw new IllegalArgumentException("months must be 6 or 12");
        }
        YearMonth last = YearMonth.now(clock.withZone(TimeConfig.SAO_PAULO));
        YearMonth first = last.minusMonths(months - 1L);

        Map<String, Map<Material, Long>> counts = new LinkedHashMap<>();
        for (YearMonth m = first; !m.isAfter(last); m = m.plusMonths(1)) {
            counts.put(m.toString(), zeros());
        }
        List<Disposal> found = disposals.findDisposedBetween(
                first.atDay(1).toString(), last.plusMonths(1).atDay(1).toString());
        Map<Material, Long> totals = zeros();
        for (Disposal d : found) {
            if (d.disposedOn() == null || d.disposedOn().length() < 7 || d.deviceCategory() == null) {
                continue;
            }
            Map<Material, Long> month = counts.get(d.disposedOn().substring(0, 7));
            if (month != null) {
                month.merge(d.deviceCategory(), 1L, Long::sum);
                totals.merge(d.deviceCategory(), 1L, Long::sum);
            }
        }

        List<DisposalsByMonth.Month> result = new ArrayList<>();
        counts.forEach((month, byCategory) -> result.add(new DisposalsByMonth.Month(month, sum(byCategory),
                byCategory)));
        return new DisposalsByMonth(Instant.now(clock), result, new DisposalsByMonth.Totals(sum(totals), totals));
    }

    private static Map<Material, Long> zeros() {
        Map<Material, Long> map = new EnumMap<>(Material.class);
        for (Material m : Material.values()) {
            map.put(m, 0L);
        }
        return map;
    }

    private static long sum(Map<Material, Long> byCategory) {
        return byCategory.values().stream().mapToLong(Long::longValue).sum();
    }
}
