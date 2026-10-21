package br.com.ecicla.api.suggestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
import br.com.ecicla.api.auth.UserRepository;
import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.CollectionPointRepository;
import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.PointSource;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.SourceType;

@WebMvcTest(SuggestionController.class)
@Import(SuggestionService.class)
class SuggestionControllerTest {

    private static final String USER_ID = "66fb1c2e8f1b2a3c4d5e6f01";
    private static final String OTHER_USER_ID = "66fb1c2e8f1b2a3c4d5e6f02";
    private static final String POINT_ID = "66fb1c2e8f1b2a3c4d5e6f70";
    private static final String SUGGESTION_ID = "66fb1c2e8f1b2a3c4d5e6f80";
    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");

    private static final CollectionPoint POINT = new CollectionPoint(
            POINT_ID,
            "Ecoponto Águia de Haia",
            new GeoJsonPoint(-46.476, -23.521),
            "Av. Águia de Haia, 2983 - São Paulo - SP",
            false,
            List.of(Material.BATTERIES),
            "Mo-Fr 08:00-17:00",
            "Prefeitura",
            null,
            new PointSource(SourceType.OSM, "node/1", NOW),
            PointStatus.ACTIVE,
            NOW,
            null);

    private static final String VALID_NEW_POINT = """
            {"type": "NEW_POINT",
             "proposed": {"name": "  Ecoponto Bairro  ", "latitude": -23.52, "longitude": -46.47,
                          "address": "Rua Exemplo, 10", "acceptedMaterials": ["BATTERIES", "MOBILE_PHONES"],
                          "openingHours": "Mo-Fr 09:00-18:00", "operator": "Cooperativa"},
             "comment": "  Fica perto da estação.  "}
            """;

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
        User ana = new User(USER_ID, "Ana", "ana@exemplo.com", "hash", Role.USER, NOW, NOW, NOW);
        when(sessions.authenticate("token-ana")).thenReturn(Optional.of(new Authenticated(ana, "h1")));
        when(suggestions.save(any())).thenAnswer(invocation -> {
            Suggestion s = invocation.getArgument(0);
            return s.id() != null ? s : new Suggestion(
                    SUGGESTION_ID, s.userId(), s.type(), s.pointId(), s.proposed(), s.comment(), s.status(),
                    s.review(), s.createdAt(), s.updatedAt());
        });
    }

    private static List<MockHttpServletRequestBuilder> everyEndpoint() {
        return List.of(
                get("/api/suggestions"),
                get("/api/suggestions/{id}", SUGGESTION_ID),
                post("/api/suggestions").contentType(MediaType.APPLICATION_JSON).content(VALID_NEW_POINT),
                put("/api/suggestions/{id}", SUGGESTION_ID).contentType(MediaType.APPLICATION_JSON).content(VALID_NEW_POINT),
                delete("/api/suggestions/{id}", SUGGESTION_ID));
    }

    @Test
    void requiresSigningIn() throws Exception {
        for (MockHttpServletRequestBuilder request : everyEndpoint()) {
            mvc.perform(request).andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(suggestions);
    }

    @Test
    void createsNewPointAndPointUpdateSuggestions() throws Exception {
        mvc.perform(post("/api/suggestions").header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_NEW_POINT))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(SUGGESTION_ID))
                .andExpect(jsonPath("$.type").value("NEW_POINT"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.proposed.name").value("Ecoponto Bairro"))
                .andExpect(jsonPath("$.comment").value("Fica perto da estação."));

        when(points.findById(POINT_ID)).thenReturn(Optional.of(POINT));
        mvc.perform(post("/api/suggestions").header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"type": "POINT_UPDATE", "pointId": "%s",
                                 "proposed": {"name": "Ecoponto Águia de Haia", "latitude": -23.521, "longitude": -46.476,
                                              "acceptedMaterials": ["BATTERIES", "COMPUTERS"]},
                                 "comment": "Agora também aceita computadores."}
                                """.formatted(POINT_ID)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("POINT_UPDATE"))
                .andExpect(jsonPath("$.pointId").value(POINT_ID))
                .andExpect(jsonPath("$.currentPointName").value("Ecoponto Águia de Haia"));
    }

    @Test
    void rejectsInvalidSuggestions() throws Exception {
        for (String body : new String[] {
                "{\"type\": \"NEW_POINT\", \"pointId\": \"" + POINT_ID + "\", \"proposed\": {\"latitude\": -23.5, \"longitude\": -46.5, \"acceptedMaterials\": [\"BATTERIES\"]}}",
                "{\"type\": \"POINT_UPDATE\", \"proposed\": {\"latitude\": -23.5, \"longitude\": -46.5, \"acceptedMaterials\": [\"BATTERIES\"]}}",
                "{\"type\": \"NEW_POINT\", \"proposed\": {\"latitude\": -23.5, \"longitude\": -46.5, \"acceptedMaterials\": []}}",
                "{\"type\": \"NEW_POINT\"}"}) {
            mvc.perform(post("/api/suggestions").header("Authorization", "Bearer token-ana")
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verify(suggestions, never()).save(any());
    }

    @Test
    void editsAndDeletesOnlyPendingSuggestionsOwnedByTheUser() throws Exception {
        ProposedPoint proposed = new ProposedPoint("Ponto A", -23.52, -46.47, null, List.of(Material.BATTERIES), null, null, null);
        Suggestion pending = new Suggestion(SUGGESTION_ID, USER_ID, SuggestionType.NEW_POINT, null, proposed, "Comentário",
                SuggestionStatus.PENDING, null, NOW, NOW);
        when(suggestions.findById(SUGGESTION_ID)).thenReturn(Optional.of(pending));

        mvc.perform(put("/api/suggestions/{id}", SUGGESTION_ID).header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_NEW_POINT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proposed.name").value("Ecoponto Bairro"));

        ArgumentCaptor<Suggestion> saved = ArgumentCaptor.forClass(Suggestion.class);
        verify(suggestions).save(saved.capture());
        assertThat(saved.getValue().proposed().name()).isEqualTo("Ecoponto Bairro");

        mvc.perform(delete("/api/suggestions/{id}", SUGGESTION_ID).header("Authorization", "Bearer token-ana"))
                .andExpect(status().isNoContent());
        verify(suggestions).deleteById(SUGGESTION_ID);

        // Once reviewed, the suggestion cannot be edited or deleted by the user.
        Suggestion approved = new Suggestion(SUGGESTION_ID, USER_ID, SuggestionType.NEW_POINT, POINT_ID, proposed, null,
                SuggestionStatus.APPROVED, new SuggestionReview("admin", NOW, null), NOW, NOW);
        when(suggestions.findById(SUGGESTION_ID)).thenReturn(Optional.of(approved));

        mvc.perform(put("/api/suggestions/{id}", SUGGESTION_ID).header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_NEW_POINT))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/suggestions/{id}", SUGGESTION_ID).header("Authorization", "Bearer token-ana"))
                .andExpect(status().isConflict());

        // Another user's suggestion is not visible or editable.
        Suggestion someoneElses = new Suggestion(SUGGESTION_ID, OTHER_USER_ID, SuggestionType.NEW_POINT, null, proposed, null,
                SuggestionStatus.PENDING, null, NOW, NOW);
        when(suggestions.findById(SUGGESTION_ID)).thenReturn(Optional.of(someoneElses));

        mvc.perform(get("/api/suggestions/{id}", SUGGESTION_ID).header("Authorization", "Bearer token-ana"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/suggestions/{id}", SUGGESTION_ID).header("Authorization", "Bearer token-ana"))
                .andExpect(status().isNotFound());
    }
}
