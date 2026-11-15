package br.com.ecicla.api.report;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * Periods of the disposals chart (PB31), all in São Paulo time. The single-month periods are shown day by
 * day; the others, month by month, ending in the current month.
 */
public enum ReportPeriod {
    CURRENT_MONTH(0, true),
    LAST_MONTH(1, true),
    LAST_3_MONTHS(3, false),
    LAST_6_MONTHS(6, false),
    LAST_12_MONTHS(12, false);

    private final int months;
    private final boolean daily;

    ReportPeriod(int months, boolean daily) {
        this.months = months;
        this.daily = daily;
    }

    public boolean daily() {
        return daily;
    }

    /** First day of the period. */
    public LocalDate start(LocalDate today) {
        YearMonth current = YearMonth.from(today);
        return switch (this) {
            case CURRENT_MONTH -> current.atDay(1);
            case LAST_MONTH -> current.minusMonths(1).atDay(1);
            default -> current.minusMonths(months - 1L).atDay(1);
        };
    }

    /** Last day of the period (the end of the month, even if it has not come yet). */
    public LocalDate end(LocalDate today) {
        YearMonth current = YearMonth.from(today);
        return this == LAST_MONTH ? current.minusMonths(1).atEndOfMonth() : current.atEndOfMonth();
    }
}
