package br.com.ecicla.api.point;

import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;

/** Proximity search, written by hand: the query Spring Data derives from a method name is rejected by MongoDB 8. */
public interface NearbyPointQueries {

    /** Active points up to {@code maxDistance} from {@code origin}, nearest first, each with its distance. */
    GeoResults<CollectionPoint> findActiveNear(GeoJsonPoint origin, Distance maxDistance);
}
