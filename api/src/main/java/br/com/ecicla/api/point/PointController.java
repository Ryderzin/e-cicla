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

    private static final int MAX_NEAR_LIMIT = 20;

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
        return service.listActive(area(minLng, minLat, maxLng, maxLat));
    }

    /**
     * Active points nearest to a location (the user's or a searched address), nearest first, with the
     * distance to each. The optional area keeps only points the map can show.
     */
    @GetMapping("/near")
    public List<NearbyPoint> near(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) Double minLng,
            @RequestParam(required = false) Double minLat,
            @RequestParam(required = false) Double maxLng,
            @RequestParam(required = false) Double maxLat) {
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Coordinates out of range");
        }
        if (limit < 1 || limit > MAX_NEAR_LIMIT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "limit must be between 1 and " + MAX_NEAR_LIMIT);
        }
        return service.findNearest(latitude, longitude, limit, area(minLng, minLat, maxLng, maxLat));
    }

    private static Optional<BoundingBox> area(Double minLng, Double minLat, Double maxLng, Double maxLat) {
        try {
            return BoundingBox.fromParams(minLng, minLat, maxLng, maxLat);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public PointDetails get(@PathVariable String id) {
        return service.findActive(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection point not found"));
    }
}
