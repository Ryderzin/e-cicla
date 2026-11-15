package br.com.ecicla.api.common;

import java.time.Duration;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

import br.com.ecicla.api.device.Device;
import br.com.ecicla.api.disposal.Disposal;
import br.com.ecicla.api.notification.Notification;

/**
 * Indexes of the Sprint 5 collections, created on startup: devices and disposals by user, disposals by day
 * (for the monthly chart), notices by user and a TTL index that makes MongoDB delete notices after 180 days.
 */
@Component
@Order(3)
class ActivityIndexes implements ApplicationRunner {

    private final MongoTemplate mongoTemplate;

    ActivityIndexes(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        mongoTemplate.indexOps(Device.class).createIndex(
                new Index().on("userId", Sort.Direction.ASC).on("status", Sort.Direction.ASC));

        var disposals = mongoTemplate.indexOps(Disposal.class);
        disposals.createIndex(new Index().on("userId", Sort.Direction.ASC).on("disposedOn", Sort.Direction.DESC));
        disposals.createIndex(new Index().on("disposedOn", Sort.Direction.ASC));

        var notifications = mongoTemplate.indexOps(Notification.class);
        notifications.createIndex(new Index().on("userId", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC));
        notifications.createIndex(new Index().on("createdAt", Sort.Direction.ASC).named("createdAt_ttl")
                .expire(Duration.ofDays(180)));
    }
}
