package br.com.ecicla.api.auth;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

import org.springframework.stereotype.Component;

/**
 * Password hashing with PBKDF2-HMAC-SHA256 from the JDK: a random salt per password and 600,000
 * iterations (OWASP's recommendation for this algorithm). The stored value carries the algorithm and
 * the parameters, {@code pbkdf2_sha256$600000$<salt>$<hash>}, so they can be raised later without
 * breaking older hashes.
 */
@Component
public class PasswordHasher {

    private static final String PREFIX = "pbkdf2_sha256";
    private static final String ALGORITHM = "PBKDF2WithHmacSHA256";
    private static final int ITERATIONS = 600_000;
    private static final int SALT_BYTES = 16;
    private static final int HASH_BITS = 256;

    private final SecureRandom random = new SecureRandom();

    public String hash(String password) {
        byte[] salt = new byte[SALT_BYTES];
        random.nextBytes(salt);
        byte[] hash = derive(password, salt, ITERATIONS, HASH_BITS);
        Base64.Encoder base64 = Base64.getEncoder().withoutPadding();
        return String.join("$", PREFIX, String.valueOf(ITERATIONS), base64.encodeToString(salt), base64.encodeToString(hash));
    }

    /** False for a wrong password and for a stored value in an unknown format. */
    public boolean matches(String password, String stored) {
        if (password == null || stored == null) {
            return false;
        }
        String[] parts = stored.split("\\$");
        if (parts.length != 4 || !parts[0].equals(PREFIX)) {
            return false;
        }
        try {
            int iterations = Integer.parseInt(parts[1]);
            byte[] salt = Base64.getDecoder().decode(parts[2]);
            byte[] expected = Base64.getDecoder().decode(parts[3]);
            byte[] actual = derive(password, salt, iterations, expected.length * 8);
            // Constant-time comparison, so the time taken does not reveal how much of the hash matched.
            return MessageDigest.isEqual(expected, actual);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static byte[] derive(String password, byte[] salt, int iterations, int bits) {
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, bits);
        try {
            return SecretKeyFactory.getInstance(ALGORITHM).generateSecret(spec).getEncoded();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(ALGORITHM + " is not available", e);
        } finally {
            spec.clearPassword();
        }
    }

    /** A valid hash of a random password, to spend the same time when the e-mail does not exist. */
    String dummyHash() {
        byte[] password = new byte[SALT_BYTES];
        random.nextBytes(password);
        return hash(new String(Base64.getEncoder().encode(password), StandardCharsets.US_ASCII));
    }
}
