package br.com.ecicla.api.point;

import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * An electronic waste collection point. {@code location} is a GeoJSON point, so its coordinates are
 * stored as [longitude, latitude]. {@code addressApproximate} is true when the source had no address
 * and it was looked up from the coordinates ({@code address} stays null if nothing was found there).
 * {@code adminEditedAt} is set when an administrator changes the point; the import then leaves it alone.
 */
@Document(CollectionPoint.COLLECTION)
public record CollectionPoint(
        @Id String id,
        String name,
        GeoJsonPoint location,
        String address,
        Boolean addressApproximate,
        List<Material> acceptedMaterials,
        String openingHours,
        String operator,
        String notes,
        PointSource source,
        PointStatus status,
        Instant updatedAt,
        Instant adminEditedAt) {

    public static final String COLLECTION = "collection_points";
}
