package br.com.ecicla.api.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Sign-in sessions. The browser keeps a random token (256 bits) and sends it in the
 * {@code Authorization: Bearer} header; the database keeps only its hash.
 */
@Service
public class SessionService {

    private final SessionRepository sessions;
    private final UserRepository users;
    private final Duration lifetime;
    private final SecureRandom random = new SecureRandom();

    public SessionService(SessionRepository sessions, UserRepository users,
            @Value("${app.auth.session-days}") long sessionDays) {
        this.sessions = sessions;
        this.users = users;
        this.lifetime = Duration.ofDays(sessionDays);
    }

    /** Starts a session for the user and returns the token to give to the browser. */
    public String create(User user) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant now = Instant.now();
        sessions.save(new Session(null, hash(token), user.id(), now, now.plus(lifetime)));
        return token;
    }

    /** The account behind a token, if the token belongs to a session that has not expired. */
    public Optional<Authenticated> authenticate(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        String tokenHash = hash(token);
        return sessions.findByTokenHash(tokenHash)
                // MongoDB removes expired sessions about once a minute; do not accept them meanwhile.
                .filter(session -> session.expiresAt().isAfter(Instant.now()))
                .flatMap(session -> users.findById(session.userId()))
                .map(user -> new Authenticated(user, tokenHash));
    }

    public void revoke(Authenticated authenticated) {
        sessions.deleteByTokenHash(authenticated.tokenHash());
    }

    public void revokeAll(String userId) {
        sessions.deleteByUserId(userId);
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
