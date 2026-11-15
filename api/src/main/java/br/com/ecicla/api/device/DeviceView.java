package br.com.ecicla.api.device;

import java.time.Instant;

import br.com.ecicla.api.point.Material;

public record DeviceView(
        String id,
        ItemKind kind,
        Material category,
        String description,
        int quantity,
        DeviceDetails details,
        DeviceStatus status,
        Instant createdAt,
        Instant updatedAt) {

    static DeviceView from(Device device) {
        return new DeviceView(device.id(), device.itemKind(), device.category(), device.description(), device.units(),
                device.details(), device.status(), device.createdAt(), device.updatedAt());
    }
}
