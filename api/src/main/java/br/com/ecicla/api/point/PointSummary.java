package br.com.ecicla.api.point;

import java.util.List;

/** Lightweight view of a point, enough to draw a marker on the map. */
public record PointSummary(
        String id,
        String name,
        double latitude,
        double longitude,
        List<Material> acceptedMaterials) {

    static PointSummary from(CollectionPoint point) {
        return new PointSummary(
                point.id(),
                point.name(),
                point.location().getY(),
                point.location().getX(),
                point.acceptedMaterials());
    }
}
