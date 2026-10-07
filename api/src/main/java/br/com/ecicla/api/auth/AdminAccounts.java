package br.com.ecicla.api.auth;

import java.time.Instant;
import java.util.Arrays;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Keeps the ADMIN profile in line with {@code app.admin.emails} (variable {@code APP_ADMIN_EMAILS}) on
 * every startup: accounts with a listed e-mail become ADMIN and administrators no longer listed go
 * back to USER. Accounts are never created here. Since e-mails are not verified, a listed e-mail must
 * already have an account created by its owner; otherwise someone else could create it and become
 * administrator on the next restart, so such e-mails are only reported in the log.
 */
@Component
@Order(2)
class AdminAccounts implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminAccounts.class);

    private final UserRepository users;
    private final Set<String> adminEmails;

    AdminAccounts(UserRepository users, @Value("${app.admin.emails}") String[] adminEmails) {
        this.users = users;
        this.adminEmails = Arrays.stream(adminEmails)
                .map(AccountService::normalizeEmail)
                .filter(Objects::nonNull)
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public void run(ApplicationArguments args) {
        Instant now = Instant.now();
        for (User admin : users.findByRole(Role.ADMIN)) {
            if (!adminEmails.contains(admin.email())) {
                users.save(admin.withRole(Role.USER, now));
                log.info("Account {} is no longer an administrator (not in APP_ADMIN_EMAILS)", admin.id());
            }
        }
        for (String email : adminEmails) {
            users.findByEmail(email).ifPresentOrElse(user -> {
                if (user.role() != Role.ADMIN) {
                    users.save(user.withRole(Role.ADMIN, now));
                    log.info("Account {} is now an administrator", user.id());
                }
            }, () -> log.warn("APP_ADMIN_EMAILS lists an e-mail without an account; create the account on the site "
                    + "first, then restart the API"));
        }
    }
}
