package br.com.ecicla.api.importer;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import br.com.ecicla.api.point.BoundingBox;

/**
 * Talks to Nominatim, OpenStreetMap's own geocoder: the address at a coordinate ("reverse") for the
 * import, and the coordinate of a typed address ("search") for the map. Its usage policy allows at
 * most one request per second from a single client that identifies itself, asks that results be
 * stored instead of requested again, and forbids search-as-you-type. Both kinds of request share the
 * same rate limit.
 */
@Component
public class NominatimClient {

    // Overpass and Nominatim ask clients to identify themselves.
    private static final String USER_AGENT = "E-Cicla/0.2 (projeto academico; pontos de coleta de lixo eletronico)";
    private static final Duration MIN_INTERVAL = Duration.ofMillis(1100);

    private final RestClient restClient;
    private final String url;
    private final ReentrantLock lock = new ReentrantLock(true);
    private long lastRequestAt;

    NominatimClient(RestClient.Builder builder, @Value("${app.import.nominatim-url}") String url) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(20));
        this.restClient = builder
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .defaultHeader(HttpHeaders.ACCEPT_LANGUAGE, "pt-BR")
                .build();
        this.url = url;
    }

    record ReverseResponse(Map<String, String> address, String error) {
    }

    record SearchResult(String lat, String lon, String display_name, Map<String, String> address) {
    }

    /** A place found by {@link #search}. */
    public record Place(double latitude, double longitude, String label) {
    }

    /** Thrown when other requests are already waiting for their turn and this one would wait too long. */
    public static class BusyException extends RuntimeException {
        public BusyException() {
            super("Nominatim is busy");
        }
    }

    /**
     * Returns the formatted address, or empty when Nominatim knows no street or neighbourhood there.
     *
     * @throws org.springframework.web.client.RestClientException when Nominatim is unreachable or answers with an error
     */
    Optional<String> reverse(double latitude, double longitude) {
        lock.lock();
        try {
            waitForRateLimit();
            ReverseResponse response = restClient.get()
                    .uri(url + "/reverse?format=jsonv2&addressdetails=1&zoom=18&lat={lat}&lon={lon}",
                            String.format(Locale.ROOT, "%.7f", latitude),
                            String.format(Locale.ROOT, "%.7f", longitude))
                    .retrieve()
                    .body(ReverseResponse.class);
            if (response == null || response.error() != null || response.address() == null) {
                return Optional.empty();
            }
            return formatAddress(response.address());
        } finally {
            lock.unlock();
        }
    }

    /**
     * Finds the place that best matches a typed address, in Brazil and, when given, inside an area.
     *
     * @param maxWait how long to wait for the turn of this request before giving up
     * @throws BusyException when the turn did not come within {@code maxWait}
     * @throws org.springframework.web.client.RestClientException when Nominatim is unreachable or answers with an error
     */
    public Optional<Place> search(String query, Optional<BoundingBox> area, Duration maxWait) {
        try {
            if (!lock.tryLock(maxWait.toMillis(), TimeUnit.MILLISECONDS)) {
                throw new BusyException();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusyException();
        }
        try {
            waitForRateLimit();
            UriComponentsBuilder uri = UriComponentsBuilder.fromUriString(url + "/search")
                    .queryParam("format", "jsonv2")
                    .queryParam("addressdetails", 1)
                    .queryParam("limit", 1)
                    .queryParam("countrycodes", "br")
                    .queryParam("q", query);
            area.ifPresent(box -> uri
                    .queryParam("viewbox", String.format(Locale.ROOT, "%.4f,%.4f,%.4f,%.4f",
                            box.minLng(), box.maxLat(), box.maxLng(), box.minLat()))
                    .queryParam("bounded", 1));
            List<SearchResult> results = restClient.get()
                    .uri(uri.encode().build().toUri())
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<SearchResult>>() {
                    });
            if (results == null || results.isEmpty()) {
                return Optional.empty();
            }
            return toPlace(results.getFirst());
        } finally {
            lock.unlock();
        }
    }

    static Optional<Place> toPlace(SearchResult result) {
        try {
            double latitude = Double.parseDouble(result.lat());
            double longitude = Double.parseDouble(result.lon());
            String label = Optional.ofNullable(result.address())
                    .flatMap(NominatimClient::formatAddress)
                    .orElseGet(() -> shortName(result.display_name()));
            return Optional.of(new Place(latitude, longitude, label));
        } catch (NullPointerException | NumberFormatException e) {
            return Optional.empty();
        }
    }

    /** The first parts of Nominatim's long name ("Campinas, Região Imediata de Campinas, ..., Brasil"). */
    private static String shortName(String displayName) {
        if (displayName == null) {
            return null;
        }
        String[] parts = displayName.split(",\\s*");
        return String.join(", ", List.of(parts).subList(0, Math.min(2, parts.length)));
    }

    /** Builds "Rua Exemplo, 100 - Bairro, Cidade - UF" from Nominatim's address details. */
    static Optional<String> formatAddress(Map<String, String> address) {
        String street = first(address, "road", "pedestrian", "footway", "path");
        String suburb = first(address, "suburb", "neighbourhood", "quarter", "city_district");
        if (street == null && suburb == null) {
            // Only the city is known: too vague to help anyone find the point.
            return Optional.empty();
        }
        String city = first(address, "city", "town", "village", "municipality");
        return Optional.ofNullable(AddressFormat.format(street, address.get("house_number"), suburb, city, state(address)));
    }

    /** "SP" from the ISO code "BR-SP" when available, otherwise the state's name. */
    private static String state(Map<String, String> address) {
        String iso = address.get("ISO3166-2-lvl4");
        if (iso != null && iso.startsWith("BR-")) {
            return iso.substring(3);
        }
        return address.get("state");
    }

    private static String first(Map<String, String> address, String... keys) {
        for (String key : keys) {
            String value = address.get(key);
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    /** Must be called while holding {@link #lock}. */
    private void waitForRateLimit() {
        long wait = lastRequestAt + MIN_INTERVAL.toMillis() - System.currentTimeMillis();
        if (wait > 0) {
            try {
                Thread.sleep(wait);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ResourceAccessException("Interrupted while waiting to call Nominatim");
            }
        }
        lastRequestAt = System.currentTimeMillis();
    }
}
