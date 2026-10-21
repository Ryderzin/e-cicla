package br.com.ecicla.api.auth;

import java.time.Instant;

public record PasswordReset(String tokenHash, Instant expiresAt) {

    public boolean isExpired(Instant now) {
        return expiresAt.isBefore(now);
    }
}
