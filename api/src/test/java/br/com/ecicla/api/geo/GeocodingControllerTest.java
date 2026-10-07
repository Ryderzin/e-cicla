package br.com.ecicla.api.geo;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.ResourceAccessException;

import br.com.ecicla.api.auth.SessionService;
import br.com.ecicla.api.importer.NominatimClient;
import br.com.ecicla.api.importer.NominatimClient.Place;
import br.com.ecicla.api.point.BoundingBox;

@WebMvcTest(GeocodingController.class)
@Import(GeocodingService.class)
class GeocodingControllerTest {

    private static final Place FATEC = new Place(-23.5213, -46.4760, "Avenida Águia de Haia, 2983 - São Paulo - SP");

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private NominatimClient nominatim;

    @MockitoBean
    private SessionService sessions;

    @Test
    void findsAnAddressInsideTheMapArea() throws Exception {
        when(nominatim.search(eq("Av. Águia de Haia, 2983"), eq(Optional.of(new BoundingBox(-53.1, -25.5, -44.2, -19.8))),
                any())).thenReturn(Optional.of(FATEC));

        mvc.perform(get("/api/geocode").param("q", "  Av. Águia de Haia, 2983 ")
                        .param("minLng", "-53.1").param("minLat", "-25.5").param("maxLng", "-44.2").param("maxLat", "-19.8"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").value(-23.5213))
                .andExpect(jsonPath("$.longitude").value(-46.4760))
                .andExpect(jsonPath("$.label").value("Avenida Águia de Haia, 2983 - São Paulo - SP"));
    }

    @Test
    void asksNominatimOnlyOnceForTheSameSearch() throws Exception {
        when(nominatim.search(anyString(), any(), any())).thenReturn(Optional.of(FATEC));

        mvc.perform(get("/api/geocode").param("q", "Rua Exemplo, 100")).andExpect(status().isOk());
        mvc.perform(get("/api/geocode").param("q", "rua  exemplo, 100")).andExpect(status().isOk());

        verify(nominatim, times(1)).search(anyString(), any(), any());
    }

    @Test
    void answersNotFoundAndRemembersIt() throws Exception {
        when(nominatim.search(anyString(), any(), any())).thenReturn(Optional.empty());

        mvc.perform(get("/api/geocode").param("q", "lugar que nao existe")).andExpect(status().isNotFound());
        mvc.perform(get("/api/geocode").param("q", "lugar que nao existe")).andExpect(status().isNotFound());

        verify(nominatim, times(1)).search(anyString(), any(), any());
    }

    @Test
    void rejectsTooShortOrTooLongSearches() throws Exception {
        mvc.perform(get("/api/geocode").param("q", " ab ")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/geocode").param("q", "x".repeat(201))).andExpect(status().isBadRequest());
        verifyNoInteractions(nominatim);
    }

    @Test
    void asksToTryAgainWhenBusyOrUnavailable() throws Exception {
        when(nominatim.search(eq("muitas buscas"), any(), any())).thenThrow(new NominatimClient.BusyException());
        when(nominatim.search(eq("fora do ar"), any(), any())).thenThrow(new ResourceAccessException("timeout"));

        mvc.perform(get("/api/geocode").param("q", "muitas buscas")).andExpect(status().isServiceUnavailable());
        mvc.perform(get("/api/geocode").param("q", "fora do ar")).andExpect(status().isBadGateway());
    }
}
