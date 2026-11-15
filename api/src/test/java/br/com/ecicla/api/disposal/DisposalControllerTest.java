package br.com.ecicla.api.disposal;

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

import br.com.ecicla.api.auth.Authenticated;
import br.com.ecicla.api.auth.Role;
import br.com.ecicla.api.auth.SessionService;
import br.com.ecicla.api.auth.User;
import br.com.ecicla.api.common.FixedClock;
import br.com.ecicla.api.device.Device;
import br.com.ecicla.api.device.DeviceController;
import br.com.ecicla.api.device.DeviceRepository;
import br.com.ecicla.api.device.DeviceService;
import br.com.ecicla.api.device.DeviceStatus;
import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.CollectionPointRepository;
import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.PointSource;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.SourceType;

/** Devices (PB09, PB10), deliveries with the "not accepted" check (PB15, PB11) and the history (PB16). */
@WebMvcTest({DeviceController.class, DisposalController.class})
@Import({DeviceService.class, DisposalService.class, FixedClock.class})
class DisposalControllerTest {

    private static final String ANA = "66fb1c2e8f1b2a3c4d5e6f01";
    private static final String BIA = "66fb1c2e8f1b2a3c4d5e6f02";
    private static final String PHONE_ID = "66fb1c2e8f1b2a3c4d5e6f10";
    private static final String POINT_ID = "66fb1c2e8f1b2a3c4d5e6f70";
    private static final String DISPOSAL_ID = "66fb1c2e8f1b2a3c4d5e6f90";
    private static final Instant T = Instant.parse("2026-10-01T12:00:00Z");
    private static final Device PHONE = new Device(PHONE_ID, ANA, Material.MOBILE_PHONES, "Celular antigo", null,
            DeviceStatus.REGISTERED, T, T);

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private DeviceRepository devices;

    @MockitoBean
    private DisposalRepository disposals;

    @MockitoBean
    private CollectionPointRepository points;

    @MockitoBean
    private SessionService sessions;

    @BeforeEach
    void setUp() {
        when(sessions.authenticate("token-ana")).thenReturn(Optional.of(new Authenticated(user(ANA), "h1")));
        when(sessions.authenticate("token-bia")).thenReturn(Optional.of(new Authenticated(user(BIA), "h2")));
        when(devices.findById(PHONE_ID)).thenReturn(Optional.of(PHONE));
        when(devices.save(any())).thenAnswer(invocation -> {
            Device d = invocation.getArgument(0);
            return d.id() != null ? d : new Device("66fb1c2e8f1b2a3c4d5e6f11", d.userId(), d.category(),
                    d.description(), d.details(), d.status(), d.createdAt(), d.updatedAt());
        });
        when(disposals.save(any())).thenAnswer(invocation -> {
            Disposal d = invocation.getArgument(0);
            return new Disposal(DISPOSAL_ID, d.userId(), d.deviceId(), d.deviceCategory(), d.deviceDescription(),
                    d.pointId(), d.pointName(), d.pointAccepted(), d.disposedOn(), d.createdAt());
        });
    }

    private static User user(String id) {
        return new User(id, "Pessoa", id + "@exemplo.com", "hash", Role.USER, T, T, T);
    }

    private void pointAccepting(String name, Material... materials) {
        when(points.findByIdAndStatus(POINT_ID, PointStatus.ACTIVE)).thenReturn(Optional.of(new CollectionPoint(
                POINT_ID, name, new GeoJsonPoint(-46.5, -23.5), "Rua Exemplo", false, List.of(materials), null, null,
                null, new PointSource(SourceType.OSM, "node/1", T), PointStatus.ACTIVE, T, null)));
    }

    private static String delivery(String day, boolean confirm) {
        return """
                {"deviceId": "%s", "pointId": "%s", "disposedOn": %s, "confirmNotAccepted": %s}
                """.formatted(PHONE_ID, POINT_ID, day == null ? "null" : "\"" + day + "\"", confirm);
    }

