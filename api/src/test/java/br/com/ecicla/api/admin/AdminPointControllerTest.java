package br.com.ecicla.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import br.com.ecicla.api.auth.Authenticated;
import br.com.ecicla.api.auth.Role;
import br.com.ecicla.api.auth.SessionService;
import br.com.ecicla.api.auth.User;
import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.CollectionPointRepository;
import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.PointSource;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.SourceType;

@WebMvcTest(AdminPointController.class)
@Import(AdminPointService.class)
class AdminPointControllerTest {

    private static final String ID = "66fb1c2e8f1b2a3c4d5e6f70";
    private static final Instant IMPORTED = Instant.parse("2026-10-01T12:00:00Z");
    private static final CollectionPoint OSM_POINT = new CollectionPoint(ID, null, new GeoJsonPoint(-46.4, -23.4),
            "Rua Itú, 500 - Vila Virgínia, Itaquaquecetuba - SP", true, List.of(Material.BATTERIES), "Mo-Sa 07:00-22:00",
            "Tenda Atacadista", null, new PointSource(SourceType.OSM, "node/1", IMPORTED), PointStatus.ACTIVE, IMPORTED,
            null);
    private static final String VALID_INPUT = """
            {"name": "Ecoponto Exemplo", "latitude": -23.52, "longitude": -46.47,
             "address": "Rua Exemplo, 100 - Bairro, São Paulo - SP", "acceptedMaterials": ["BATTERIES", "MOBILE_PHONES"],
             "openingHours": "Mo-Fr 08:00-17:00", "operator": "Prefeitura", "notes": "  "}
            """;

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private CollectionPointRepository repository;

    @MockitoBean
    private SessionService sessions;

    @BeforeEach
    void accounts() {
        when(sessions.authenticate("token-admin")).thenReturn(Optional.of(new Authenticated(user(Role.ADMIN), "h1")));
        when(sessions.authenticate("token-usuario")).thenReturn(Optional.of(new Authenticated(user(Role.USER), "h2")));
        when(repository.save(any())).thenAnswer(invocation -> {
            CollectionPoint p = invocation.getArgument(0);
            return p.id() != null ? p : new CollectionPoint("66fb1c2e8f1b2a3c4d5e6f71", p.name(), p.location(), p.address(),
                    p.addressApproximate(), p.acceptedMaterials(), p.openingHours(), p.operator(), p.notes(), p.source(),
                    p.status(), p.updatedAt(), p.adminEditedAt());
        });
    }

    private static User user(Role role) {
        return new User(role.name(), "Pessoa", role.name().toLowerCase() + "@exemplo.com", "hash", role, IMPORTED, IMPORTED,
                IMPORTED);
    }

