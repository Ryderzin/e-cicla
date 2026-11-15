package br.com.ecicla.api.device;

import java.time.Instant;
import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface DeviceRepository extends MongoRepository<Device, String> {

    List<Device> findByUserIdOrderByCreatedAtDesc(String userId);

    boolean existsByUserIdAndStatusAndCreatedAtBefore(String userId, DeviceStatus status, Instant before);

    void deleteByUserId(String userId);
}
