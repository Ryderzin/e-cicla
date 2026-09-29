package br.com.ecicla.api.point;

import java.time.Instant;
import java.util.List;

/** Everything the user needs to decide whether to take a device to the point. */
public record PointDetails(
        String id,
        String name,
        double latitude,
        double longitude,
        String address,
        boolean addressApproximate,
        List<Material> acceptedMaterials,
        String openingHours,
        String operator,
        String notes,
        SourceType sourceType,
        Instant updatedAt) {

    static PointDetails from(CollectionPoint point) {
        return new PointDetails(
                point.id(),
                point.name(),
                point.location().getY(),
                point.location().getX(),
                point.address(),
                point.address() != null && Boolean.TRUE.equals(point.addressApproximate()),
                point.acceptedMaterials(),
                point.openingHours(),
                point.operator(),
                point.notes(),
                point.source() == null ? null : point.source().type(),
                point.updatedAt());
    }
}
