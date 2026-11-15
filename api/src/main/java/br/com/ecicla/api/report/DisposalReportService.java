package br.com.ecicla.api.report;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import br.com.ecicla.api.common.TimeConfig;
import br.com.ecicla.api.device.ItemKind;
import br.com.ecicla.api.disposal.Disposal;
import br.com.ecicla.api.disposal.DisposalRepository;
import br.com.ecicla.api.point.Material;

/** Counts the items delivered in each day or month of a period, in São Paulo time (PB31). */
@Service
public class DisposalReportService {

    private final DisposalRepository disposals;
    private final Clock clock;

    public DisposalReportService(DisposalRepository disposals, Clock clock) {
        this.disposals = disposals;
        this.clock = clock;
    }

    public DisposalsByMonth byPeriod(ReportPeriod period) {
        LocalDate today = LocalDate.now(clock.withZone(TimeConfig.SAO_PAULO));
        LocalDate from = period.start(today);
        LocalDate to = period.end(today);

        Map<String, Counts> buckets = new LinkedHashMap<>();
        if (period.daily()) {
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
                buckets.put(d.toString(), new Counts());
            }
        } else {
            for (YearMonth m = YearMonth.from(from); !m.isAfter(YearMonth.from(to)); m = m.plusMonths(1)) {
                buckets.put(m.toString(), new Counts());
            }
        }

        Counts totals = new Counts();
        long deliveries = 0;
        for (Disposal d : disposals.findDisposedBetween(from.toString(), to.plusDays(1).toString())) {
            if (d.disposedOn() == null || d.disposedOn().length() < 10 || d.deviceCategory() == null) {
                continue;
            }
            String key = period.daily() ? d.disposedOn().substring(0, 10) : d.disposedOn().substring(0, 7);
            Counts bucket = buckets.get(key);
            if (bucket != null) {
                bucket.add(d);
                totals.add(d);
                deliveries++;
            }
        }

        List<DisposalsByMonth.Bucket> result = new ArrayList<>();
        buckets.forEach((key, c) -> result.add(new DisposalsByMonth.Bucket(key, c.total, c.byCategory, c.byKind)));
        return new DisposalsByMonth(Instant.now(clock), period, period.daily() ? "DAY" : "MONTH", from.toString(),
                to.toString(), result,
                new DisposalsByMonth.Totals(totals.total, deliveries, totals.byCategory, totals.byKind));
    }

    /** Units by category and by kind of item. */
    private static final class Counts {
        long total;
        final Map<Material, Long> byCategory = new EnumMap<>(Material.class);
        final Map<ItemKind, Long> byKind = new EnumMap<>(ItemKind.class);

        Counts() {
            for (Material m : Material.values()) {
                byCategory.put(m, 0L);
            }
            for (ItemKind k : ItemKind.values()) {
                byKind.put(k, 0L);
            }
        }

        void add(Disposal d) {
            long units = d.units();
            total += units;
            byCategory.merge(d.deviceCategory(), units, Long::sum);
            byKind.merge(d.kind(), units, Long::sum);
        }
    }
}
