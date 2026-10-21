package br.com.ecicla.api.suggestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResult;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Metrics;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import br.com.ecicla.api.auth.Authenticated;
import br.com.ecicla.api.auth.Role;
import br.com.ecicla.api.auth.SessionService;
import br.com.ecicla.api.auth.User;
import br.com.ecicla.api.auth.UserRepository;
import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.CollectionPointRepository;
import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.PointSource;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.SourceType;

@WebMvcTest(AdminSuggestionController.class)
@Import(SuggestionService.class)
class AdminSuggestionControllerTest {

    private static final String USER_ID = "66fb1c2e8f1b2a3c4d5e6f01";
    private static final String ADMIN_ID = "66fb1c2e8f1b2a3c4d5e6f02";
    private static final String POINT_ID = "66fb1c2e8f1b2a3c4d5e6f70";
    private static final String SUGGESTION_ID = "66fb1c2e8f1b2a3c4d5e6f80";
    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");

    private static final ProposedPoint PROPOSED = new ProposedPoint(
            "Ecoponto Novo",
            -23.521,
            -46.476,
            "Rua Exemplo, 100",
            List.of(Material.BATTERIES, Material.MOBILE_PHONES),
            "Mo-Fr 08:00-17:00",
            "Prefeitura",
            null);

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private SuggestionRepository suggestions;

    @MockitoBean
    private CollectionPointRepository points;

    @MockitoBean
    private UserRepository users;

    @MockitoBean
    private SessionService sessions;

