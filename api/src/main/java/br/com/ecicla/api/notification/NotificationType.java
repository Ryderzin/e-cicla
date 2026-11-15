package br.com.ecicla.api.notification;

public enum NotificationType {
    SUGGESTION_APPROVED,
    SUGGESTION_REJECTED,
    /** Devices registered more than 30 days ago and not delivered yet. */
    DEVICE_REMINDER
}
