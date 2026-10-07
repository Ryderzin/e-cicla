package br.com.ecicla.api.admin;

import java.util.LinkedHashSet;
import java.util.List;

import br.com.ecicla.api.point.Material;

/**
 * A point as typed by an administrator. {@link #validated()} trims the texts, turns blank texts into
 * null and rejects anything the map could not show.
 */
public record PointInput(
        String name,
        Double latitude,
        Double longitude,
        String address,
        List<Material> acceptedMaterials,
        String openingHours,
        String operator,
        String notes) {

    static final int NAME_MAX = 120;
    static final int ADDRESS_MAX = 200;
    static final int OPENING_HOURS_MAX = 200;
    static final int OPERATOR_MAX = 120;
    static final int NOTES_MAX = 1000;

    /**
     * @throws IllegalArgumentException with the reason, when the input is not acceptable
     */
    PointInput validated() {
        if (latitude == null || longitude == null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("latitude and longitude are required and must be valid coordinates");
        }
        if (acceptedMaterials == null || acceptedMaterials.isEmpty() || acceptedMaterials.contains(null)) {
            throw new IllegalArgumentException("at least one accepted material is required");
        }
        return new PointInput(
                text("name", name, NAME_MAX),
                latitude,
                longitude,
                text("address", address, ADDRESS_MAX),
                List.copyOf(new LinkedHashSet<>(acceptedMaterials)),
                text("openingHours", openingHours, OPENING_HOURS_MAX),
                text("operator", operator, OPERATOR_MAX),
                text("notes", notes, NOTES_MAX));
    }

    private static String text(String field, String value, int max) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.strip();
        if (trimmed.length() > max) {
            throw new IllegalArgumentException(field + " must have at most " + max + " characters");
        }
        return trimmed;
    }
}
