package br.com.ecicla.api.disposal;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import br.com.ecicla.api.point.Material;

public record DisposalView(
        String id,
        String deviceId,
        Material deviceCategory,
        String deviceDescription,
        String pointId,
        String pointName,
        boolean pointAccepted,
        String disposedOn,
        Instant createdAt) {

    static DisposalView from(Disposal d) {
        return new DisposalView(d.id(), d.deviceId(), d.deviceCategory(), d.deviceDescription(), d.pointId(),
                d.pointName(), d.pointAccepted(), d.disposedOn(), d.createdAt());
    }

    /** The user's history (PB16): newest first, with how many of each kind of device. */
    public record History(List<DisposalView> items, Totals totals) {
    }

    public record Totals(int total, Map<Material, Long> byCategory) {
    }
}
