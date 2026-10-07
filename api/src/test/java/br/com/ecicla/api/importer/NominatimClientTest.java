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

    @Test
    void turnsASearchResultIntoAPlaceWithAShortLabel() {
        NominatimClient.SearchResult result = new NominatimClient.SearchResult("-23.5213425", "-46.4760113",
                "2983, Avenida Águia de Haia, Cidade Antônio Estêvão de Carvalho, São Paulo, Região Metropolitana de São Paulo, Brasil",
                Map.of("house_number", "2983", "road", "Avenida Águia de Haia",
                        "suburb", "Cidade Antônio Estêvão de Carvalho", "city", "São Paulo", "ISO3166-2-lvl4", "BR-SP"));

        assertThat(NominatimClient.toPlace(result)).contains(new NominatimClient.Place(-23.5213425, -46.4760113,
                "Avenida Águia de Haia, 2983 - Cidade Antônio Estêvão de Carvalho, São Paulo - SP"));
    }

    @Test
    void labelsACityByTheBeginningOfItsLongName() {
        NominatimClient.SearchResult result = new NominatimClient.SearchResult("-22.9056", "-47.0608",
                "Campinas, Região Imediata de Campinas, Região Metropolitana de Campinas, São Paulo, Brasil",
                Map.of("city", "Campinas", "ISO3166-2-lvl4", "BR-SP"));

        assertThat(NominatimClient.toPlace(result)).map(NominatimClient.Place::label)
                .contains("Campinas, Região Imediata de Campinas");
    }

    @Test
    void ignoresResultsWithoutCoordinates() {
        assertThat(NominatimClient.toPlace(new NominatimClient.SearchResult(null, "-46.4", "X", Map.of()))).isEmpty();
        assertThat(NominatimClient.toPlace(new NominatimClient.SearchResult("abc", "-46.4", "X", Map.of()))).isEmpty();
    }
}
