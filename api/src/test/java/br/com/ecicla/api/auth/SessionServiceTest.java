package br.com.ecicla.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class SessionServiceTest {

    private static final User USER = new User("u1", "Ana", "ana@exemplo.com", "hash", Role.USER,
            Instant.now(), Instant.now(), Instant.now());

    private final SessionRepository sessions = mock(SessionRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final SessionService service = new SessionService(sessions, users, 30);

    @Test
    void storesOnlyTheHashOfTheTokenAndExpiresIn30Days() {
        String token = service.create(USER);

        ArgumentCaptor<Session> saved = ArgumentCaptor.forClass(Session.class);
        verify(sessions).save(saved.capture());
        assertThat(token).hasSizeGreaterThanOrEqualTo(43);
        assertThat(saved.getValue().tokenHash()).isEqualTo(SessionService.hash(token)).isNotEqualTo(token);
        assertThat(saved.getValue().userId()).isEqualTo("u1");
        assertThat(Duration.between(saved.getValue().createdAt(), saved.getValue().expiresAt())).isEqualTo(Duration.ofDays(30));
    }

    @Test
    void createsADifferentTokenEachTime() {
        when(sessions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(service.create(USER)).isNotEqualTo(service.create(USER));
    }

    @Test
    void authenticatesAValidToken() {
        String hash = SessionService.hash("token-valido");
        when(sessions.findByTokenHash(hash)).thenReturn(Optional.of(
                new Session("s1", hash, "u1", Instant.now(), Instant.now().plusSeconds(60))));
        when(users.findById("u1")).thenReturn(Optional.of(USER));

        assertThat(service.authenticate("token-valido")).contains(new Authenticated(USER, hash));
    }

    @Test
    void rejectsExpiredUnknownAndEmptyTokens() {
        String hash = SessionService.hash("token-vencido");
        when(sessions.findByTokenHash(hash)).thenReturn(Optional.of(
                new Session("s1", hash, "u1", Instant.now().minusSeconds(120), Instant.now().minusSeconds(1))));
        when(users.findById("u1")).thenReturn(Optional.of(USER));

        assertThat(service.authenticate("token-vencido")).isEmpty();
        assertThat(service.authenticate("token-desconhecido")).isEmpty();
        assertThat(service.authenticate("")).isEmpty();
        assertThat(service.authenticate(null)).isEmpty();
    }

    @Test
    void rejectsSessionsOfDeletedAccounts() {
        String hash = SessionService.hash("token-orfao");
        when(sessions.findByTokenHash(hash)).thenReturn(Optional.of(
                new Session("s1", hash, "apagado", Instant.now(), Instant.now().plusSeconds(60))));
        when(users.findById("apagado")).thenReturn(Optional.empty());

        assertThat(service.authenticate("token-orfao")).isEmpty();
    }
}
