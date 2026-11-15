package br.com.ecicla.api.notification;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Which notices also go by e-mail (PB19). The id is the user's id. Kept apart from {@code users} so the
 * account code, which rewrites the whole user document, cannot erase it. Without a document, nothing goes by
 * e-mail: notices on the site are always on.
 */
@Document(NotificationPreferences.COLLECTION)
public record NotificationPreferences(
        @Id String userId,
        boolean suggestionUpdatesEmail,
        boolean remindersEmail,
        Instant updatedAt) {

    public static final String COLLECTION = "notification_preferences";

    static NotificationPreferences defaults(String userId) {
        return new NotificationPreferences(userId, false, false, null);
    }
}
