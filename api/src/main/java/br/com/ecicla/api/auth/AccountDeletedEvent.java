package br.com.ecicla.api.auth;

/**
 * Published after an account is deleted, so every module deletes what belonged to it (PB23): devices,
 * disposals, notices and notice preferences.
 */
public record AccountDeletedEvent(String userId) {
}
