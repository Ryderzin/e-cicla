package br.com.ecicla.api.auth;

/** What the site may know about the signed-in account (never the password hash). */
public record AccountView(String id, String name, String email, Role role) {

    static AccountView from(User user) {
        return new AccountView(user.id(), user.name(), user.email(), user.role());
    }
}
