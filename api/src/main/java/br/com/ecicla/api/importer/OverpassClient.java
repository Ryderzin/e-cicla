package br.com.ecicla.api.importer;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/** Runs the electronic waste query against the Overpass API (OpenStreetMap). */
@Component
class OverpassClient {

    private static final Logger log = LoggerFactory.getLogger(OverpassClient.class);

    // Overpass asks clients to identify themselves.
    private static final String USER_AGENT = "E-Cicla/0.1 (projeto academico; importacao de pontos de coleta)";

    private final RestClient restClient;
    private final String url;
    private final String query;

    OverpassClient(
            RestClient.Builder builder,
            @Value("${app.import.overpass-url}") String url,
            @Value("classpath:overpass/electronic-waste-points.overpassql") Resource queryFile) throws IOException {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(30));
        // The query lets the server run for up to 180 s; wait a bit longer than that.
        requestFactory.setReadTimeout(Duration.ofSeconds(240));
        this.restClient = builder
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .build();
        this.url = url;
        this.query = queryFile.getContentAsString(StandardCharsets.UTF_8);
    }

    /**
     * @throws org.springframework.web.client.RestClientException when Overpass is unreachable, times
     *     out or answers with an error (e.g. 429 too many requests, 504 overloaded)
     */
    List<OverpassResponse.Element> fetchElements() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("data", query);
        OverpassResponse response = restClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(OverpassResponse.class);
        if (response == null || response.elements() == null) {
            return List.of();
        }
        if (response.remark() != null) {
            // Overpass reports runtime problems (such as timeouts) here, with partial results.
            log.warn("Overpass remark: {}", response.remark());
        }
        return response.elements();
    }
}
