package br.com.ecicla.api.report;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.PointStatus;

/** Reports for administrators (PB30, PB31). Only for the ADMIN profile: see {@code AuthWebConfig}. */
@RestController
@RequestMapping("/api/admin/reports")
public class AdminReportController {

    private final PointReportService pointReports;
    private final DisposalReportService disposalReports;

    public AdminReportController(PointReportService pointReports, DisposalReportService disposalReports) {
        this.pointReports = pointReports;
        this.disposalReports = disposalReports;
    }

    /** {@code status} is ACTIVE, INACTIVE or ALL (the default). */
    @GetMapping("/points")
    public PointReport points(
            @RequestParam Optional<String> status,
            @RequestParam Optional<Material> material,
            @RequestParam Optional<String> q) {
        Optional<PointStatus> statusFilter;
        String value = status.map(String::strip).filter(s -> !s.isEmpty()).orElse("ALL");
        if (value.equalsIgnoreCase("ALL")) {
            statusFilter = Optional.empty();
        } else {
            try {
                statusFilter = Optional.of(PointStatus.valueOf(value.toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status must be ACTIVE, INACTIVE or ALL");
            }
        }
        return pointReports.build(statusFilter, material, q);
    }

    /** {@code period}: CURRENT_MONTH, LAST_MONTH, LAST_3_MONTHS, LAST_6_MONTHS or LAST_12_MONTHS (the default). */
    @GetMapping("/disposals-by-month")
    public DisposalsByMonth disposalsByMonth(@RequestParam(defaultValue = "LAST_12_MONTHS") String period) {
        ReportPeriod chosen;
        try {
            chosen = ReportPeriod.valueOf(period.strip().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "period must be CURRENT_MONTH, LAST_MONTH, LAST_3_MONTHS, LAST_6_MONTHS or LAST_12_MONTHS");
        }
        return disposalReports.byPeriod(chosen);
    }
}
