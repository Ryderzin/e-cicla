package br.com.ecicla.api.suggestion;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A user suggestion of a new collection point or of corrections to an existing point. Stored in the
 * {@code suggestions} collection until an administrator approves or rejects it (or the author deletes it
 * while still {@code PENDING}).
 */
@Document(Suggestion.COLLECTION)
public record Suggestion(
        @Id String id,
        String userId,
        SuggestionType type,
        String pointId,
        ProposedPoint proposed,
        String comment,
        SuggestionStatus status,
        SuggestionReview review,
        Instant createdAt,
        Instant updatedAt) {

    public static final String COLLECTION = "suggestions";
}
