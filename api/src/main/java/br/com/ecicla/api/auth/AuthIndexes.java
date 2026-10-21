package br.com.ecicla.api.auth;

import java.time.Duration;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

/**
 * Creates the account indexes on startup: unique e-mail, unique token hash, sessions by user, and a
 * TTL index that makes MongoDB delete sessions once {@code expiresAt} has passed.
 */
@Component
@Order(1)
class AuthIndexes implements ApplicationRunner {

    private final MongoTemplate mongoTemplate;

    AuthIndexes(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        var userIndexes = mongoTemplate.indexOps(User.class);
        userIndexes.createIndex(new Index().on("email", Sort.Direction.ASC).unique());
        userIndexes.createIndex(new Index().on("passwordReset.tokenHash", Sort.Direction.ASC).sparse());

        var sessions = mongoTemplate.indexOps(Session.class);
        sessions.createIndex(new Index().on("tokenHash", Sort.Direction.ASC).unique());
        sessions.createIndex(new Index().on("userId", Sort.Direction.ASC));
        sessions.createIndex(new Index().on("expiresAt", Sort.Direction.ASC).expire(Duration.ZERO));
    }
}
