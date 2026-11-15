package br.com.ecicla.api.device;

import br.com.ecicla.api.point.Material;

/** What the site sends to register or edit a device. */
public record DeviceInput(Material category, String description, DeviceDetails details) {

    static final int DESCRIPTION_MIN = 2;
    static final int DESCRIPTION_MAX = 80;

    /** Trimmed copy, or {@link IllegalArgumentException} saying what is wrong. */
    DeviceInput validated() {
        if (category == null) {
            throw new IllegalArgumentException("category is required");
        }
        String text = description == null ? null : description.strip().replaceAll("\\s+", " ");
        if (text == null || text.length() < DESCRIPTION_MIN || text.length() > DESCRIPTION_MAX) {
            throw new IllegalArgumentException(
                    "description must have between " + DESCRIPTION_MIN + " and " + DESCRIPTION_MAX + " characters");
        }
        DeviceDetails clean = null;
        if (details != null) {
            Double screen = details.screenSizeInches();
            if (screen != null && (screen.isNaN() || screen < 1 || screen > 100)) {
                throw new IllegalArgumentException("screenSizeInches must be between 1 and 100");
            }
            clean = details.isEmpty() ? null : details;
        }
        return new DeviceInput(category, text, clean);
    }
}
