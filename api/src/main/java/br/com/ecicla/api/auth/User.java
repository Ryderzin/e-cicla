package br.com.ecicla.api.auth;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * An account. {@code email} is stored trimmed and in lower case and is unique; {@code passwordHash}
 * holds only the salted hash (see {@link PasswordHasher}), never the password itself.
 */
@Document(User.COLLECTION)
public record User(
        @Id String id,
        String name,
        String email,
        String passwordHash,
        Role role,
        Instant privacyAcceptedAt,
        Instant createdAt,
        Instant updatedAt) {

    public static final String COLLECTION = "users";

    User withRole(Role newRole, Instant now) {
        return new User(id, name, email, passwordHash, newRole, privacyAcceptedAt, createdAt, now);
    }
}
