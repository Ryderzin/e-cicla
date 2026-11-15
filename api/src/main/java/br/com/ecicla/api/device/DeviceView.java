package br.com.ecicla.api.device;

import java.time.Instant;

import br.com.ecicla.api.point.Material;

public record DeviceView(
        String id,
        Material category,
        String description,
        DeviceDetails details,
        DeviceStatus status,
        Instant createdAt,
        Instant updatedAt) {

    static DeviceView from(Device device) {
        return new DeviceView(device.id(), device.category(), device.description(), device.details(), device.status(),
                device.createdAt(), device.updatedAt());
    }
}
