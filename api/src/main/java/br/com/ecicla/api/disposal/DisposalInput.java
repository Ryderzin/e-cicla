package br.com.ecicla.api.disposal;

/**
 * Registering a delivery. {@code disposedOn} is {@code yyyy-MM-dd} (today when empty);
 * {@code confirmNotAccepted} must be true to register a device at a point that does not say it accepts it.
 */
public record DisposalInput(String deviceId, String pointId, String disposedOn, Boolean confirmNotAccepted) {
}
