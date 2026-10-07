package br.com.ecicla.api.auth;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * An account. {@code email} is stored trimmed and in lower case and is unique; {@code passwordHash}
 * holds only the salted hash (see {@link PasswordHasher}), never the password itself.
 * {@code role} is never taken from a request: every new account is USER, and an administrator is made
 * by changing this field to ADMIN directly in the database.
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
}
