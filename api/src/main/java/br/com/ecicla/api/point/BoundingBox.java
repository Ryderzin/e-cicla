package br.com.ecicla.api.point;

import java.util.Optional;
import java.util.stream.Stream;

import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.core.geo.GeoJsonPolygon;

/** Rectangular area of the map, in degrees. */
public record BoundingBox(double minLng, double minLat, double maxLng, double maxLat) {

    public BoundingBox {
        if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) {
            throw new IllegalArgumentException("Coordinates out of range");
        }
        if (minLng >= maxLng || minLat >= maxLat) {
            throw new IllegalArgumentException("Minimum values must be lower than maximum values");
        }
        // Areas this wide stop being a simple rectangle on the globe and MongoDB rejects them.
        if (maxLng - minLng >= 180) {
            throw new IllegalArgumentException("Area too wide; omit the parameters to list every point");
        }
    }

    /**
     * Builds the area from optional query parameters: all four or none must be given.
     *
     * @throws IllegalArgumentException when only some parameters are given or they are invalid
     */
    public static Optional<BoundingBox> fromParams(Double minLng, Double minLat, Double maxLng, Double maxLat) {
        long given = Stream.of(minLng, minLat, maxLng, maxLat).filter(v -> v != null).count();
        if (given == 0) {
            return Optional.empty();
        }
        if (given < 4) {
            throw new IllegalArgumentException("minLng, minLat, maxLng and maxLat must be given together");
        }
        return Optional.of(new BoundingBox(minLng, minLat, maxLng, maxLat));
    }

    public boolean contains(Point point) {
        return point.getX() >= minLng && point.getX() <= maxLng && point.getY() >= minLat && point.getY() <= maxLat;
    }

    public GeoJsonPolygon toPolygon() {
        Point southWest = new Point(minLng, minLat);
        return new GeoJsonPolygon(
                southWest,
                new Point(maxLng, minLat),
                new Point(maxLng, maxLat),
                new Point(minLng, maxLat),
                southWest);
    }
}
