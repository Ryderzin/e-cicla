package br.com.ecicla.api.notification;

import java.time.Instant;
import java.util.List;

public record NotificationView(
        String id,
        NotificationType type,
        String title,
        String message,
        String link,
        boolean read,
        Instant createdAt) {

    static NotificationView from(Notification n) {
        return new NotificationView(n.id(), n.type(), n.title(), n.message(), n.link(), n.read(), n.createdAt());
    }

    public record Inbox(List<NotificationView> items, long unreadCount) {
    }

    public record Preferences(boolean suggestionUpdatesEmail, boolean remindersEmail) {
    }
}
