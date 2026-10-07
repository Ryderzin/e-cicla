package br.com.ecicla.api.admin;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecicla.api.point.PointStatus;

/** Collection point maintenance. Only for administrators: see {@code AuthWebConfig}. */
@RestController
@RequestMapping("/api/admin/points")
public class AdminPointController {

    private final AdminPointService service;

    public AdminPointController(AdminPointService service) {
        this.service = service;
    }

    record StatusChange(PointStatus status) {
    }

    @GetMapping
    public List<AdminPointView> list(@RequestParam Optional<String> q, @RequestParam Optional<PointStatus> status) {
        return service.list(q, status);
    }

    @GetMapping("/{id}")
    public AdminPointView get(@PathVariable String id) {
        return service.find(id).orElseThrow(AdminPointController::notFound);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminPointView create(@RequestBody PointInput input) {
        try {
            return service.create(input);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public AdminPointView update(@PathVariable String id, @RequestBody PointInput input) {
        try {
            return service.update(id, input).orElseThrow(AdminPointController::notFound);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    /** Deactivates ({@code INACTIVE}) or reactivates ({@code ACTIVE}) a point. */
    @PutMapping("/{id}/status")
    public AdminPointView changeStatus(@PathVariable String id, @RequestBody StatusChange change) {
        if (change.status() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status is required");
        }
        return service.changeStatus(id, change.status()).orElseThrow(AdminPointController::notFound);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection point not found");
    }
}