    private static List<MockHttpServletRequestBuilder> everyEndpoint() {
        return List.of(
                get("/api/admin/points"),
                get("/api/admin/points/{id}", ID),
                post("/api/admin/points").contentType(MediaType.APPLICATION_JSON).content(VALID_INPUT),
                put("/api/admin/points/{id}", ID).contentType(MediaType.APPLICATION_JSON).content(VALID_INPUT),
                put("/api/admin/points/{id}/status", ID).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"INACTIVE\"}"));
    }

    @Test
    void requiresSigningIn() throws Exception {
        for (MockHttpServletRequestBuilder request : everyEndpoint()) {
            mvc.perform(request).andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(repository);
    }

    @Test
    void refusesAccountsThatAreNotAdministrators() throws Exception {
        for (MockHttpServletRequestBuilder request : everyEndpoint()) {
            mvc.perform(request.header("Authorization", "Bearer token-usuario")).andExpect(status().isForbidden());
        }
        verifyNoInteractions(repository);
    }

    @Test
    void listsEveryPointByNameWithSearchAndStatusFilter() throws Exception {
        CollectionPoint inactive = new CollectionPoint("66fb1c2e8f1b2a3c4d5e6f72", "Ecoponto São João",
                new GeoJsonPoint(-46.5, -23.5), null, false, List.of(Material.COMPUTERS), null, null, null,
                new PointSource(SourceType.MANUAL, "manual/sj", IMPORTED), PointStatus.INACTIVE, IMPORTED, IMPORTED);
        CollectionPoint named = new CollectionPoint("66fb1c2e8f1b2a3c4d5e6f73", "Bolsão Centro",
                new GeoJsonPoint(-46.6, -23.6), null, false, List.of(Material.BATTERIES), null, null, null,
                new PointSource(SourceType.OSM, "node/2", IMPORTED), PointStatus.ACTIVE, IMPORTED, null);
        when(repository.findAll()).thenReturn(List.of(OSM_POINT, inactive, named));

        mvc.perform(get("/api/admin/points").header("Authorization", "Bearer token-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].name").value("Bolsão Centro"))
                .andExpect(jsonPath("$[1].name").value("Ecoponto São João"))
                .andExpect(jsonPath("$[1].status").value("INACTIVE"))
                .andExpect(jsonPath("$[2].name").doesNotExist());

        mvc.perform(get("/api/admin/points").param("q", "SAO JOAO").header("Authorization", "Bearer token-admin"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("66fb1c2e8f1b2a3c4d5e6f72"));

        mvc.perform(get("/api/admin/points").param("q", "itaquaquecetuba").header("Authorization", "Bearer token-admin"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(ID));

        mvc.perform(get("/api/admin/points").param("status", "ACTIVE").header("Authorization", "Bearer token-admin"))
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void createsActiveManualPointsMarkedAsEditedByTheTeam() throws Exception {
        mvc.perform(post("/api/admin/points").header("Authorization", "Bearer token-admin")
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_INPUT))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("66fb1c2e8f1b2a3c4d5e6f71"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.sourceType").value("MANUAL"))
                .andExpect(jsonPath("$.notes").doesNotExist());

        ArgumentCaptor<CollectionPoint> saved = ArgumentCaptor.forClass(CollectionPoint.class);
        verify(repository).save(saved.capture());
        CollectionPoint point = saved.getValue();
        assertThat(point.location()).isEqualTo(new GeoJsonPoint(-46.47, -23.52));
        assertThat(point.source().externalId()).startsWith("admin/");
        assertThat(point.adminEditedAt()).isNotNull();
        assertThat(point.addressApproximate()).isFalse();
        assertThat(point.acceptedMaterials()).containsExactly(Material.BATTERIES, Material.MOBILE_PHONES);
    }

    @Test
    void rejectsPointsWithoutMaterialsOrValidCoordinates() throws Exception {
        for (String body : new String[] {
                "{\"latitude\": -23.5, \"longitude\": -46.5, \"acceptedMaterials\": []}",
                "{\"latitude\": -123.5, \"longitude\": -46.5, \"acceptedMaterials\": [\"BATTERIES\"]}",
                "{\"longitude\": -46.5, \"acceptedMaterials\": [\"BATTERIES\"]}",
                "{\"latitude\": -23.5, \"longitude\": -46.5, \"acceptedMaterials\": [\"GELADEIRAS\"]}"}) {
            mvc.perform(post("/api/admin/points").header("Authorization", "Bearer token-admin")
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verify(repository, never()).save(any());
    }

    @Test
    void editsAPointAndProtectsItFromTheImport() throws Exception {
        when(repository.findById(ID)).thenReturn(Optional.of(OSM_POINT));

        mvc.perform(put("/api/admin/points/{id}", ID).header("Authorization", "Bearer token-admin")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name": "Tenda Itaquá", "latitude": -23.4, "longitude": -46.4,
                                 "address": "Rua Itú, 500 - Vila Virgínia, Itaquaquecetuba - SP",
                                 "acceptedMaterials": ["BATTERIES", "MOBILE_PHONES"], "openingHours": "Mo-Sa 07:00-22:00"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Tenda Itaquá"))
                .andExpect(jsonPath("$.sourceType").value("OSM"));

        ArgumentCaptor<CollectionPoint> saved = ArgumentCaptor.forClass(CollectionPoint.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().id()).isEqualTo(ID);
        assertThat(saved.getValue().adminEditedAt()).isNotNull();
        assertThat(saved.getValue().source()).isEqualTo(OSM_POINT.source());
        // The approximate address was kept as it was, so it is still approximate.
        assertThat(saved.getValue().addressApproximate()).isTrue();
        assertThat(saved.getValue().operator()).isNull();
    }

    @Test
    void deactivatesAndReactivatesPoints() throws Exception {
        when(repository.findById(ID)).thenReturn(Optional.of(OSM_POINT));

        mvc.perform(put("/api/admin/points/{id}/status", ID).header("Authorization", "Bearer token-admin")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\": \"INACTIVE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INACTIVE"));

        ArgumentCaptor<CollectionPoint> saved = ArgumentCaptor.forClass(CollectionPoint.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(PointStatus.INACTIVE);
        assertThat(saved.getValue().name()).isEqualTo(OSM_POINT.name());
    }

    @Test
    void answersNotFoundForUnknownPoints() throws Exception {
        when(repository.findById(ID)).thenReturn(Optional.empty());

        mvc.perform(get("/api/admin/points/{id}", ID).header("Authorization", "Bearer token-admin"))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/admin/points/{id}", ID).header("Authorization", "Bearer token-admin")
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_INPUT))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/points/{id}", "nao-e-um-id").header("Authorization", "Bearer token-admin"))
                .andExpect(status().isNotFound());
    }
}
