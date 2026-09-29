package br.com.ecicla.api.point;

import java.time.Instant;

/**
 * Origin of a collection point. {@code externalId} is unique across the collection and is the key
 * used by the import to update existing points instead of duplicating them (e.g. {@code node/123},
 * {@code way/456}, {@code manual/ecoponto-centro}).
 */
public record PointSource(SourceType type, String externalId, Instant importedAt) {
}
