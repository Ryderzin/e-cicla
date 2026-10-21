package br.com.ecicla.api.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecicla.api.auth.AuthRequests.PasswordConfirmation;
import br.com.ecicla.api.auth.AuthRequests.UpdateProfile;

/** The signed-in account. */
@RestController
@RequestMapping("/api/me")
public class AccountController {

    private final AccountService accounts;

    public AccountController(AccountService accounts) {
        this.accounts = accounts;
    }

    @GetMapping
    public AccountView me(Authenticated authenticated) {
        return AccountView.from(authenticated.user());
    }

    @PutMapping
    public AccountView update(Authenticated authenticated, @RequestBody UpdateProfile request) {
        return accounts.updateName(authenticated, request.name());
    }

    /** Deletes the account and its sessions; the password confirms it is really the owner. */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authenticated authenticated, @RequestBody PasswordConfirmation request) {
        accounts.delete(authenticated, request.password());
    }
}
