package br.com.ecicla.api.suggestion;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface SuggestionRepository extends MongoRepository<Suggestion, String> {

    List<Suggestion> findByUserIdOrderByCreatedAtDesc(String userId);

    List<Suggestion> findByStatusOrderByCreatedAtAsc(SuggestionStatus status);

    List<Suggestion> findAllByOrderByCreatedAtDesc();
}
