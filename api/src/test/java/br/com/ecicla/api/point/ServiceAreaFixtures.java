package br.com.ecicla.api.point;

import java.io.IOException;

import org.springframework.core.io.ClassPathResource;

import com.fasterxml.jackson.databind.ObjectMapper;

/** The real area the platform covers (state of São Paulo), for tests in any package. */
public final class ServiceAreaFixtures {

    private static ServiceArea saoPaulo;

    private ServiceAreaFixtures() {
    }

    public static synchronized ServiceArea saoPaulo() {
        if (saoPaulo == null) {
            try {
                saoPaulo = new ServiceArea(new ObjectMapper(), new ClassPathResource("area/sao-paulo.geojson"));
            } catch (IOException e) {
                throw new IllegalStateException(e);
            }
        }
        return saoPaulo;
    }
}
