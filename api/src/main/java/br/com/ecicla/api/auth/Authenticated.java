package br.com.ecicla.api.auth;

/**
 * The account making the current request, resolved from its session token. Controllers receive it as
 * a parameter on the routes that require signing in (see {@link AuthWebConfig}).
 */
public record Authenticated(User user, String tokenHash) {

    public boolean isAdmin() {
        return user.role() == Role.ADMIN;
    }
}
