package br.com.ecicla.api.disposal;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import br.com.ecicla.api.device.ItemKind;
import br.com.ecicla.api.point.Material;

public record DisposalView(
        String id,
        String deviceId,
        ItemKind kind,
        Material deviceCategory,
        String deviceDescription,
        int quantity,
        String pointId,
        String pointName,
        boolean pointAccepted,
        String disposedOn,
        Instant createdAt) {

    static DisposalView from(Disposal d) {
        return new DisposalView(d.id(), d.deviceId(), d.kind(), d.deviceCategory(), d.deviceDescription(), d.units(),
                d.pointId(), d.pointName(), d.pointAccepted(), d.disposedOn(), d.createdAt());
    }

    /** The user's history (PB16): newest first, with how many units of each kind. */
    public record History(List<DisposalView> items, Totals totals) {
    }

    /** {@code total} and the maps count units (20 batteries count 20); {@code deliveries} counts records. */
    public record Totals(int total, int deliveries, Map<Material, Long> byCategory, Map<ItemKind, Long> byKind) {
    }
}
