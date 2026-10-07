package br.com.ecicla.api.point;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResult;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.geo.GeoJsonPolygon;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import br.com.ecicla.api.auth.SessionService;

@WebMvcTest(PointController.class)
@Import(PointService.class)
class PointControllerTest {

    private static final String ID = "66fb1c2e8f1b2a3c4d5e6f70";

    private static final CollectionPoint POINT = new CollectionPoint(
            ID,
            "Ecoponto Centro",
            new GeoJsonPoint(-46.63, -23.55),
            "Rua Exemplo, 100 - Centro, São Paulo - SP",
            false,
            List.of(Material.BATTERIES, Material.MOBILE_PHONES),
            "Mo-Sa 08:00-17:00",
            "Prefeitura",
            "Não recebe geladeiras",
            new PointSource(SourceType.OSM, "node/123", Instant.parse("2026-10-01T12:00:00Z")),
            PointStatus.ACTIVE,
            Instant.parse("2026-10-01T12:00:00Z"),
            null);

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private CollectionPointRepository repository;

    // Needed by the sign-in check registered for the private routes; the public ones never use it.
    @MockitoBean
    private SessionService sessions;

    @Test
    void listsActivePointsWithLatitudeAndLongitude() throws Exception {
        when(repository.findByStatus(PointStatus.ACTIVE)).thenReturn(List.of(POINT));

        mvc.perform(get("/api/points"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(ID))
                .andExpect(jsonPath("$[0].name").value("Ecoponto Centro"))
                .andExpect(jsonPath("$[0].latitude").value(-23.55))
                .andExpect(jsonPath("$[0].longitude").value(-46.63))
                .andExpect(jsonPath("$[0].acceptedMaterials[0]").value("BATTERIES"))
                .andExpect(jsonPath("$[0].acceptedMaterials[1]").value("MOBILE_PHONES"))
                .andExpect(jsonPath("$[0].address").doesNotExist());
    }

    @Test
    void filtersByVisibleArea() throws Exception {
        when(repository.findByStatusAndLocationWithin(eq(PointStatus.ACTIVE), any())).thenReturn(List.of(POINT));

        mvc.perform(get("/api/points")
                        .param("minLng", "-47").param("minLat", "-24")
                        .param("maxLng", "-46").param("maxLat", "-23"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(ID));

        ArgumentCaptor<GeoJsonPolygon> area = ArgumentCaptor.forClass(GeoJsonPolygon.class);
        verify(repository).findByStatusAndLocationWithin(eq(PointStatus.ACTIVE), area.capture());
        verify(repository, never()).findByStatus(any());
        assertThat(area.getValue().getPoints()).containsExactly(
                new Point(-47, -24), new Point(-46, -24), new Point(-46, -23), new Point(-47, -23),
                new Point(-47, -24));
    }

    @Test
    void rejectsIncompleteArea() throws Exception {
        mvc.perform(get("/api/points").param("minLng", "-47").param("minLat", "-24"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(repository);
    }

    @Test
    void rejectsInvertedArea() throws Exception {
        mvc.perform(get("/api/points")
                        .param("minLng", "-46").param("minLat", "-24")
                        .param("maxLng", "-47").param("maxLat", "-23"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(repository);
    }

    @Test
    void rejectsAreaOutOfRange() throws Exception {
        mvc.perform(get("/api/points")
                        .param("minLng", "-200").param("minLat", "-24")
                        .param("maxLng", "-46").param("maxLat", "-23"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(repository);
    }

    @Test
    void rejectsNonNumericArea() throws Exception {
        mvc.perform(get("/api/points")
                        .param("minLng", "abc").param("minLat", "-24")
                        .param("maxLng", "-46").param("maxLat", "-23"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(repository);
    }

    @Test
    void returnsPointDetails() throws Exception {
        when(repository.findByIdAndStatus(ID, PointStatus.ACTIVE)).thenReturn(Optional.of(POINT));

        mvc.perform(get("/api/points/{id}", ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ID))
                .andExpect(jsonPath("$.name").value("Ecoponto Centro"))
                .andExpect(jsonPath("$.latitude").value(-23.55))
                .andExpect(jsonPath("$.longitude").value(-46.63))
                .andExpect(jsonPath("$.address").value("Rua Exemplo, 100 - Centro, São Paulo - SP"))
                .andExpect(jsonPath("$.addressApproximate").value(false))
                .andExpect(jsonPath("$.acceptedMaterials[0]").value("BATTERIES"))
                .andExpect(jsonPath("$.openingHours").value("Mo-Sa 08:00-17:00"))
                .andExpect(jsonPath("$.operator").value("Prefeitura"))
                .andExpect(jsonPath("$.notes").value("Não recebe geladeiras"))
                .andExpect(jsonPath("$.sourceType").value("OSM"))
                .andExpect(jsonPath("$.editedByTeam").value(false))
                .andExpect(jsonPath("$.updatedAt").value("2026-10-01T12:00:00Z"));
    }

    @Test
    void flagsApproximateAddresses() throws Exception {
        CollectionPoint approximate = new CollectionPoint(ID, null, POINT.location(), "Rua Castro Alves - Araraquara - SP",
                true, POINT.acceptedMaterials(), null, null, null, POINT.source(), PointStatus.ACTIVE, POINT.updatedAt(),
                null);
        when(repository.findByIdAndStatus(ID, PointStatus.ACTIVE)).thenReturn(Optional.of(approximate));

        mvc.perform(get("/api/points/{id}", ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.address").value("Rua Castro Alves - Araraquara - SP"))
                .andExpect(jsonPath("$.addressApproximate").value(true));
    }

    @Test
    void returnsNotFoundForUnknownOrInactivePoint() throws Exception {
        when(repository.findByIdAndStatus(ID, PointStatus.ACTIVE)).thenReturn(Optional.empty());

        mvc.perform(get("/api/points/{id}", ID))
                .andExpect(status().isNotFound());
    }

    @Test
    void returnsNotFoundForMalformedId() throws Exception {
        mvc.perform(get("/api/points/{id}", "not-an-id"))
                .andExpect(status().isNotFound());
        verifyNoInteractions(repository);
    }

    private static CollectionPoint pointAt(String id, double lng, double lat) {
        return new CollectionPoint(id, "Ponto " + id.substring(20), new GeoJsonPoint(lng, lat), null, false,
                List.of(Material.BATTERIES), null, null, null, POINT.source(), PointStatus.ACTIVE, POINT.updatedAt(), null);
    }

    @Test
    void listsTheNearestActivePointsWithDistanceInMeters() throws Exception {
        CollectionPoint near = pointAt("66fb1c2e8f1b2a3c4d5e6f71", -46.47, -23.52);
        CollectionPoint far = pointAt("66fb1c2e8f1b2a3c4d5e6f72", -46.40, -23.40);
        when(repository.findActiveNear(any(), any())).thenReturn(new GeoResults<>(List.of(
                new GeoResult<>(near, new Distance(0.8504, Metrics.KILOMETERS)),
                new GeoResult<>(far, new Distance(15.2, Metrics.KILOMETERS)))));

        mvc.perform(get("/api/points/near").param("latitude", "-23.5213").param("longitude", "-46.4760"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("66fb1c2e8f1b2a3c4d5e6f71"))
                .andExpect(jsonPath("$[0].distanceMeters").value(850))
                .andExpect(jsonPath("$[0].latitude").value(-23.52))
                .andExpect(jsonPath("$[1].distanceMeters").value(15200));

        ArgumentCaptor<GeoJsonPoint> origin = ArgumentCaptor.forClass(GeoJsonPoint.class);
        verify(repository).findActiveNear(origin.capture(), any());
        assertThat(origin.getValue()).isEqualTo(new GeoJsonPoint(-46.4760, -23.5213));
    }

    @Test
    void keepsOnlyNearPointsInsideTheAreaAndUpToTheLimit() throws Exception {
        CollectionPoint outside = pointAt("66fb1c2e8f1b2a3c4d5e6f71", -44.0, -22.5);
        CollectionPoint inside1 = pointAt("66fb1c2e8f1b2a3c4d5e6f72", -46.5, -23.5);
        CollectionPoint inside2 = pointAt("66fb1c2e8f1b2a3c4d5e6f73", -46.6, -23.6);
        when(repository.findActiveNear(any(), any())).thenReturn(new GeoResults<>(List.of(
                new GeoResult<>(outside, new Distance(1, Metrics.KILOMETERS)),
                new GeoResult<>(inside1, new Distance(2, Metrics.KILOMETERS)),
                new GeoResult<>(inside2, new Distance(3, Metrics.KILOMETERS)))));

        mvc.perform(get("/api/points/near").param("latitude", "-23.5").param("longitude", "-46.5").param("limit", "1")
                        .param("minLng", "-53.1").param("minLat", "-25.5").param("maxLng", "-44.2").param("maxLat", "-19.8"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("66fb1c2e8f1b2a3c4d5e6f72"));
    }

    @Test
    void rejectsInvalidNearSearches() throws Exception {
        mvc.perform(get("/api/points/near").param("latitude", "-95").param("longitude", "-46.5"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/points/near").param("latitude", "-23.5"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/points/near").param("latitude", "-23.5").param("longitude", "-46.5").param("limit", "50"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(repository);
    }

    @Test
    void flagsPointsReviewedByTheTeam() throws Exception {
        CollectionPoint edited = new CollectionPoint(ID, POINT.name(), POINT.location(), POINT.address(), false,
                POINT.acceptedMaterials(), null, null, null, POINT.source(), PointStatus.ACTIVE, POINT.updatedAt(),
                Instant.parse("2026-10-07T12:00:00Z"));
        when(repository.findByIdAndStatus(ID, PointStatus.ACTIVE)).thenReturn(Optional.of(edited));

        mvc.perform(get("/api/points/{id}", ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.editedByTeam").value(true));
    }

    @Test
    void allowsTheFrontEndOrigin() throws Exception {
        when(repository.findByStatus(PointStatus.ACTIVE)).thenReturn(List.of());

        mvc.perform(get("/api/points").header("Origin", "http://localhost:5173"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}
