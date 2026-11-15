package br.com.ecicla.api.disposal;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface DisposalRepository extends MongoRepository<Disposal, String> {

    List<Disposal> findByUserIdOrderByDisposedOnDescCreatedAtDesc(String userId);

    /**
     * Disposals with {@code from <= disposedOn < to} (days as {@code yyyy-MM-dd}). Written as a query because a
     * derived query cannot put two conditions on the same field.
     */
    @Query("{ 'disposedOn': { $gte: ?0, $lt: ?1 } }")
    List<Disposal> findDisposedBetween(String from, String to);

    void deleteByUserId(String userId);
}
