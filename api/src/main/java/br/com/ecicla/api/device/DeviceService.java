package br.com.ecicla.api.device;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecicla.api.auth.AccountDeletedEvent;
import br.com.ecicla.api.auth.Authenticated;

/** Each user's own devices. A device of someone else answers as if it did not exist. */
@Service
public class DeviceService {

    private final DeviceRepository devices;
    private final Clock clock;

    public DeviceService(DeviceRepository devices, Clock clock) {
        this.devices = devices;
        this.clock = clock;
    }

    public List<DeviceView> listMine(Authenticated authenticated) {
        return devices.findByUserIdOrderByCreatedAtDesc(authenticated.user().id()).stream()
                .map(DeviceView::from).toList();
    }

    public Optional<DeviceView> findMine(Authenticated authenticated, String id) {
        return findOwned(authenticated.user().id(), id).map(DeviceView::from);
    }

    public DeviceView create(Authenticated authenticated, DeviceInput input) {
        DeviceInput valid = input.validated();
        Instant now = Instant.now(clock);
        return DeviceView.from(devices.save(new Device(null, authenticated.user().id(), valid.category(),
                valid.description(), valid.details(), DeviceStatus.REGISTERED, now, now)));
    }

    /** A device already delivered keeps what it was when it was delivered. */
    public Optional<DeviceView> update(Authenticated authenticated, String id, DeviceInput input) {
        DeviceInput valid = input.validated();
        return findOwned(authenticated.user().id(), id).map(stored -> {
            if (stored.status() == DeviceStatus.DISPOSED) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "A delivered device cannot be edited");
            }
            return DeviceView.from(devices.save(new Device(stored.id(), stored.userId(), valid.category(),
                    valid.description(), valid.details(), stored.status(), stored.createdAt(), Instant.now(clock))));
        });
    }

    /** The disposals of a deleted device stay in the history, with the copy of its name they keep. */
    public boolean delete(Authenticated authenticated, String id) {
        return findOwned(authenticated.user().id(), id).map(stored -> {
            devices.deleteById(stored.id());
            return true;
        }).orElse(false);
    }

    /** The device, only if it belongs to {@code userId}. */
    public Optional<Device> findOwned(String userId, String id) {
        return (ObjectId.isValid(id) ? devices.findById(id) : Optional.<Device>empty())
                .filter(d -> userId.equals(d.userId()));
    }

    @EventListener
    public void onAccountDeleted(AccountDeletedEvent event) {
        devices.deleteByUserId(event.userId());
    }

    public Device changeStatus(Device device, DeviceStatus status) {
        return devices.save(new Device(device.id(), device.userId(), device.category(), device.description(),
                device.details(), status, device.createdAt(), Instant.now(clock)));
    }
}
