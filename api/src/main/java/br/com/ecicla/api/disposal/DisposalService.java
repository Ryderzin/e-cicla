package br.com.ecicla.api.disposal;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecicla.api.auth.AccountDeletedEvent;
import br.com.ecicla.api.auth.Authenticated;
import br.com.ecicla.api.common.TimeConfig;
import br.com.ecicla.api.device.Device;
import br.com.ecicla.api.device.DeviceService;
import br.com.ecicla.api.device.DeviceStatus;
import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.CollectionPointRepository;
import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.PointStatus;

/** Registering deliveries (PB15, with the PB11 check) and each user's history (PB16). */
@Service
public class DisposalService {

    /** Deliveries can be registered up to one year after they happened. */
    static final int MAX_DAYS_AGO = 365;
    static final String UNNAMED_POINT = "Ponto de coleta";

    private final DisposalRepository disposals;
    private final DeviceService devices;
    private final CollectionPointRepository points;
    private final Clock clock;

    public DisposalService(DisposalRepository disposals, DeviceService devices, CollectionPointRepository points,
            Clock clock) {
        this.disposals = disposals;
        this.devices = devices;
        this.points = points;
        this.clock = clock;
    }

    public DisposalView.History history(Authenticated authenticated) {
        List<Disposal> mine = disposals.findByUserIdOrderByDisposedOnDescCreatedAtDesc(authenticated.user().id());
        Map<Material, Long> byCategory = new EnumMap<>(Material.class);
        for (Material m : Material.values()) {
            byCategory.put(m, 0L);
        }
        mine.forEach(d -> {
            if (d.deviceCategory() != null) {
                byCategory.merge(d.deviceCategory(), 1L, Long::sum);
            }
        });
        return new DisposalView.History(mine.stream().map(DisposalView::from).toList(),
                new DisposalView.Totals(mine.size(), byCategory));
    }

    public DisposalView create(Authenticated authenticated, DisposalInput input) {
        String userId = authenticated.user().id();
        if (input.deviceId() == null || input.pointId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "deviceId and pointId are required");
        }
        Device device = devices.findOwned(userId, input.deviceId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found"));
        if (device.status() == DeviceStatus.DISPOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This device was already delivered");
        }
        CollectionPoint point = (ObjectId.isValid(input.pointId())
                ? points.findByIdAndStatus(input.pointId(), PointStatus.ACTIVE)
                : Optional.<CollectionPoint>empty())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection point not found"));
        String day = validDay(input.disposedOn());

        List<Material> accepted = point.acceptedMaterials() == null ? List.of() : point.acceptedMaterials();
        boolean pointAccepted = accepted.contains(device.category());
        if (!pointAccepted && !Boolean.TRUE.equals(input.confirmNotAccepted())) {
            throw new NotAcceptedException(accepted);
        }

        Disposal saved = disposals.save(new Disposal(null, userId, device.id(), device.category(),
                device.description(), point.id(),
                point.name() == null || point.name().isBlank() ? UNNAMED_POINT : point.name(),
                pointAccepted, day, Instant.now(clock)));
        devices.changeStatus(device, DeviceStatus.DISPOSED);
        return DisposalView.from(saved);
    }

    /** Undoes a disposal registered by mistake; the device goes back to the list of devices to deliver. */
    public boolean delete(Authenticated authenticated, String id) {
        String userId = authenticated.user().id();
        Optional<Disposal> found = (ObjectId.isValid(id) ? disposals.findById(id) : Optional.<Disposal>empty())
                .filter(d -> userId.equals(d.userId()));
        found.ifPresent(d -> {
            disposals.deleteById(d.id());
            devices.findOwned(userId, d.deviceId())
                    .filter(device -> device.status() == DeviceStatus.DISPOSED)
                    .ifPresent(device -> devices.changeStatus(device, DeviceStatus.REGISTERED));
        });
        return found.isPresent();
    }

    @EventListener
    public void onAccountDeleted(AccountDeletedEvent event) {
        disposals.deleteByUserId(event.userId());
    }

    /** Today in São Paulo when empty; never in the future nor more than a year ago. */
    private String validDay(String raw) {
        LocalDate today = LocalDate.now(clock.withZone(TimeConfig.SAO_PAULO));
        if (raw == null || raw.isBlank()) {
            return today.toString();
        }
        LocalDate day;
        try {
            day = LocalDate.parse(raw.strip());
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "disposedOn must be yyyy-MM-dd");
        }
        if (day.isAfter(today)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "disposedOn cannot be in the future");
        }
        if (day.isBefore(today.minusDays(MAX_DAYS_AGO))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "disposedOn cannot be more than a year ago");
        }
        return day.toString();
    }
}
