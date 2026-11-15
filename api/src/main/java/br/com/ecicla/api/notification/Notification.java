package br.com.ecicla.api.notification;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A notice shown on the site (PB19). {@code link} is a path of the site, such as {@code /sugestoes}.
 * MongoDB deletes notices 180 days after {@code createdAt} (TTL index).
 */
@Document(Notification.COLLECTION)
public record Notification(
        @Id String id,
        String userId,
        NotificationType type,
        String title,
        String message,
        String link,
        boolean read,
        Instant emailSentAt,
        Instant createdAt) {

    public static final String COLLECTION = "notifications";
}
