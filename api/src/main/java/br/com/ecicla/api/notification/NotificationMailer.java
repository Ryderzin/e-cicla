package br.com.ecicla.api.notification;

import java.time.Clock;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import br.com.ecicla.api.auth.EmailService;
import br.com.ecicla.api.auth.UserRepository;

/**
 * Sends a notice by e-mail in the background, so an administrator approving a suggestion does not wait
 * for the e-mail service. A failure only goes to the log; the notice on the site is already saved.
 */
@Component
public class NotificationMailer {

    private final EmailService email;
    private final UserRepository users;
    private final NotificationRepository notifications;
    private final Clock clock;
    private final String frontendUrl;

    public NotificationMailer(EmailService email, UserRepository users, NotificationRepository notifications,
            Clock clock, @Value("${app.frontend.url:http://localhost:5173}") String frontendUrl) {
        this.email = email;
        this.users = users;
        this.notifications = notifications;
        this.clock = clock;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    @Async
    public void send(Notification notification) {
        users.findById(notification.userId()).ifPresent(user -> {
            email.sendNotification(user.email(), user.name(), notification.title(), notification.message(),
                    frontendUrl + notification.link());
            notifications.save(new Notification(notification.id(), notification.userId(), notification.type(),
                    notification.title(), notification.message(), notification.link(), notification.read(),
                    Instant.now(clock), notification.createdAt()));
        });
    }
}
