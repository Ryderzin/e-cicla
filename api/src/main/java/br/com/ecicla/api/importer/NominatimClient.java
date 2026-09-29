package br.com.ecicla.api.importer;

import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

/**
 * Looks up the address at a coordinate ("reverse geocoding") with Nominatim, OpenStreetMap's own
 * geocoder. Its usage policy allows at most one request per second from a single client that
 * identifies itself, and asks that results be stored instead of requested again.
 */
@Component
class NominatimClient {

    // Overpass and Nominatim ask clients to identify themselves.
    private static final String USER_AGENT = "E-Cicla/0.1 (projeto academico; importacao de pontos de coleta)";
    private static final Duration MIN_INTERVAL = Duration.ofMillis(1100);

    private final RestClient restClient;
    private final String url;
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

    /**
     * Returns the formatted address, or empty when Nominatim knows no street or neighbourhood there.
     *
     * @throws org.springframework.web.client.RestClientException when Nominatim is unreachable or answers with an error
     */
    synchronized Optional<String> reverse(double latitude, double longitude) {
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