    @Test
    void requiresSigningIn() throws Exception {
        mvc.perform(get("/api/devices")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/disposals")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/disposals").contentType(MediaType.APPLICATION_JSON).content(delivery(null, false)))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(devices, disposals);
    }

    @Test
    void registersADeviceWithSimpleAnswers() throws Exception {
        mvc.perform(post("/api/devices").header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"category": "COMPUTERS", "description": "  Notebook   do trabalho ",
                                 "details": {"batteryType": "LITHIUM", "screenSizeInches": 14}}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description").value("Notebook do trabalho"))
                .andExpect(jsonPath("$.status").value("REGISTERED"))
                .andExpect(jsonPath("$.details.batteryType").value("LITHIUM"));

        mvc.perform(post("/api/devices").header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"description\": \"Sem tipo\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/devices").header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"category": "MOBILE_PHONES", "description": "Celular", "details": {"screenSizeInches": 500}}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void someoneElsesDeviceDoesNotExist() throws Exception {
        mvc.perform(get("/api/devices/{id}", PHONE_ID).header("Authorization", "Bearer token-bia"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/devices/{id}", PHONE_ID).header("Authorization", "Bearer token-bia"))
                .andExpect(status().isNotFound());
        verify(devices, never()).deleteById(any());
    }

    @Test
    void aDeliveredDeviceCannotBeEdited() throws Exception {
        when(devices.findById(PHONE_ID)).thenReturn(Optional.of(new Device(PHONE_ID, ANA, Material.MOBILE_PHONES,
                "Celular antigo", null, DeviceStatus.DISPOSED, T, T)));
        mvc.perform(put("/api/devices/{id}", PHONE_ID).header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"category\": \"MOBILE_PHONES\", \"description\": \"Outro nome\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void registersADeliveryToday_inSaoPauloTime() throws Exception {
        pointAccepting(null, Material.MOBILE_PHONES, Material.BATTERIES);

        mvc.perform(post("/api/disposals").header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON).content(delivery(null, false)))
                .andExpect(status().isCreated())
                // 01:30 UTC on 1 December is still 30 November in São Paulo.
                .andExpect(jsonPath("$.disposedOn").value("2026-11-30"))
                .andExpect(jsonPath("$.pointName").value("Ponto de coleta"))
                .andExpect(jsonPath("$.deviceDescription").value("Celular antigo"))
                .andExpect(jsonPath("$.pointAccepted").value(true));

        ArgumentCaptor<Device> saved = ArgumentCaptor.forClass(Device.class);
        verify(devices).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(DeviceStatus.DISPOSED);
    }

    @Test
    void warnsWhenThePointDoesNotAcceptTheDevice() throws Exception {
        pointAccepting("Ecoponto Pilhas", Material.BATTERIES);

        mvc.perform(post("/api/disposals").header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON).content(delivery("2026-11-20", false)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("NOT_ACCEPTED"))
                .andExpect(jsonPath("$.accepted[0]").value("BATTERIES"));
        verify(disposals, never()).save(any());

        mvc.perform(post("/api/disposals").header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON).content(delivery("2026-11-20", true)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.pointAccepted").value(false))
                .andExpect(jsonPath("$.pointName").value("Ecoponto Pilhas"));
    }

    @Test
    void rejectsInvalidDeliveries() throws Exception {
        pointAccepting("Ponto", Material.MOBILE_PHONES);
        for (String day : List.of("2026-12-01", "2025-11-01", "30/11/2026")) {
            mvc.perform(post("/api/disposals").header("Authorization", "Bearer token-ana")
                            .contentType(MediaType.APPLICATION_JSON).content(delivery(day, false)))
                    .andExpect(status().isBadRequest());
        }
        // Someone else's device and a point that is not active.
        mvc.perform(post("/api/disposals").header("Authorization", "Bearer token-bia")
                        .contentType(MediaType.APPLICATION_JSON).content(delivery(null, false)))
                .andExpect(status().isNotFound());
        when(points.findByIdAndStatus(POINT_ID, PointStatus.ACTIVE)).thenReturn(Optional.empty());
        mvc.perform(post("/api/disposals").header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON).content(delivery(null, false)))
                .andExpect(status().isNotFound());
        verify(disposals, never()).save(any());
    }

    @Test
    void aDeviceIsDeliveredOnlyOnce() throws Exception {
        pointAccepting("Ponto", Material.MOBILE_PHONES);
        when(devices.findById(PHONE_ID)).thenReturn(Optional.of(new Device(PHONE_ID, ANA, Material.MOBILE_PHONES,
                "Celular antigo", null, DeviceStatus.DISPOSED, T, T)));
        mvc.perform(post("/api/disposals").header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON).content(delivery(null, false)))
                .andExpect(status().isConflict());
    }

    @Test
    void showsTheHistoryWithTotalsByKind() throws Exception {
        when(disposals.findByUserIdOrderByDisposedOnDescCreatedAtDesc(ANA)).thenReturn(List.of(
                new Disposal("d1", ANA, PHONE_ID, Material.MOBILE_PHONES, "Celular antigo", POINT_ID, "Ponto", true,
                        "2026-11-20", T),
                new Disposal("d2", ANA, "x", Material.BATTERIES, "Pilhas", POINT_ID, "Ponto", true, "2026-11-10", T)));

        mvc.perform(get("/api/disposals").header("Authorization", "Bearer token-ana"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.totals.total").value(2))
                .andExpect(jsonPath("$.totals.byCategory.MOBILE_PHONES").value(1))
                .andExpect(jsonPath("$.totals.byCategory.COMPUTERS").value(0));
    }

    @Test
    void undoingADeliveryReturnsTheDeviceToTheList() throws Exception {
        when(disposals.findById(DISPOSAL_ID)).thenReturn(Optional.of(new Disposal(DISPOSAL_ID, ANA, PHONE_ID,
                Material.MOBILE_PHONES, "Celular antigo", POINT_ID, "Ponto", true, "2026-11-20", T)));
        when(devices.findById(PHONE_ID)).thenReturn(Optional.of(new Device(PHONE_ID, ANA, Material.MOBILE_PHONES,
                "Celular antigo", null, DeviceStatus.DISPOSED, T, T)));

        mvc.perform(delete("/api/disposals/{id}", DISPOSAL_ID).header("Authorization", "Bearer token-bia"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/disposals/{id}", DISPOSAL_ID).header("Authorization", "Bearer token-ana"))
                .andExpect(status().isNoContent());

        verify(disposals).deleteById(DISPOSAL_ID);
        ArgumentCaptor<Device> saved = ArgumentCaptor.forClass(Device.class);
        verify(devices).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(DeviceStatus.REGISTERED);
    }
}
