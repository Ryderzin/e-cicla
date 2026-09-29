package br.com.ecicla.api.importer;

import java.util.List;
import java.util.Map;

/**
 * Overpass API JSON output ({@code [out:json]}). Nodes carry {@code lat}/{@code lon}; ways and
 * relations carry {@code center} when the query uses {@code out center}.
 */
public record OverpassResponse(List<Element> elements, String remark) {

    public record Element(String type, long id, Double lat, Double lon, Center center, Map<String, String> tags) {
    }

    public record Center(Double lat, Double lon) {
    }
}
