package br.com.ecicla.api.device;

import java.util.Set;

import br.com.ecicla.api.point.Material;

/**
 * What the user is getting rid of: a whole device, or loose waste (batteries, cables, chargers), which is
 * counted in units. Each kind accepts only some categories.
 */
public enum ItemKind {
    /** A whole device: phone, computer, small appliance or another electronic device. */
    DEVICE(Set.of(Material.MOBILE_PHONES, Material.COMPUTERS, Material.SMALL_APPLIANCES, Material.ELECTRICAL_ITEMS)),
    /** Loose waste counted in units: batteries, or cables, chargers and other accessories. */
    WASTE(Set.of(Material.BATTERIES, Material.ELECTRICAL_ITEMS));

    private final Set<Material> categories;

    ItemKind(Set<Material> categories) {
        this.categories = categories;
    }

    public boolean accepts(Material category) {
        return categories.contains(category);
    }

    /** Records saved before the kind existed: batteries were waste, everything else a device. */
    public static ItemKind of(ItemKind stored, Material category) {
        if (stored != null) {
            return stored;
        }
        return category == Material.BATTERIES ? WASTE : DEVICE;
    }
}
