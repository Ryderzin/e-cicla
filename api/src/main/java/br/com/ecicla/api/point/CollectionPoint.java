package br.com.ecicla.api.point;

import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * An electronic waste collection point. {@code location} is a GeoJSON point, so its coordinates are
 * stored as [longitude, latitude].
 */
@Document(CollectionPoint.COLLECTION)
public record CollectionPoint(
        @Id String id,
        String name,
        GeoJsonPoint location,
        String address,
        List<Material> acceptedMaterials,
        String openingHours,
        String operator,
        String notes,
        PointSource source,
        PointStatus status,
        Instant updatedAt) {

    public static final String COLLECTION = "collection_points";
}
