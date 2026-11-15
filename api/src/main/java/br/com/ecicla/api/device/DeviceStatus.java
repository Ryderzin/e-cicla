package br.com.ecicla.api.device;

public enum DeviceStatus {
    /** Registered and still waiting to be taken to a collection point. */
    REGISTERED,
    /** Already delivered to a collection point (there is a disposal for it). */
    DISPOSED
}
