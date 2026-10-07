package br.com.ecicla.api.point;

import java.util.List;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.Metrics;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.stereotype.Service;

@Service
public class PointService {

    /** Farther than this, a point is no longer "near" anyone; it also bounds the search. */
    static final Distance MAX_NEAR_DISTANCE = new Distance(500, Metrics.KILOMETERS);

    private final CollectionPointRepository repository;

    public PointService(CollectionPointRepository repository) {
        this.repository = repository;
    }

    public List<PointSummary> listActive(Optional<BoundingBox> area) {
        List<CollectionPoint> points = area
                .map(box -> repository.findByStatusAndLocationWithin(PointStatus.ACTIVE, box.toPolygon()))
                .orElseGet(() -> repository.findByStatus(PointStatus.ACTIVE));
        return points.stream().map(PointSummary::from).toList();
    }

    public Optional<PointDetails> findActive(String id) {
        // Ids are ObjectIds; anything else cannot exist, so it is simply "not found".
        if (!ObjectId.isValid(id)) {
            return Optional.empty();
        }
        return repository.findByIdAndStatus(id, PointStatus.ACTIVE).map(PointDetails::from);
    }

    /**
     * Active points nearest to a location, nearest first. When an area is given, only points inside it
     * count (the map only shows that area).
     */
    public List<NearbyPoint> findNearest(double latitude, double longitude, int limit, Optional<BoundingBox> area) {
        GeoJsonPoint origin = new GeoJsonPoint(longitude, latitude);
        return repository.findActiveNear(origin, MAX_NEAR_DISTANCE).getContent().stream()
                .filter(result -> area.map(box -> box.contains(result.getContent().location())).orElse(true))
                .limit(limit)
                .map(result -> NearbyPoint.from(result.getContent(), toMeters(result.getDistance())))
                .toList();
    }

    private static long toMeters(Distance distance) {
        return Math.round(distance.in(Metrics.KILOMETERS).getValue() * 1000);
    }
}
