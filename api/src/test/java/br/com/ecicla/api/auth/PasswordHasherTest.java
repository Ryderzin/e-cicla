package br.com.ecicla.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PasswordHasherTest {

    private final PasswordHasher hasher = new PasswordHasher();

    @Test
    void acceptsTheRightPasswordOnly() {
        String stored = hasher.hash("senha-segura-123");

        assertThat(hasher.matches("senha-segura-123", stored)).isTrue();
        assertThat(hasher.matches("senha-segura-124", stored)).isFalse();
        assertThat(hasher.matches("", stored)).isFalse();
    }

    @Test
    void storesParametersAndSaltButNotThePassword() {
        String stored = hasher.hash("senha-segura-123");

        assertThat(stored).startsWith("pbkdf2_sha256$600000$").doesNotContain("senha-segura-123");
        assertThat(stored.split("\\$")).hasSize(4);
    }

    @Test
    void usesADifferentSaltEachTime() {
        assertThat(hasher.hash("senha-segura-123")).isNotEqualTo(hasher.hash("senha-segura-123"));
    }

    @Test
    void rejectsMalformedStoredValues() {
        assertThat(hasher.matches("senha", null)).isFalse();
        assertThat(hasher.matches("senha", "texto-qualquer")).isFalse();
        assertThat(hasher.matches("senha", "bcrypt$10$abc$def")).isFalse();
        assertThat(hasher.matches("senha", "pbkdf2_sha256$x$abc$def")).isFalse();
        assertThat(hasher.matches(null, hasher.hash("senha-segura-123"))).isFalse();
    }
}
