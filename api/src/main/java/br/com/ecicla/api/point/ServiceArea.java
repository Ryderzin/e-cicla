package br.com.ecicla.api.point;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The area the platform covers for now: the state of São Paulo, from its OpenStreetMap boundary
 * (resources/area/sao-paulo.geojson). Points outside it are kept in the database, but inactive.
 */
@Component
public class ServiceArea {

    /** Each polygon is a list of rings (the outer one first, then holes); each ring is a list of [lng, lat]. */
    private final List<List<double[][]>> polygons;

    public ServiceArea(ObjectMapper objectMapper, @Value("${app.service-area.file}") Resource file) throws IOException {
        try (InputStream in = file.getInputStream()) {
            this.polygons = parse(objectMapper.readTree(in));
        }
    }

    ServiceArea(List<List<double[][]>> polygons) {
        this.polygons = polygons;
    }

    public boolean contains(double latitude, double longitude) {
        for (List<double[][]> rings : polygons) {
            if (insideRing(longitude, latitude, rings.getFirst())
                    && rings.stream().skip(1).noneMatch(hole -> insideRing(longitude, latitude, hole))) {
                return true;
            }
        }
        return false;
    }

    /** Ray casting: a horizontal ray from the point crosses the ring's edges an odd number of times when inside. */
    private static boolean insideRing(double x, double y, double[][] ring) {
        boolean inside = false;
        for (int i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            double xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
            if ((yi > y) != (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    /** Reads a GeoJSON Feature or geometry with a Polygon or MultiPolygon. */
    static List<List<double[][]>> parse(JsonNode json) {
        JsonNode geometry = json.has("geometry") ? json.get("geometry") : json;
        String type = geometry.path("type").asText();
        JsonNode coordinates = geometry.path("coordinates");
        List<List<double[][]>> polygons = new ArrayList<>();
        switch (type) {
            case "Polygon" -> polygons.add(rings(coordinates));
            case "MultiPolygon" -> coordinates.forEach(polygon -> polygons.add(rings(polygon)));
            default -> throw new IllegalArgumentException("Expected a Polygon or MultiPolygon, got " + type);
        }
        return polygons;
    }

    private static List<double[][]> rings(JsonNode polygon) {
        List<double[][]> rings = new ArrayList<>();
        for (JsonNode ring : polygon) {
            double[][] points = new double[ring.size()][];
            for (int i = 0; i < ring.size(); i++) {
                points[i] = new double[] {ring.get(i).get(0).asDouble(), ring.get(i).get(1).asDouble()};
            }
            rings.add(points);
        }
        return rings;
    }
}
