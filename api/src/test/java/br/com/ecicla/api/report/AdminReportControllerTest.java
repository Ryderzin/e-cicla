package br.com.ecicla.api.report;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import br.com.ecicla.api.auth.Authenticated;
import br.com.ecicla.api.auth.Role;
import br.com.ecicla.api.auth.SessionService;
import br.com.ecicla.api.auth.User;
import br.com.ecicla.api.common.FixedClock;
import br.com.ecicla.api.disposal.Disposal;
import br.com.ecicla.api.disposal.DisposalRepository;
import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.CollectionPointRepository;
import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.PointSource;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.SourceType;

@WebMvcTest(AdminReportController.class)
@Import({PointReportService.class, DisposalReportService.class, FixedClock.class})
class AdminReportControllerTest {

    private static final Instant T = Instant.parse("2026-11-01T12:00:00Z");

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private CollectionPointRepository points;

    @MockitoBean
    private DisposalRepository disposals;

    @MockitoBean
    private SessionService sessions;

    private final List<CollectionPoint> stored = new ArrayList<>();

    @BeforeEach
    void setUp() {
        when(sessions.authenticate("token-admin")).thenReturn(Optional.of(new Authenticated(user(Role.ADMIN), "h1")));
        when(sessions.authenticate("token-usuario")).thenReturn(Optional.of(new Authenticated(user(Role.USER), "h2")));
        stored.add(point("66fb1c2e8f1b2a3c4d5e6f71", "Super Mercado Guarani", PointStatus.ACTIVE, SourceType.OSM,
                Material.BATTERIES, Material.COMPUTERS));
        stored.add(point("66fb1c2e8f1b2a3c4d5e6f72", "Ecoponto São Mateus", PointStatus.ACTIVE, SourceType.MANUAL,
                Material.MOBILE_PHONES));
        stored.add(point("66fb1c2e8f1b2a3c4d5e6f73", null, PointStatus.INACTIVE, SourceType.OSM, Material.BATTERIES));
        when(points.findAll()).thenAnswer(invocation -> List.copyOf(stored));
    }

    private static User user(Role role) {
        return new User("u-" + role, "Equipe", role + "@exemplo.com", "hash", role, T, T, T);
    }

    private static CollectionPoint point(String id, String name, PointStatus status, SourceType source,
            Material... materials) {
        return new CollectionPoint(id, name, new GeoJsonPoint(-46.5, -23.5), "Rua Exemplo, 1 - São Paulo - SP", false,
                List.of(materials), null, null, null, new PointSource(source, "x/" + id, T), status, T, null);
    }

