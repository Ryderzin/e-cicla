package br.com.ecicla.api.importer;

import java.util.List;

import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.SourceType;

/** A point read from an external source, already converted to the system's categories. */
public record ImportedPoint(
        SourceType sourceType,
        String externalId,
        String name,
        double longitude,
        double latitude,
        String address,
        List<Material> acceptedMaterials,
        String openingHours,
        String operator,
        String notes) {
}
