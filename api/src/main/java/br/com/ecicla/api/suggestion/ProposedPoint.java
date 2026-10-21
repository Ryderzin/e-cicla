package br.com.ecicla.api.suggestion;

import java.util.List;

import br.com.ecicla.api.admin.PointInput;
import br.com.ecicla.api.point.Material;

/** Point fields proposed in a user suggestion. */
public record ProposedPoint(
        String name,
        double latitude,
        double longitude,
        String address,
        List<Material> acceptedMaterials,
        String openingHours,
        String operator,
        String notes) {

    public static ProposedPoint from(PointInput valid) {
        return new ProposedPoint(
                valid.name(),
                valid.latitude(),
                valid.longitude(),
                valid.address(),
                valid.acceptedMaterials(),
                valid.openingHours(),
                valid.operator(),
                valid.notes());
    }

    public PointInput toPointInput() {
        return new PointInput(
                name,
                latitude,
                longitude,
                address,
                acceptedMaterials,
                openingHours,
                operator,
                notes);
    }
}
