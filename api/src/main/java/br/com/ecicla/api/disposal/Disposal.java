package br.com.ecicla.api.disposal;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import br.com.ecicla.api.point.Material;

/**
 * A device delivered to a collection point (PB15). The device and point names are copied when the disposal
 * is registered, so the history and the chart still work if the point is deleted or the device edited.
 * {@code disposedOn} is the calendar day in São Paulo, as {@code yyyy-MM-dd}, so months group by its prefix
 * regardless of the server's time zone. {@code pointAccepted} records whether the point said it accepted
 * that kind of device (the user may confirm a delivery anyway, PB11).
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
        Instant createdAt) {

    public static final String COLLECTION = "disposals";
}
