package br.com.ecicla.api.suggestion;

/**
 * Published when an administrator approves or rejects a suggestion, so its author can be told (PB19).
 * {@code pointName} may be null (point without a name); {@code reason} may be null on approvals.
 */
public record SuggestionReviewedEvent(
        String suggestionId,
        String userId,
        SuggestionType type,
        boolean approved,
        String pointName,
        String reason) {
}
