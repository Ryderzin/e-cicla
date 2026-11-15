package br.com.ecicla.api.notification;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecicla.api.auth.Authenticated;

/** The signed-in user's notices and which of them also go by e-mail (PB19). */
@RestController
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping("/api/notifications")
    public NotificationView.Inbox inbox(Authenticated authenticated) {
        return service.inbox(authenticated);
    }

    @PutMapping("/api/notifications/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(Authenticated authenticated, @PathVariable String id) {
        if (!service.markRead(authenticated, id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found");
        }
    }

    @PutMapping("/api/notifications/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead(Authenticated authenticated) {
        service.markAllRead(authenticated);
    }

    @GetMapping("/api/me/notification-preferences")
    public NotificationView.Preferences preferences(Authenticated authenticated) {
        return service.preferences(authenticated);
    }

    @PutMapping("/api/me/notification-preferences")
    public NotificationView.Preferences updatePreferences(Authenticated authenticated,
            @RequestBody NotificationView.Preferences input) {
        return service.updatePreferences(authenticated, input);
    }
}
