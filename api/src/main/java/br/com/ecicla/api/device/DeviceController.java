package br.com.ecicla.api.device;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecicla.api.auth.Authenticated;

/** The signed-in user's devices (PB09, PB10). */
@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    private final DeviceService service;

    public DeviceController(DeviceService service) {
        this.service = service;
    }

    @GetMapping
    public List<DeviceView> list(Authenticated authenticated) {
        return service.listMine(authenticated);
    }

    @GetMapping("/{id}")
    public DeviceView get(Authenticated authenticated, @PathVariable String id) {
        return service.findMine(authenticated, id).orElseThrow(DeviceController::notFound);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DeviceView create(Authenticated authenticated, @RequestBody DeviceInput input) {
        try {
            return service.create(authenticated, input);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public DeviceView update(Authenticated authenticated, @PathVariable String id, @RequestBody DeviceInput input) {
        try {
            return service.update(authenticated, id, input).orElseThrow(DeviceController::notFound);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authenticated authenticated, @PathVariable String id) {
        if (!service.delete(authenticated, id)) {
            throw notFound();
        }
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found");
    }
}