    @Test
    void onlyAdministratorsSeeTheReports() throws Exception {
        for (String path : List.of("/api/admin/reports/points", "/api/admin/reports/disposals-by-month")) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
            mvc.perform(get(path).header("Authorization", "Bearer token-usuario")).andExpect(status().isForbidden());
        }
        verifyNoInteractions(points, disposals);
    }

    @Test
    void listsEveryPointWithTotalsAtTheEnd() throws Exception {
        mvc.perform(get("/api/admin/reports/points").header("Authorization", "Bearer token-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.generatedAt").value(FixedClock.NOW.toString()))
                .andExpect(jsonPath("$.filters.status").value("ALL"))
                .andExpect(jsonPath("$.items.length()").value(3))
                // By name, accents ignored; the point without a name goes last.
                .andExpect(jsonPath("$.items[0].name").value("Ecoponto São Mateus"))
                .andExpect(jsonPath("$.items[1].name").value("Super Mercado Guarani"))
                .andExpect(jsonPath("$.items[2].name").doesNotExist())
                .andExpect(jsonPath("$.totals.count").value(3))
                .andExpect(jsonPath("$.totals.byStatus.ACTIVE").value(2))
                .andExpect(jsonPath("$.totals.byStatus.INACTIVE").value(1))
                // A point that accepts two materials counts in both.
                .andExpect(jsonPath("$.totals.byMaterial.BATTERIES").value(2))
                .andExpect(jsonPath("$.totals.byMaterial.COMPUTERS").value(1))
                .andExpect(jsonPath("$.totals.byMaterial.SMALL_APPLIANCES").value(0))
                .andExpect(jsonPath("$.totals.bySource.OSM").value(2))
                .andExpect(jsonPath("$.totals.bySource.MANUAL").value(1))
                .andExpect(jsonPath("$.totals.bySource.SUGGESTION").value(0));
    }

    @Test
    void totalsFollowTheFilters() throws Exception {
        mvc.perform(get("/api/admin/reports/points?status=ACTIVE").header("Authorization", "Bearer token-admin"))
                .andExpect(jsonPath("$.filters.status").value("ACTIVE"))
                .andExpect(jsonPath("$.totals.count").value(2))
                .andExpect(jsonPath("$.totals.byStatus.INACTIVE").value(0));
        mvc.perform(get("/api/admin/reports/points?material=COMPUTERS").header("Authorization", "Bearer token-admin"))
                .andExpect(jsonPath("$.totals.count").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Super Mercado Guarani"));
        mvc.perform(get("/api/admin/reports/points?q=sao mateus").header("Authorization", "Bearer token-admin"))
                .andExpect(jsonPath("$.totals.count").value(1))
                .andExpect(jsonPath("$.filters.q").value("sao mateus"));
        mvc.perform(get("/api/admin/reports/points?status=OUTRO").header("Authorization", "Bearer token-admin"))
                .andExpect(status().isBadRequest());
    }

    /** What the presentation of increment 5 shows: including and excluding a point changes the total. */
    @Test
    void theTotalChangesWhenAPointIsIncludedOrExcluded() throws Exception {
        mvc.perform(get("/api/admin/reports/points?status=ACTIVE").header("Authorization", "Bearer token-admin"))
                .andExpect(jsonPath("$.totals.count").value(2));

        stored.add(point("66fb1c2e8f1b2a3c4d5e6f74", "Ponto de teste da apresentação", PointStatus.ACTIVE,
                SourceType.MANUAL, Material.SMALL_APPLIANCES));
        mvc.perform(get("/api/admin/reports/points?status=ACTIVE").header("Authorization", "Bearer token-admin"))
                .andExpect(jsonPath("$.totals.count").value(3))
                .andExpect(jsonPath("$.totals.byMaterial.SMALL_APPLIANCES").value(1));

        stored.removeIf(p -> p.name() != null && p.name().startsWith("Ponto de teste"));
        mvc.perform(get("/api/admin/reports/points?status=ACTIVE").header("Authorization", "Bearer token-admin"))
                .andExpect(jsonPath("$.totals.count").value(2))
                .andExpect(jsonPath("$.totals.byMaterial.SMALL_APPLIANCES").value(0));
    }

    @Test
    void countsDisposalsOfEachMonthInSaoPauloTime() throws Exception {
        // The fixed clock is 01:30 UTC on 1 December, still 30 November in São Paulo: the last month is November.
        when(disposals.findDisposedBetween("2026-06-01", "2026-12-01"))
                .thenReturn(List.of(
                        disposal("2026-11-30", Material.BATTERIES),
                        disposal("2026-11-02", Material.BATTERIES),
                        disposal("2026-11-15", Material.MOBILE_PHONES),
                        disposal("2026-09-10", Material.COMPUTERS)));

        mvc.perform(get("/api/admin/reports/disposals-by-month?months=6").header("Authorization", "Bearer token-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.months.length()").value(6))
                .andExpect(jsonPath("$.months[0].month").value("2026-06"))
                .andExpect(jsonPath("$.months[0].total").value(0))
                .andExpect(jsonPath("$.months[3].month").value("2026-09"))
                .andExpect(jsonPath("$.months[3].byCategory.COMPUTERS").value(1))
                .andExpect(jsonPath("$.months[5].month").value("2026-11"))
                .andExpect(jsonPath("$.months[5].total").value(3))
                .andExpect(jsonPath("$.months[5].byCategory.BATTERIES").value(2))
                .andExpect(jsonPath("$.totals.total").value(4))
                .andExpect(jsonPath("$.totals.byCategory.MOBILE_PHONES").value(1));
        verify(disposals).findDisposedBetween("2026-06-01", "2026-12-01");
    }

    @Test
    void acceptsOnlySixOrTwelveMonths() throws Exception {
        when(disposals.findDisposedBetween(anyString(), anyString()))
                .thenReturn(List.of());
        mvc.perform(get("/api/admin/reports/disposals-by-month").header("Authorization", "Bearer token-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.months.length()").value(12))
                .andExpect(jsonPath("$.months[0].month").value("2025-12"))
                .andExpect(jsonPath("$.totals.total").value(0));
        mvc.perform(get("/api/admin/reports/disposals-by-month?months=7").header("Authorization", "Bearer token-admin"))
                .andExpect(status().isBadRequest());
    }

    private static Disposal disposal(String day, Material category) {
        return new Disposal(null, "u1", "d1", category, "Aparelho", "p1", "Ponto", true, day, T);
    }
}
