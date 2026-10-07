package br.com.ecicla.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest({AuthController.class, AccountController.class})
@Import({AccountService.class, PasswordHasher.class})
class AccountEndpointsTest {

    private static final String ORIGIN = "http://localhost:5173";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private PasswordHasher hasher;

    @MockitoBean
    private UserRepository users;

    @MockitoBean
    private SessionService sessions;

    private User user(String password) {
        return new User("u1", "Ana", "ana@exemplo.com", hasher.hash(password), Role.USER,
                Instant.now(), Instant.now(), Instant.now());
    }

    private void signedIn(User user) {
        when(sessions.authenticate("token-da-ana")).thenReturn(Optional.of(new Authenticated(user, "hash-da-ana")));
    }

    @Test
    void createsAnAccountAndSignsItIn() throws Exception {
        when(users.save(any())).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            return new User("u1", u.name(), u.email(), u.passwordHash(), u.role(), u.privacyAcceptedAt(), u.createdAt(),
                    u.updatedAt());
        });
        when(sessions.create(any())).thenReturn("token-novo");

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                        {"name": "  Ana  ", "email": " Ana@Exemplo.com ", "password": "senha-segura-123", "acceptPrivacy": true}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("token-novo"))
                .andExpect(jsonPath("$.account.id").value("u1"))
                .andExpect(jsonPath("$.account.name").value("Ana"))
                .andExpect(jsonPath("$.account.email").value("ana@exemplo.com"))
                .andExpect(jsonPath("$.account.role").value("USER"))
                .andExpect(jsonPath("$.account.passwordHash").doesNotExist());

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().passwordHash()).doesNotContain("senha-segura-123");
        assertThat(hasher.matches("senha-segura-123", saved.getValue().passwordHash())).isTrue();
        assertThat(saved.getValue().privacyAcceptedAt()).isNotNull();
    }

    @Test
    void neverTakesTheProfileFromTheRequest() throws Exception {
        // Administrators are made only in the database; the site cannot ask for it.
        when(users.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessions.create(any())).thenReturn("token-novo");

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                        {"name": "Ana", "email": "ana@exemplo.com", "password": "senha-segura-123", "acceptPrivacy": true,
                         "role": "ADMIN"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.account.role").value("USER"));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().role()).isEqualTo(Role.USER);
    }

    @Test
    void seesAProfileChangedInTheDatabaseOnTheNextRequest() throws Exception {
        User promoted = new User("u1", "Ana", "ana@exemplo.com", "hash", Role.ADMIN, Instant.now(), Instant.now(),
                Instant.now());
        signedIn(promoted);

        mvc.perform(get("/api/me").header("Authorization", "Bearer token-da-ana"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void requiresAcceptingThePrivacyPolicy() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                        {"name": "Ana", "email": "ana@exemplo.com", "password": "senha-segura-123", "acceptPrivacy": false}
                        """))
                .andExpect(status().isBadRequest());
        verify(users, never()).save(any());
    }

    @Test
    void rejectsShortPasswordsInvalidEmailsAndMissingNames() throws Exception {
        for (String body : new String[] {
                "{\"name\": \"Ana\", \"email\": \"ana@exemplo.com\", \"password\": \"1234567\", \"acceptPrivacy\": true}",
                "{\"name\": \"Ana\", \"email\": \"ana@exemplo\", \"password\": \"senha-segura-123\", \"acceptPrivacy\": true}",
                "{\"name\": \" \", \"email\": \"ana@exemplo.com\", \"password\": \"senha-segura-123\", \"acceptPrivacy\": true}"}) {
            mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verify(users, never()).save(any());
    }

    @Test
    void rejectsAnE_mailThatAlreadyHasAnAccount() throws Exception {
        when(users.existsByEmail("ana@exemplo.com")).thenReturn(true);

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                        {"name": "Ana", "email": "ana@exemplo.com", "password": "senha-segura-123", "acceptPrivacy": true}
                        """))
                .andExpect(status().isConflict());
        verify(users, never()).save(any());
    }

    @Test
    void signsInWithTheRightPassword() throws Exception {
        User ana = user("senha-segura-123");
        when(users.findByEmail("ana@exemplo.com")).thenReturn(Optional.of(ana));
        when(sessions.create(ana)).thenReturn("token-da-ana");

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
                        {"email": "ANA@exemplo.com", "password": "senha-segura-123"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token-da-ana"))
                .andExpect(jsonPath("$.account.email").value("ana@exemplo.com"));
    }

    @Test
    void refusesWrongPasswordsAndUnknownE_mailsTheSameWay() throws Exception {
        when(users.findByEmail("ana@exemplo.com")).thenReturn(Optional.of(user("senha-segura-123")));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
                        {"email": "ana@exemplo.com", "password": "senha-errada"}
                        """))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
                        {"email": "ninguem@exemplo.com", "password": "senha-segura-123"}
                        """))
                .andExpect(status().isUnauthorized());
        verify(sessions, never()).create(any());
    }

    @Test
    void requiresSigningInToSeeTheAccount() throws Exception {
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me").header("Authorization", "Bearer token-desconhecido")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/logout")).andExpect(status().isUnauthorized());
    }

    @Test
    void showsTheSignedInAccountWithoutThePasswordHash() throws Exception {
        signedIn(user("senha-segura-123"));

        mvc.perform(get("/api/me").header("Authorization", "Bearer token-da-ana"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Ana"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void signsOutOnlyTheCurrentSession() throws Exception {
        User ana = user("senha-segura-123");
        signedIn(ana);

        mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer token-da-ana"))
                .andExpect(status().isNoContent());
        verify(sessions).revoke(new Authenticated(ana, "hash-da-ana"));
        verify(sessions, never()).revokeAll(anyString());
    }

    @Test
    void deletesTheAccountOnlyWithItsPassword() throws Exception {
        signedIn(user("senha-segura-123"));

        mvc.perform(delete("/api/me").header("Authorization", "Bearer token-da-ana")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"password\": \"senha-errada\"}"))
                .andExpect(status().isForbidden());
        verify(users, never()).deleteById(anyString());

        mvc.perform(delete("/api/me").header("Authorization", "Bearer token-da-ana")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"password\": \"senha-segura-123\"}"))
                .andExpect(status().isNoContent());
        verify(sessions).revokeAll("u1");
        verify(users).deleteById("u1");
    }

    @Test
    void answersTheBrowserCorsCheckWithoutAToken() throws Exception {
        mvc.perform(options("/api/me")
                        .header("Origin", ORIGIN)
                        .header("Access-Control-Request-Method", "DELETE")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", ORIGIN))
                .andExpect(header().string("Access-Control-Allow-Methods", org.hamcrest.Matchers.containsString("DELETE")));
        verify(sessions, never()).authenticate(any());
    }

    @Test
    void keepsCorsHeadersOnUnauthorizedAnswers() throws Exception {
        // Without them the site could not tell "signed out" from "network error".
        mvc.perform(get("/api/me").header("Origin", ORIGIN))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Access-Control-Allow-Origin", ORIGIN));
    }

    @Test
    void doesNotAcceptTokensFromOtherSchemes() throws Exception {
        signedIn(user("senha-segura-123"));

        mvc.perform(get("/api/me").header("Authorization", "Basic token-da-ana")).andExpect(status().isUnauthorized());
        verify(sessions, never()).authenticate(eq("token-da-ana"));
    }
}
