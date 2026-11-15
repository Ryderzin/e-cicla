package br.com.ecicla.api.device;

import br.com.ecicla.api.point.Material;

/**
 * What the site sends to register or edit an item. {@code kind} separates whole devices from loose waste
 * such as batteries; when missing, batteries count as waste and the rest as devices. {@code quantity} is only
 * used for waste (a device is always one unit).
 */
public record DeviceInput(Material category, String description, DeviceDetails details, ItemKind kind,
        Integer quantity) {

    static final int DESCRIPTION_MIN = 2;
    static final int DESCRIPTION_MAX = 80;
    static final int QUANTITY_MAX = 500;

    /** Trimmed copy, or {@link IllegalArgumentException} saying what is wrong. */
    DeviceInput validated() {
        if (category == null) {
            throw new IllegalArgumentException("category is required");
        }
        ItemKind itemKind = ItemKind.of(kind, category);
        if (!itemKind.accepts(category)) {
            throw new IllegalArgumentException("category " + category + " is not valid for " + itemKind);
        }
        String text = description == null ? null : description.strip().replaceAll("\\s+", " ");
        if (text == null || text.length() < DESCRIPTION_MIN || text.length() > DESCRIPTION_MAX) {
            throw new IllegalArgumentException(
                    "description must have between " + DESCRIPTION_MIN + " and " + DESCRIPTION_MAX + " characters");
        }
        int units = 1;
        if (itemKind == ItemKind.WASTE) {
            units = quantity == null ? 1 : quantity;
            if (units < 1 || units > QUANTITY_MAX) {
                throw new IllegalArgumentException("quantity must be between 1 and " + QUANTITY_MAX);
            }
        }
        DeviceDetails clean = null;
        if (details != null) {
            Double screen = details.screenSizeInches();
            if (screen != null && (screen.isNaN() || screen < 1 || screen > 100)) {
                throw new IllegalArgumentException("screenSizeInches must be between 1 and 100");
            }
            clean = details.isEmpty() ? null : details;
        }
        return new DeviceInput(category, text, clean, itemKind, units);
    }
}
