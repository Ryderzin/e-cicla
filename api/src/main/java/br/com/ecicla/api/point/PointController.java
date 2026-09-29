package br.com.ecicla.api.point;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/points")
public class PointController {

    private final PointService service;

    public PointController(PointService service) {
        this.service = service;
    }

    /** Active points, optionally only those inside the visible map area. */
    @GetMapping
    public List<PointSummary> list(
            @RequestParam(required = false) Double minLng,
            @RequestParam(required = false) Double minLat,
            @RequestParam(required = false) Double maxLng,
            @RequestParam(required = false) Double maxLat) {
        Optional<BoundingBox> area;
        try {
            area = BoundingBox.fromParams(minLng, minLat, maxLng, maxLat);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        return service.listActive(area);
    }

    @GetMapping("/{id}")
    public PointDetails get(@PathVariable String id) {
        return service.findActive(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection point not found"));
    }
}
