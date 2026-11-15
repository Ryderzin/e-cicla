package br.com.ecicla.api.notification;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import br.com.ecicla.api.auth.AccountDeletedEvent;
import br.com.ecicla.api.auth.Authenticated;
import br.com.ecicla.api.device.DeviceRepository;
import br.com.ecicla.api.device.DeviceStatus;
import br.com.ecicla.api.suggestion.SuggestionReviewedEvent;
import br.com.ecicla.api.suggestion.SuggestionType;

/**
 * Notices on the site and, when the user chose it, by e-mail (PB19). The reminder about devices not yet
 * delivered is created when the user opens the notices, not by a scheduled task: the free Render plan
 * sleeps, so a schedule would not run.
 */
@Service
public class NotificationService {

    static final Duration REMINDER_AFTER = Duration.ofDays(30);
    static final int LIST_LIMIT = 50;

    private final NotificationRepository notifications;
    private final NotificationPreferencesRepository preferences;
    private final DeviceRepository devices;
    private final NotificationMailer mailer;
    private final Clock clock;

    public NotificationService(NotificationRepository notifications, NotificationPreferencesRepository preferences,
            DeviceRepository devices, NotificationMailer mailer, Clock clock) {
        this.notifications = notifications;
        this.preferences = preferences;
        this.devices = devices;
        this.mailer = mailer;
        this.clock = clock;
    }

    public NotificationView.Inbox inbox(Authenticated authenticated) {
        String userId = authenticated.user().id();
        remindIfDue(userId);
        return new NotificationView.Inbox(
                notifications.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, LIST_LIMIT)).stream()
                        .map(NotificationView::from).toList(),
                notifications.countByUserIdAndReadFalse(userId));
    }

    public boolean markRead(Authenticated authenticated, String id) {
        Optional<Notification> found = (ObjectId.isValid(id) ? notifications.findById(id)
                : Optional.<Notification>empty()).filter(n -> authenticated.user().id().equals(n.userId()));
        found.filter(n -> !n.read()).ifPresent(n -> notifications.save(read(n)));
        return found.isPresent();
    }

    public void markAllRead(Authenticated authenticated) {
        notifications.saveAll(notifications.findByUserIdAndReadFalse(authenticated.user().id()).stream()
                .map(NotificationService::read).toList());
    }

    public NotificationView.Preferences preferences(Authenticated authenticated) {
        NotificationPreferences p = preferencesOf(authenticated.user().id());
        return new NotificationView.Preferences(p.suggestionUpdatesEmail(), p.remindersEmail());
    }

    public NotificationView.Preferences updatePreferences(Authenticated authenticated,
            NotificationView.Preferences input) {
        NotificationPreferences saved = preferences.save(new NotificationPreferences(authenticated.user().id(),
                input.suggestionUpdatesEmail(), input.remindersEmail(), Instant.now(clock)));
        return new NotificationView.Preferences(saved.suggestionUpdatesEmail(), saved.remindersEmail());
    }

    @EventListener
    public void onSuggestionReviewed(SuggestionReviewedEvent event) {
        String what = event.type() == SuggestionType.NEW_POINT ? "de novo ponto de coleta" : "de correção";
        String where = event.pointName() == null || event.pointName().isBlank() ? "" : " (" + event.pointName() + ")";
        String title;
        String message;
        if (event.approved()) {
            title = "Sua sugestão foi aprovada";
            message = "A equipe aprovou sua sugestão " + what + where + ". Obrigado por ajudar a manter o mapa "
                    + "atualizado.";
        } else {
            title = "Sua sugestão não foi aprovada";
            message = "A equipe não aprovou sua sugestão " + what + where + "."
                    + (event.reason() == null || event.reason().isBlank() ? "" : " Motivo: " + event.reason());
        }
        NotificationType type = event.approved() ? NotificationType.SUGGESTION_APPROVED
                : NotificationType.SUGGESTION_REJECTED;
        Notification saved = create(event.userId(), type, title, message, "/sugestoes");
        if (preferencesOf(event.userId()).suggestionUpdatesEmail()) {
            mailer.send(saved);
        }
    }

    @EventListener
    public void onAccountDeleted(AccountDeletedEvent event) {
        notifications.deleteByUserId(event.userId());
        preferences.deleteById(event.userId());
    }

    /** At most one reminder every 30 days, only while a device registered 30+ days ago is not delivered. */
    private void remindIfDue(String userId) {
        Instant limit = Instant.now(clock).minus(REMINDER_AFTER);
        if (!devices.existsByUserIdAndStatusAndCreatedAtBefore(userId, DeviceStatus.REGISTERED, limit)
                || notifications.existsByUserIdAndTypeAndCreatedAtAfter(userId, NotificationType.DEVICE_REMINDER,
                        limit)) {
            return;
        }
        Notification saved = create(userId, NotificationType.DEVICE_REMINDER,
                "Você tem aparelhos esperando o descarte",
                "Há aparelhos cadastrados há mais de 30 dias que ainda não foram entregues. Veja os pontos de coleta "
                        + "mais próximos e registre a entrega quando levar.",
                "/meus-aparelhos");
        if (preferencesOf(userId).remindersEmail()) {
            mailer.send(saved);
        }
    }

    private Notification create(String userId, NotificationType type, String title, String message, String link) {
        return notifications.save(new Notification(null, userId, type, title, message, link, false, null,
                Instant.now(clock)));
    }

    private NotificationPreferences preferencesOf(String userId) {
        return preferences.findById(userId).orElseGet(() -> NotificationPreferences.defaults(userId));
    }

    private static Notification read(Notification n) {
        return new Notification(n.id(), n.userId(), n.type(), n.title(), n.message(), n.link(), true,
                n.emailSentAt(), n.createdAt());
    }
}
