package br.com.ecicla.api.point;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ServiceAreaTest {

    private static final ServiceArea AREA = ServiceAreaFixtures.saoPaulo();

    @ParameterizedTest(name = "{0}")
    @CsvSource({
            "Fatec Zona Leste, -23.5213, -46.4760, true",
            "Ilhabela (ilha), -23.7780, -45.3580, true",
            "Ubatuba (perto da divisa com o RJ), -23.4336, -45.0838, true",
            "Presidente Epitácio (perto do MS), -21.7633, -52.1156, true",
            "Franca (perto de MG), -20.5386, -47.4008, true",
            "Cananéia (perto do PR), -25.0144, -47.9341, true",
            "Paraty (RJ), -23.2178, -44.7131, false",
            "Rio de Janeiro, -22.9068, -43.1729, false",
            "Poços de Caldas (MG), -21.7878, -46.5613, false",
            "Três Lagoas (MS), -20.7849, -51.7007, false",
            "Curitiba (PR), -25.4284, -49.2733, false",
            "Uberlândia (MG), -18.9186, -48.2772, false",
    })
    void knowsWhichPlacesAreInTheStateOfSaoPaulo(String place, double latitude, double longitude, boolean inside) {
        assertThat(AREA.contains(latitude, longitude)).isEqualTo(inside);
    }
}
