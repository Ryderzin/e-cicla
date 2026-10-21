package br.com.ecicla.api.auth;

/** Request and response bodies of the account endpoints. */
final class AuthRequests {

    private AuthRequests() {
    }

    record Register(String name, String email, String password, Boolean acceptPrivacy) {
    }

    record Login(String email, String password) {
    }

    record PasswordConfirmation(String password) {
    }

    record UpdateProfile(String name) {
    }

    record SessionResponse(String token, AccountView account) {
    }
}
