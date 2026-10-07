package br.com.ecicla.api.geo;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecicla.api.importer.NominatimClient;
import br.com.ecicla.api.importer.NominatimClient.Place;
import br.com.ecicla.api.point.BoundingBox;

/** Location of an address typed by the user, to find the collection points near it. */
@RestController
@RequestMapping("/api/geocode")
public class GeocodingController {

    static final int MIN_QUERY_LENGTH = 3;
    static final int MAX_QUERY_LENGTH = 200;

    private final GeocodingService service;

    public GeocodingController(GeocodingService service) {
        this.service = service;
    }

    @GetMapping
    public Place search(
            @RequestParam String q,
            @RequestParam(required = false) Double minLng,
            @RequestParam(required = false) Double minLat,
            @RequestParam(required = false) Double maxLng,
            @RequestParam(required = false) Double maxLat) {
        String query = q.trim();
        if (query.length() < MIN_QUERY_LENGTH || query.length() > MAX_QUERY_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "q must have between " + MIN_QUERY_LENGTH + " and " + MAX_QUERY_LENGTH + " characters");
        }
        Optional<BoundingBox> area;
        try {
            area = BoundingBox.fromParams(minLng, minLat, maxLng, maxLat);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        try {
            return service.search(query, area)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Address not found"));
        } catch (NominatimClient.BusyException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Too many searches right now; try again");
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Address search is unavailable");
        }
    }
}
