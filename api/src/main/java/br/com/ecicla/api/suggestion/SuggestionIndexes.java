package br.com.ecicla.api.suggestion;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.stereotype.Component;

/** Creates indexes on {@code suggestions} for user history and administrator moderation queues. */
@Component
@Order(0)
class SuggestionIndexes implements ApplicationRunner {

    private final MongoTemplate mongoTemplate;

    SuggestionIndexes(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        IndexOperations indexes = mongoTemplate.indexOps(Suggestion.class);
        indexes.createIndex(new Index().on("userId", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC));
        indexes.createIndex(new Index().on("status", Sort.Direction.ASC).on("createdAt", Sort.Direction.ASC));
    }
}
