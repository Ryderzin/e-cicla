package br.com.ecicla.api.suggestion;

import java.time.Instant;

/** Summary of a suggestion shown in user and administrator lists. */
public record SuggestionView(
        String id,
        SuggestionType type,
        String pointId,
        String currentPointName,
        ProposedPoint proposed,
        String comment,
        SuggestionStatus status,
        Instant reviewedAt,
        String reviewReason,
        Instant createdAt,
        Instant updatedAt) {

    static SuggestionView from(Suggestion suggestion, String currentPointName) {
        SuggestionReview review = suggestion.review();
        return new SuggestionView(
                suggestion.id(),
                suggestion.type(),
                suggestion.pointId(),
                currentPointName,
                suggestion.proposed(),
                suggestion.comment(),
                suggestion.status(),
                review == null ? null : review.reviewedAt(),
                review == null ? null : review.reason(),
                suggestion.createdAt(),
                suggestion.updatedAt());
    }
}
