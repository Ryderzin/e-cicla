package br.com.ecicla.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class AdminAccountsTest {

    private static User account(String id, String email, Role role) {
        Instant then = Instant.parse("2026-10-01T12:00:00Z");
        return new User(id, "Pessoa", email, "hash", role, then, then, then);
    }

    @Test
    void promotesListedAccountsAndDemotesAdministratorsNoLongerListed() {
        UserRepository users = mock(UserRepository.class);
        User former = account("u1", "antiga@exemplo.com", Role.ADMIN);
        User listed = account("u2", "ryan@exemplo.com", Role.USER);
        when(users.findByRole(Role.ADMIN)).thenReturn(List.of(former));
        when(users.findByEmail("ryan@exemplo.com")).thenReturn(Optional.of(listed));

        new AdminAccounts(users, new String[] {" Ryan@Exemplo.com ", ""}).run(null);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users, times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(User::id, User::role)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("u1", Role.USER),
                        org.assertj.core.groups.Tuple.tuple("u2", Role.ADMIN));
    }

    @Test
    void neverCreatesAccountsForListedE_mails() {
        UserRepository users = mock(UserRepository.class);
        when(users.findByRole(Role.ADMIN)).thenReturn(List.of());
        when(users.findByEmail("sem-conta@exemplo.com")).thenReturn(Optional.empty());

        new AdminAccounts(users, new String[] {"sem-conta@exemplo.com"}).run(null);

        verify(users, never()).save(any());
    }

    @Test
    void leavesListedAdministratorsAsTheyAre() {
        UserRepository users = mock(UserRepository.class);
        User admin = account("u1", "ryan@exemplo.com", Role.ADMIN);
        when(users.findByRole(Role.ADMIN)).thenReturn(List.of(admin));
        when(users.findByEmail("ryan@exemplo.com")).thenReturn(Optional.of(admin));

        new AdminAccounts(users, new String[] {"ryan@exemplo.com"}).run(null);

        verify(users, never()).save(any());
    }
}
