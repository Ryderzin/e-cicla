package br.com.ecicla.api.notification;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface NotificationPreferencesRepository extends MongoRepository<NotificationPreferences, String> {
}
