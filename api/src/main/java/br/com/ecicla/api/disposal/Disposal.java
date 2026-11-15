package br.com.ecicla.api.disposal;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import br.com.ecicla.api.device.ItemKind;
import br.com.ecicla.api.point.Material;

/**
 * An item delivered to a collection point (PB15). The item and point names are copied when the disposal
 * is registered, so the history and the chart still work if the point is deleted or the item edited.
 * {@code disposedOn} is the calendar day in São Paulo, as {@code yyyy-MM-dd}, so months group by its prefix
 * regardless of the server's time zone. {@code pointAccepted} records whether the point said it accepted
 * that kind of item (the user may confirm a delivery anyway, PB11). {@code itemKind} and {@code quantity}
 * may be null in records saved before they existed: read them with {@link #kind()} and {@link #units()}.
 */
@Document(Disposal.COLLECTION)
public record Disposal(
        @Id String id,
        String userId,
        String deviceId,
        Material deviceCategory,
        String deviceDescription,
        String pointId,
        String pointName,
        boolean pointAccepted,
        String disposedOn,
        Instant createdAt,
        ItemKind itemKind,
        Integer quantity) {

    public static final String COLLECTION = "disposals";

    public ItemKind kind() {
        return ItemKind.of(itemKind, deviceCategory);
    }

    public int units() {
        return quantity == null || quantity < 1 ? 1 : quantity;
    }
}
