package br.com.ecicla.api.point;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexType;
import org.springframework.data.mongodb.core.index.GeospatialIndex;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.stereotype.Component;

/**
 * Creates the collection indexes on startup, before the import runs:
 * 2dsphere on {@code location} (geo queries) and unique on {@code source.externalId} (no duplicates).
 */
@Component
@Order(0)
class CollectionPointIndexes implements ApplicationRunner {

    private final MongoTemplate mongoTemplate;

    CollectionPointIndexes(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        IndexOperations indexes = mongoTemplate.indexOps(CollectionPoint.class);
        indexes.createIndex(new GeospatialIndex("location").typed(GeoSpatialIndexType.GEO_2DSPHERE));
        indexes.createIndex(new Index().on("source.externalId", Sort.Direction.ASC).unique());
    }
}
