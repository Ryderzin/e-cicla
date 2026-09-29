package br.com.ecicla.api.importer;

import java.util.ArrayList;
import java.util.List;

import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.SourceType;

/**
 * A point registered by hand in {@code seed/points.json}. See {@code docs/pontos-manuais.md} for the
 * file format.
 */
record SeedPoint(
        String externalId,
        String name,
        Double latitude,
        Double longitude,
        String address,
        List<String> acceptedMaterials,
        String openingHours,
        String operator,
        String notes) {

    static final String ID_PREFIX = "manual/";

    /**
     * @throws IllegalArgumentException describing the first problem found in the entry
     */
    ImportedPoint toImportedPoint() {
        if (externalId == null || !externalId.startsWith(ID_PREFIX) || externalId.length() == ID_PREFIX.length()) {
            throw new IllegalArgumentException("externalId must look like \"manual/some-name\"");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name is required");
        }
        if (latitude == null || longitude == null
                || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("latitude and longitude are required and must be valid");
        }
        if (acceptedMaterials == null || acceptedMaterials.isEmpty()) {
            throw new IllegalArgumentException("acceptedMaterials must list at least one category");
        }
        List<Material> materials = new ArrayList<>();
        for (String material : acceptedMaterials) {
            try {
                materials.add(Material.valueOf(material));
            } catch (IllegalArgumentException | NullPointerException e) {
                throw new IllegalArgumentException("unknown material \"" + material + "\"");
            }
        }
        return new ImportedPoint(
                SourceType.MANUAL,
                externalId,
                name.trim(),
                longitude,
                latitude,
                address,
                materials,
                openingHours,
                operator,
                notes);
    }
}
