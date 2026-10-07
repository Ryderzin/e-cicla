package br.com.ecicla.api.point;

import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.NearQuery;
import org.springframework.data.mongodb.core.query.Query;

/** Spring Data adds this to {@link CollectionPointRepository} (implementation of a repository fragment). */
class NearbyPointQueriesImpl implements NearbyPointQueries {

    private final MongoTemplate mongoTemplate;

    NearbyPointQueriesImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public GeoResults<CollectionPoint> findActiveNear(GeoJsonPoint origin, Distance maxDistance) {
        // $geoNear on the 2dsphere index; distances come back in the metric of maxDistance.
        NearQuery near = NearQuery.near(origin)
                .spherical(true)
                .maxDistance(maxDistance)
                .query(Query.query(Criteria.where("status").is(PointStatus.ACTIVE)));
        return mongoTemplate.geoNear(near, CollectionPoint.class);
    }
}
