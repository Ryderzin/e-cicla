package br.com.ecicla.api.suggestion;

import br.com.ecicla.api.admin.PointInput;

/**
 * Payload sent when a user submits or edits a suggestion. {@link #validated()} checks the type,
 * validates the proposed point fields and trims the optional comment.
 */
public record SuggestionInput(
        SuggestionType type,
        String pointId,
        PointInput proposed,
        String comment) {

    static final int COMMENT_MAX = 500;

    SuggestionInput validated() {
        if (type == null) {
            throw new IllegalArgumentException("type is required");
        }
        String cleanPointId = trimmed(pointId);
        if (type == SuggestionType.POINT_UPDATE && cleanPointId == null) {
            throw new IllegalArgumentException("pointId is required when suggesting updates to an existing point");
        }
        if (type == SuggestionType.NEW_POINT && cleanPointId != null) {
            throw new IllegalArgumentException("pointId must not be set for a new point suggestion");
        }
        if (proposed == null) {
            throw new IllegalArgumentException("proposed point details are required");
        }
        PointInput validProposed = proposed.validated();
        String cleanComment = trimmed(comment);
        if (cleanComment != null && cleanComment.length() > COMMENT_MAX) {
            throw new IllegalArgumentException("comment must have at most " + COMMENT_MAX + " characters");
        }
        return new SuggestionInput(type, cleanPointId, validProposed, cleanComment);
    }

    private static String trimmed(String value) {
        if (value == null) {
            return null;
        }
        String s = value.strip();
        return s.isEmpty() ? null : s;
    }
}
