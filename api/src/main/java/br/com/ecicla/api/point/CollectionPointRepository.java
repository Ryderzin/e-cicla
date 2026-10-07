package br.com.ecicla.api.point;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.core.geo.GeoJsonPolygon;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CollectionPointRepository extends MongoRepository<CollectionPoint, String>, NearbyPointQueries {

    List<CollectionPoint> findByStatus(PointStatus status);

    /** Uses {@code $geoWithin} with a GeoJSON polygon, backed by the 2dsphere index on location. */
    List<CollectionPoint> findByStatusAndLocationWithin(PointStatus status, GeoJsonPolygon area);

    Optional<CollectionPoint> findByIdAndStatus(String id, PointStatus status);
}
