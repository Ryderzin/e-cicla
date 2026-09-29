package br.com.ecicla.api.importer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

class NominatimClientTest {

    @Test
    void formatsFullAddressWithStateAbbreviation() {
        Map<String, String> address = Map.of(
                "house_number", "3459",
                "road", "Rua Castro Alves",
                "suburb", "Vila Santana",
                "city", "Araraquara",
                "state", "São Paulo",
                "ISO3166-2-lvl4", "BR-SP",
                "postcode", "14801-450",
                "country", "Brasil");

        assertThat(NominatimClient.formatAddress(address))
                .contains("Rua Castro Alves, 3459 - Vila Santana, Araraquara - SP");
    }

    @Test
    void formatsAddressWithoutNumberOrSuburb() {
        Map<String, String> address = Map.of(
                "road", "Rodovia Marechal Rondon",
                "city", "Araçatuba",
                "ISO3166-2-lvl4", "BR-SP");

        assertThat(NominatimClient.formatAddress(address)).contains("Rodovia Marechal Rondon - Araçatuba - SP");
    }

    @Test
    void doesNotRepeatTheCityWhenItAlsoComesAsTheSuburb() {
        Map<String, String> address = Map.of(
                "road", "Rodovia Marechal Rondon",
                "suburb", "Araçatuba",
                "city", "Araçatuba",
                "ISO3166-2-lvl4", "BR-SP");

        assertThat(NominatimClient.formatAddress(address)).contains("Rodovia Marechal Rondon - Araçatuba - SP");
    }

    @Test
    void usesTownOrNeighbourhoodWhenCityOrSuburbAreMissing() {
        Map<String, String> address = Map.of(
                "neighbourhood", "Centro",
                "town", "Holambra",
                "state", "São Paulo");

        assertThat(NominatimClient.formatAddress(address)).contains("Centro, Holambra - São Paulo");
    }

    @Test
    void returnsEmptyWhenOnlyTheCityIsKnown() {
        Map<String, String> address = Map.of("city", "São Paulo", "ISO3166-2-lvl4", "BR-SP");

        assertThat(NominatimClient.formatAddress(address)).isEmpty();
    }
}