    @BeforeEach
    void setUp() {
        User admin = new User(ADMIN_ID, "Admin", "admin@exemplo.com", "hash", Role.ADMIN, NOW, NOW, NOW);
        User regular = new User(USER_ID, "Ana", "ana@exemplo.com", "hash", Role.USER, NOW, NOW, NOW);
        when(sessions.authenticate("token-admin")).thenReturn(Optional.of(new Authenticated(admin, "h1")));
        when(sessions.authenticate("token-usuario")).thenReturn(Optional.of(new Authenticated(regular, "h2")));
        when(suggestions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(points.save(any())).thenAnswer(invocation -> {
            CollectionPoint p = invocation.getArgument(0);
            return p.id() != null ? p : new CollectionPoint(
                    POINT_ID, p.name(), p.location(), p.address(), p.addressApproximate(), p.acceptedMaterials(),
                    p.openingHours(), p.operator(), p.notes(), p.source(), p.status(), p.updatedAt(), p.adminEditedAt());
        });
    }

    private static List<MockHttpServletRequestBuilder> everyEndpoint() {
        return List.of(
                get("/api/admin/suggestions"),
                get("/api/admin/suggestions/{id}", SUGGESTION_ID),
                put("/api/admin/suggestions/{id}/approve", SUGGESTION_ID),
                put("/api/admin/suggestions/{id}/reject", SUGGESTION_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\": \"Endereço inexistente.\"}"));
    }

    @Test
    void requiresSigningIn() throws Exception {
        for (MockHttpServletRequestBuilder request : everyEndpoint()) {
            mvc.perform(request).andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(suggestions);
    }

    @Test
    void refusesAccountsThatAreNotAdministrators() throws Exception {
        for (MockHttpServletRequestBuilder request : everyEndpoint()) {
            mvc.perform(request.header("Authorization", "Bearer token-usuario")).andExpect(status().isForbidden());
        }
        verifyNoInteractions(suggestions);
    }

    @Test
    void showsSuggestionDetailsWithAuthorAndNearbyDuplicatesAlert() throws Exception {
        Suggestion pending = new Suggestion(SUGGESTION_ID, USER_ID, SuggestionType.NEW_POINT, null, PROPOSED,
                "Vi este ponto ontem.", SuggestionStatus.PENDING, null, NOW, NOW);
        CollectionPoint nearby = new CollectionPoint(POINT_ID, "Ponto Já Existente", new GeoJsonPoint(-46.4765, -23.5212),
                "Rua Exemplo, 98", false, List.of(Material.BATTERIES), null, null, null,
                new PointSource(SourceType.OSM, "node/1", NOW), PointStatus.ACTIVE, NOW, null);

        when(suggestions.findById(SUGGESTION_ID)).thenReturn(Optional.of(pending));
        when(users.findById(USER_ID)).thenReturn(Optional.of(
                new User(USER_ID, "Ana", "ana@exemplo.com", "hash", Role.USER, NOW, NOW, NOW)));
        when(points.findActiveNear(any(), any())).thenReturn(new GeoResults<>(List.of(
                new GeoResult<>(nearby, new Distance(0.055, Metrics.KILOMETERS)))));

        mvc.perform(get("/api/admin/suggestions/{id}", SUGGESTION_ID).header("Authorization", "Bearer token-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.suggestion.id").value(SUGGESTION_ID))
                .andExpect(jsonPath("$.authorName").value("Ana"))
                .andExpect(jsonPath("$.nearbyDuplicates.length()").value(1))
                .andExpect(jsonPath("$.nearbyDuplicates[0].name").value("Ponto Já Existente"))
                .andExpect(jsonPath("$.nearbyDuplicates[0].distanceMeters").value(55));
    }

    @Test
    void approvesNewPointSuggestionCreatingActivePointWithSuggestionSource() throws Exception {
        Suggestion pending = new Suggestion(SUGGESTION_ID, USER_ID, SuggestionType.NEW_POINT, null, PROPOSED, null,
                SuggestionStatus.PENDING, null, NOW, NOW);
        when(suggestions.findById(SUGGESTION_ID)).thenReturn(Optional.of(pending));

        mvc.perform(put("/api/admin/suggestions/{id}/approve", SUGGESTION_ID)
                        .header("Authorization", "Bearer token-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.pointId").value(POINT_ID));

        ArgumentCaptor<CollectionPoint> savedPoint = ArgumentCaptor.forClass(CollectionPoint.class);
        verify(points).save(savedPoint.capture());
        assertThat(savedPoint.getValue().source().type()).isEqualTo(SourceType.SUGGESTION);
        assertThat(savedPoint.getValue().source().externalId()).isEqualTo("suggestion/" + SUGGESTION_ID);
        assertThat(savedPoint.getValue().status()).isEqualTo(PointStatus.ACTIVE);
        assertThat(savedPoint.getValue().adminEditedAt()).isNotNull();
    }

    @Test
    void approvesPointUpdateSuggestionApplyingChangesToExistingPoint() throws Exception {
        CollectionPoint existing = new CollectionPoint(POINT_ID, "Nome Antigo", new GeoJsonPoint(-46.476, -23.521),
                "Rua Antiga", true, List.of(Material.BATTERIES), null, null, null,
                new PointSource(SourceType.OSM, "node/1", NOW), PointStatus.ACTIVE, NOW, null);
        Suggestion pending = new Suggestion(SUGGESTION_ID, USER_ID, SuggestionType.POINT_UPDATE, POINT_ID, PROPOSED, null,
                SuggestionStatus.PENDING, null, NOW, NOW);

        when(suggestions.findById(SUGGESTION_ID)).thenReturn(Optional.of(pending));
        when(points.findById(POINT_ID)).thenReturn(Optional.of(existing));

        mvc.perform(put("/api/admin/suggestions/{id}/approve", SUGGESTION_ID)
                        .header("Authorization", "Bearer token-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        ArgumentCaptor<CollectionPoint> savedPoint = ArgumentCaptor.forClass(CollectionPoint.class);
        verify(points).save(savedPoint.capture());
        assertThat(savedPoint.getValue().id()).isEqualTo(POINT_ID);
        assertThat(savedPoint.getValue().name()).isEqualTo("Ecoponto Novo");
        assertThat(savedPoint.getValue().addressApproximate()).isFalse();
        assertThat(savedPoint.getValue().adminEditedAt()).isNotNull();
    }

    @Test
    void rejectsSuggestionRequiringAReason() throws Exception {
        Suggestion pending = new Suggestion(SUGGESTION_ID, USER_ID, SuggestionType.NEW_POINT, null, PROPOSED, null,
                SuggestionStatus.PENDING, null, NOW, NOW);
        when(suggestions.findById(SUGGESTION_ID)).thenReturn(Optional.of(pending));

        mvc.perform(put("/api/admin/suggestions/{id}/reject", SUGGESTION_ID)
                        .header("Authorization", "Bearer token-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\": \"   \"}"))
                .andExpect(status().isBadRequest());

        mvc.perform(put("/api/admin/suggestions/{id}/reject", SUGGESTION_ID)
                        .header("Authorization", "Bearer token-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\": \"Já existe um ponto cadastrado neste endereço.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.reviewReason").value("Já existe um ponto cadastrado neste endereço."));
    }
}
