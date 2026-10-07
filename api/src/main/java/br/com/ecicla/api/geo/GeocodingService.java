package br.com.ecicla.api.geo;

import java.text.Normalizer;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import br.com.ecicla.api.importer.NominatimClient;
import br.com.ecicla.api.importer.NominatimClient.Place;
import br.com.ecicla.api.point.BoundingBox;

/**
 * Finds the location of an address typed by the user. Answers, including "not found", are kept in
 * memory so the same search does not reach Nominatim again, as its usage policy asks.
 */
@Service
public class GeocodingService {

    private static final int CACHE_SIZE = 500;
    /** Longer than this in the queue means many searches at once; better to say "try again" than to pile up. */
    private static final Duration MAX_WAIT = Duration.ofSeconds(5);

    private final NominatimClient nominatim;
    private final Map<String, Optional<Place>> cache = new LinkedHashMap<>(64, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Optional<Place>> eldest) {
            return size() > CACHE_SIZE;
        }
    };

    public GeocodingService(NominatimClient nominatim) {
        this.nominatim = nominatim;
    }

    /**
     * @throws NominatimClient.BusyException when too many searches are waiting for their turn
     * @throws org.springframework.web.client.RestClientException when Nominatim is unreachable
     */
    public Optional<Place> search(String query, Optional<BoundingBox> area) {
        String key = normalize(query) + area.map(BoundingBox::toString).orElse("");
        synchronized (cache) {
            Optional<Place> cached = cache.get(key);
            if (cached != null) {
                return cached;
            }
        }
        Optional<Place> place = nominatim.search(query.trim(), area, MAX_WAIT);
        synchronized (cache) {
            cache.put(key, place);
        }
        return place;
    }

    /** "Av. Águia de  Haia" and "av. aguia de haia" are the same search. */
    static String normalize(String query) {
        String withoutAccents = Normalizer.normalize(query, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return withoutAccents.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }
}
