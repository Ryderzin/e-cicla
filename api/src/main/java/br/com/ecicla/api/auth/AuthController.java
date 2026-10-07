package br.com.ecicla.api.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecicla.api.auth.AuthRequests.Login;
import br.com.ecicla.api.auth.AuthRequests.Register;
import br.com.ecicla.api.auth.AuthRequests.SessionResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AccountService accounts;
    private final SessionService sessions;

    public AuthController(AccountService accounts, SessionService sessions) {
        this.accounts = accounts;
        this.sessions = sessions;
    }

    /** Creates an account (role USER) and signs it in. */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResponse register(@RequestBody Register request) {
        return accounts.register(request);
    }

    @PostMapping("/login")
    public SessionResponse login(@RequestBody Login request) {
        return accounts.login(request);
    }

    /** Ends the session of the token that made the request. */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(Authenticated authenticated) {
        sessions.revoke(authenticated);
    }
}
