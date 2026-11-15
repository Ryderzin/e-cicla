package br.com.ecicla.api.device;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import br.com.ecicla.api.point.Material;

/**
 * An item a user registered to dispose of later (PB09): a whole device or loose waste such as batteries
 * ({@code kind}), with how many units ({@code quantity}, always 1 for a device). {@code category} uses the
 * same values as the materials accepted by collection points, so the site can warn when a point does not
 * take it (PB11). Records saved before {@code kind} and {@code quantity} existed have them null; read them
 * with {@link #itemKind()} and {@link #units()}.
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
        Instant updatedAt,
        ItemKind kind,
        Integer quantity) {

    public static final String COLLECTION = "devices";

    public ItemKind itemKind() {
        return ItemKind.of(kind, category);
    }

    public int units() {
        return quantity == null || quantity < 1 ? 1 : quantity;
    }
}
