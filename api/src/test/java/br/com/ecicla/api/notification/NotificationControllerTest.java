package br.com.ecicla.api.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import br.com.ecicla.api.auth.AccountDeletedEvent;
import br.com.ecicla.api.auth.Authenticated;
import br.com.ecicla.api.auth.Role;
import br.com.ecicla.api.auth.SessionService;
import br.com.ecicla.api.auth.User;
import br.com.ecicla.api.common.FixedClock;
import br.com.ecicla.api.device.DeviceRepository;
import br.com.ecicla.api.device.DeviceStatus;
import br.com.ecicla.api.suggestion.SuggestionReviewedEvent;
import br.com.ecicla.api.suggestion.SuggestionType;

@WebMvcTest(NotificationController.class)
@Import({NotificationService.class, FixedClock.class})
class NotificationControllerTest {

    private static final String ANA = "66fb1c2e8f1b2a3c4d5e6f01";
    private static final String NOTICE_ID = "66fb1c2e8f1b2a3c4d5e6fa0";
    private static final Instant T = Instant.parse("2026-10-01T12:00:00Z");
    private static final Instant THIRTY_DAYS_AGO = FixedClock.NOW.minus(Duration.ofDays(30));

    @Autowired
    private MockMvc mvc;

    @Autowired
    private NotificationService service;

    @MockitoBean
    private NotificationRepository notifications;

    @MockitoBean
    private NotificationPreferencesRepository preferences;

    @MockitoBean
    private DeviceRepository devices;

    @MockitoBean
    private NotificationMailer mailer;

    @MockitoBean
    private SessionService sessions;

    @BeforeEach
    void setUp() {
        User ana = new User(ANA, "Ana", "ana@exemplo.com", "hash", Role.USER, T, T, T);
        when(sessions.authenticate("token-ana")).thenReturn(Optional.of(new Authenticated(ana, "h1")));
        when(notifications.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(preferences.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void requiresSigningIn() throws Exception {
        mvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me/notification-preferences")).andExpect(status().isUnauthorized());
    }

    @Test
    void remindsOfDevicesWaitingMoreThanThirtyDays_atMostOncePerThirtyDays() throws Exception {
        when(devices.existsByUserIdAndStatusAndCreatedAtBefore(ANA, DeviceStatus.REGISTERED, THIRTY_DAYS_AGO))
                .thenReturn(true);
        when(notifications.existsByUserIdAndTypeAndCreatedAtAfter(ANA, NotificationType.DEVICE_REMINDER,
                THIRTY_DAYS_AGO)).thenReturn(false);

        mvc.perform(get("/api/notifications").header("Authorization", "Bearer token-ana"))
                .andExpect(status().isOk());

        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(saved.capture());
        assertThat(saved.getValue().type()).isEqualTo(NotificationType.DEVICE_REMINDER);
        assertThat(saved.getValue().link()).isEqualTo("/meus-aparelhos");
        assertThat(saved.getValue().read()).isFalse();
        // E-mail is off unless the user chose it.
        verify(mailer, never()).send(any());

        when(notifications.existsByUserIdAndTypeAndCreatedAtAfter(ANA, NotificationType.DEVICE_REMINDER,
                THIRTY_DAYS_AGO)).thenReturn(true);
        mvc.perform(get("/api/notifications").header("Authorization", "Bearer token-ana"))
                .andExpect(status().isOk());
        verify(notifications).save(any());
    }

    @Test
    void listsNoticesWithTheUnreadCount() throws Exception {
        when(notifications.findByUserIdOrderByCreatedAtDesc(eq(ANA), any())).thenReturn(List.of(
                new Notification(NOTICE_ID, ANA, NotificationType.SUGGESTION_APPROVED, "Sua sugestão foi aprovada",
                        "Mensagem", "/sugestoes", false, null, T)));
        when(notifications.countByUserIdAndReadFalse(ANA)).thenReturn(1L);

        mvc.perform(get("/api/notifications").header("Authorization", "Bearer token-ana"))
                .andExpect(jsonPath("$.unreadCount").value(1))
                .andExpect(jsonPath("$.items[0].title").value("Sua sugestão foi aprovada"));
    }

    @Test
    void marksOnlyOwnNoticesAsRead() throws Exception {
        when(notifications.findById(NOTICE_ID)).thenReturn(Optional.of(new Notification(NOTICE_ID, "outra-pessoa",
                NotificationType.SUGGESTION_APPROVED, "t", "m", "/sugestoes", false, null, T)));
        mvc.perform(put("/api/notifications/{id}/read", NOTICE_ID).header("Authorization", "Bearer token-ana"))
                .andExpect(status().isNotFound());
        verify(notifications, never()).save(any());

        when(notifications.findById(NOTICE_ID)).thenReturn(Optional.of(new Notification(NOTICE_ID, ANA,
                NotificationType.SUGGESTION_APPROVED, "t", "m", "/sugestoes", false, null, T)));
        mvc.perform(put("/api/notifications/{id}/read", NOTICE_ID).header("Authorization", "Bearer token-ana"))
                .andExpect(status().isNoContent());
        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(saved.capture());
        assertThat(saved.getValue().read()).isTrue();
    }

    @Test
    void emailPreferencesStartOffAndCanBeChanged() throws Exception {
        mvc.perform(get("/api/me/notification-preferences").header("Authorization", "Bearer token-ana"))
                .andExpect(jsonPath("$.suggestionUpdatesEmail").value(false))
                .andExpect(jsonPath("$.remindersEmail").value(false));

        mvc.perform(put("/api/me/notification-preferences").header("Authorization", "Bearer token-ana")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"suggestionUpdatesEmail\": true, \"remindersEmail\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.suggestionUpdatesEmail").value(true));
        ArgumentCaptor<NotificationPreferences> saved = ArgumentCaptor.forClass(NotificationPreferences.class);
        verify(preferences).save(saved.capture());
        assertThat(saved.getValue().userId()).isEqualTo(ANA);
    }

    @Test
    void tellsTheAuthorWhenASuggestionIsReviewed_byEmailOnlyIfChosen() {
        service.onSuggestionReviewed(new SuggestionReviewedEvent("s1", ANA, SuggestionType.NEW_POINT, false,
                "Ecoponto Bairro", "Endereço não encontrado."));
        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(saved.capture());
        assertThat(saved.getValue().type()).isEqualTo(NotificationType.SUGGESTION_REJECTED);
        assertThat(saved.getValue().message()).contains("Ecoponto Bairro").contains("Endereço não encontrado.");
        verify(mailer, never()).send(any());

        when(preferences.findById(ANA)).thenReturn(Optional.of(new NotificationPreferences(ANA, true, false, T)));
        service.onSuggestionReviewed(new SuggestionReviewedEvent("s2", ANA, SuggestionType.POINT_UPDATE, true,
                null, null));
        verify(mailer).send(any());
    }

    @Test
    void deletesNoticesWithTheAccount() {
        service.onAccountDeleted(new AccountDeletedEvent(ANA));
        verify(notifications).deleteByUserId(ANA);
        verify(preferences).deleteById(ANA);
    }
}
