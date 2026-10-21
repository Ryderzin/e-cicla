package br.com.ecicla.api.suggestion;

/** Lifecycle of a user suggestion. Only {@code PENDING} suggestions can be edited, deleted or reviewed. */
public enum SuggestionStatus {
    PENDING,
    APPROVED,
    REJECTED
}
