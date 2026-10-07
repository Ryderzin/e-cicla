package br.com.ecicla.api.auth;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A signed-in browser. Only the SHA-256 hash of the token is stored, so a copy of the database does
 * not let anyone sign in. MongoDB deletes expired sessions by itself (TTL index on {@code expiresAt}).
 */
@Document(Session.COLLECTION)
public record Session(
        @Id String id,
        String tokenHash,
        String userId,
        Instant createdAt,
        Instant expiresAt) {

    public static final String COLLECTION = "sessions";
}
