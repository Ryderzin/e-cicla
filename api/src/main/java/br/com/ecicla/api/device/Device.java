package br.com.ecicla.api.device;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import br.com.ecicla.api.point.Material;

/**
 * A device a user registered to dispose of later (PB09). {@code category} uses the same values as the
 * materials accepted by collection points, so the site can warn when a point does not take it (PB11).
 */
@Document(Device.COLLECTION)
public record Device(
        @Id String id,
        String userId,
        Material category,
        String description,
        DeviceDetails details,
        DeviceStatus status,
        Instant createdAt,
        Instant updatedAt) {

    public static final String COLLECTION = "devices";
}
