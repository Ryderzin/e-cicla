package br.com.ecicla.api.suggestion;

import java.time.Instant;

/** Decision recorded when an administrator approves or rejects a suggestion. */
public record SuggestionReview(
        String adminId,
        Instant reviewedAt,
        String reason) {
}
