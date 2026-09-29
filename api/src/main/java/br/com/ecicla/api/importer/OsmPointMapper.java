package br.com.ecicla.api.importer;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import br.com.ecicla.api.importer.OverpassResponse.Element;
import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.SourceType;

/** Converts OpenStreetMap elements returned by Overpass into {@link ImportedPoint}s. */
final class OsmPointMapper {

    private static final Logger log = LoggerFactory.getLogger(OsmPointMapper.class);

    private static final Map<String, Material> MATERIAL_TAGS = new LinkedHashMap<>();

    static {
        MATERIAL_TAGS.put("recycling:batteries", Material.BATTERIES);
        MATERIAL_TAGS.put("recycling:computers", Material.COMPUTERS);
        MATERIAL_TAGS.put("recycling:mobile_phones", Material.MOBILE_PHONES);
        MATERIAL_TAGS.put("recycling:electrical_items", Material.ELECTRICAL_ITEMS);
        MATERIAL_TAGS.put("recycling:small_appliances", Material.SMALL_APPLIANCES);
    }

    private OsmPointMapper() {
    }

    /**
     * Returns the point, or empty when the element has no coordinates or accepts no electronic
     * waste category (both are logged).
     */
    static Optional<ImportedPoint> toImportedPoint(Element element) {
        String externalId = element.type() + "/" + element.id();
        Map<String, String> tags = element.tags() == null ? Map.of() : element.tags();

        Double lat = element.lat();
        Double lon = element.lon();
        if ((lat == null || lon == null) && element.center() != null) {
            lat = element.center().lat();
            lon = element.center().lon();
        }
        if (lat == null || lon == null) {
            log.warn("Skipping {}: no coordinates", externalId);
            return Optional.empty();
        }

        List<Material> materials = materialsFrom(tags);
        if (materials.isEmpty()) {
            log.warn("Skipping {}: no electronic waste category", externalId);
            return Optional.empty();
        }

        return Optional.of(new ImportedPoint(
                SourceType.OSM,
                externalId,
                firstPresent(text(tags, "name"), text(tags, "brand")),
                lon,
                lat,
                addressFrom(tags),
                materials,
                text(tags, "opening_hours"),
                text(tags, "operator"),
                text(tags, "description")));
    }

    /** Categories whose {@code recycling:*} tag is {@code yes}, in a stable order. */
    static List<Material> materialsFrom(Map<String, String> tags) {
        List<Material> materials = new ArrayList<>();
        MATERIAL_TAGS.forEach((tag, material) -> {
            if ("yes".equalsIgnoreCase(text(tags, tag))) {
                materials.add(material);
            }
        });
        return materials;
    }

    /** Formats {@code addr:*} tags as "Rua Exemplo, 100 - Bairro, Cidade - UF". */
    static String addressFrom(Map<String, String> tags) {
        String full = text(tags, "addr:full");
        if (full != null) {
            return full;
        }
        return AddressFormat.format(
                text(tags, "addr:street"),
                text(tags, "addr:housenumber"),
                text(tags, "addr:suburb"),
                text(tags, "addr:city"),
                text(tags, "addr:state"));
    }

    private static String text(Map<String, String> tags, String key) {
        String value = tags.get(key);
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String firstPresent(String first, String second) {
        return first != null ? first : second;
    }
}
