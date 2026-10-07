package br.com.ecicla.api.auth;

import java.time.Instant;
import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecicla.api.auth.AuthRequests.Login;
import br.com.ecicla.api.auth.AuthRequests.Register;
import br.com.ecicla.api.auth.AuthRequests.SessionResponse;

/** Creating accounts, signing in and deleting accounts. */
@Service
public class AccountService {

    static final int NAME_MIN = 2;
    static final int NAME_MAX = 80;
    static final int PASSWORD_MIN = 8;
    static final int PASSWORD_MAX = 128;
    private static final int EMAIL_MAX = 254;
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final UserRepository users;
    private final PasswordHasher hasher;
    private final SessionService sessions;
    private final String dummyHash;

    public AccountService(UserRepository users, PasswordHasher hasher, SessionService sessions) {
        this.users = users;
        this.hasher = hasher;
        this.sessions = sessions;
        this.dummyHash = hasher.dummyHash();
    }

    public SessionResponse register(Register request) {
        String name = trimmed(request.name());
        if (name == null || name.length() < NAME_MIN || name.length() > NAME_MAX) {
            throw badRequest("name must have between " + NAME_MIN + " and " + NAME_MAX + " characters");
        }
        String email = normalizeEmail(request.email());
        if (email == null || email.length() > EMAIL_MAX || !EMAIL.matcher(email).matches()) {
            throw badRequest("email is not valid");
        }
        String password = request.password();
        if (password == null || password.length() < PASSWORD_MIN || password.length() > PASSWORD_MAX) {
            throw badRequest("password must have between " + PASSWORD_MIN + " and " + PASSWORD_MAX + " characters");
        }
        if (!Boolean.TRUE.equals(request.acceptPrivacy())) {
            throw badRequest("the privacy policy must be accepted");
        }
        if (users.existsByEmail(email)) {
            throw emailInUse();
        }
        Instant now = Instant.now();
        User user;
        try {
            user = users.save(new User(null, name, email, hasher.hash(password), Role.USER, now, now, now));
        } catch (DuplicateKeyException e) {
            // Two sign-ups with the same e-mail at the same moment: the unique index lets only one through.
            throw emailInUse();
        }
        return new SessionResponse(sessions.create(user), AccountView.from(user));
    }

    public SessionResponse login(Login request) {
        String email = normalizeEmail(request.email());
        String password = request.password() == null ? "" : request.password();
        User user = email == null ? null : users.findByEmail(email).orElse(null);
        // Checks a password even when the e-mail does not exist, so the answer takes the same time
        // and does not reveal which e-mails have an account.
        boolean valid = hasher.matches(password, user == null ? dummyHash : user.passwordHash());
        if (user == null || !valid) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong e-mail or password");
        }
        return new SessionResponse(sessions.create(user), AccountView.from(user));
    }

    /** Deletes the account and signs it out everywhere, after confirming the password. */
    public void delete(Authenticated authenticated, String password) {
        User user = authenticated.user();
        if (!hasher.matches(password == null ? "" : password, user.passwordHash())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Wrong password");
        }
        sessions.revokeAll(user.id());
        users.deleteById(user.id());
    }

    static String normalizeEmail(String email) {
        String value = trimmed(email);
        return value == null ? null : value.toLowerCase(Locale.ROOT);
    }

    private static String trimmed(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static ResponseStatusException badRequest(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }

    private static ResponseStatusException emailInUse() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "There is already an account with this e-mail");
    }
}
