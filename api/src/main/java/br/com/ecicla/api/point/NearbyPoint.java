package br.com.ecicla.api.point;

import java.util.List;

/** A point near a location, with the straight-line distance to it. */
public record NearbyPoint(
        String id,
        String name,
        double latitude,
        double longitude,
        List<Material> acceptedMaterials,
        long distanceMeters) {

    static NearbyPoint from(CollectionPoint point, long distanceMeters) {
        return new NearbyPoint(
                point.id(),
                point.name(),
                point.location().getY(),
                point.location().getX(),
                point.acceptedMaterials(),
                distanceMeters);
    }
}
