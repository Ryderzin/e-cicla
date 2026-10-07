package br.com.ecicla.api.admin;

import java.time.Instant;
import java.util.List;

import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.SourceType;

/** Everything an administrator sees about a point, active or not. */
public record AdminPointView(
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
        PointStatus status,
        Instant adminEditedAt,
        Instant updatedAt) {

    static AdminPointView from(CollectionPoint point) {
        return new AdminPointView(
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
                point.status(),
                point.adminEditedAt(),
                point.updatedAt());
    }
}
