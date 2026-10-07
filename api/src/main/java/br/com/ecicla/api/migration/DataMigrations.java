package br.com.ecicla.api.migration;

import java.time.Instant;
import java.util.List;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.ServiceArea;

/**
 * One-time changes to the data, applied when the API starts: locally and on the published site,
 * without anyone handling the database password. Each migration runs once per database; the
 * {@code migrations} collection records the ones already applied. Add new ones at the end, never
 * change or remove an applied one.
 */
@Component
@Order(5)
class DataMigrations implements ApplicationRunner {

    static final String COLLECTION = "migrations";
    static final String OUTSIDE_SERVICE_AREA = "2026-10-07-desativa-pontos-fora-do-estado-de-sp";

    private static final Logger log = LoggerFactory.getLogger(DataMigrations.class);

    private final MongoTemplate mongoTemplate;
    private final ServiceArea serviceArea;

    DataMigrations(MongoTemplate mongoTemplate, ServiceArea serviceArea) {
        this.mongoTemplate = mongoTemplate;
        this.serviceArea = serviceArea;
    }

    @Override
    public void run(ApplicationArguments args) {
        apply(OUTSIDE_SERVICE_AREA, this::deactivatePointsOutsideServiceArea);
    }

    private void apply(String id, Migration migration) {
        if (mongoTemplate.exists(Query.query(Criteria.where("_id").is(id)), COLLECTION)) {
            return;
        }
        String result = migration.run();
        mongoTemplate.insert(new Document("_id", id).append("appliedAt", Instant.now()).append("result", result), COLLECTION);
        log.info("Data migration {} applied: {}", id, result);
    }

    /** For now the platform covers only the state of São Paulo; points elsewhere leave the map but are kept. */
    String deactivatePointsOutsideServiceArea() {
        List<String> outside = mongoTemplate
                .find(Query.query(Criteria.where("status").is(PointStatus.ACTIVE)), CollectionPoint.class).stream()
                .filter(p -> !serviceArea.contains(p.location().getY(), p.location().getX()))
                .map(CollectionPoint::id)
                .toList();
        if (!outside.isEmpty()) {
            mongoTemplate.updateMulti(Query.query(Criteria.where("_id").in(outside)),
                    new Update().set("status", PointStatus.INACTIVE).set("updatedAt", Instant.now()), CollectionPoint.class);
        }
        return outside.size() + " points outside the state of São Paulo deactivated";
    }

    @FunctionalInterface
    interface Migration {
        /** Applies the change and describes what it did. */
        String run();
    }
}
