package br.com.ecicla.api.notification;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface NotificationRepository extends MongoRepository<Notification, String> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable page);

    List<Notification> findByUserIdAndReadFalse(String userId);

    long countByUserIdAndReadFalse(String userId);

    boolean existsByUserIdAndTypeAndCreatedAtAfter(String userId, NotificationType type, Instant after);

    void deleteByUserId(String userId);
}
