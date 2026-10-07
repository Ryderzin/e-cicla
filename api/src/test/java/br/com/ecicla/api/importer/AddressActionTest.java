package br.com.ecicla.api.importer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;

import br.com.ecicla.api.importer.PointImportService.AddressAction;
import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.PointSource;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.SourceType;

class AddressActionTest {

    private static final double LAT = -23.55;
    private static final double LON = -46.63;

    @Test
    void usesTheSourceAddressWhenThereIsOne() {
        ImportedPoint point = imported("Rua A, 1");

        assertThat(PointImportService.addressAction(point, stored(LON, LAT, "Rua B, 2", true)))
                .isEqualTo(AddressAction.FROM_SOURCE);
        assertThat(PointImportService.addressAction(point, null)).isEqualTo(AddressAction.FROM_SOURCE);
    }

    @Test
    void looksUpNewPointsWithoutAddress() {
        assertThat(PointImportService.addressAction(imported(null), null)).isEqualTo(AddressAction.LOOK_UP);
    }

    @Test
    void keepsAnApproximateAddressAlreadyLookedUpForTheSameLocation() {
        assertThat(PointImportService.addressAction(imported(null), stored(LON, LAT, "Rua B", true)))
                .isEqualTo(AddressAction.KEEP_STORED);
    }

    @Test
    void doesNotLookUpAgainWhenNothingWasFoundForTheSameLocation() {
        assertThat(PointImportService.addressAction(imported(null), stored(LON, LAT, null, true)))
                .isEqualTo(AddressAction.KEEP_STORED);
    }

    @Test
    void looksUpAgainWhenThePointMoved() {
        assertThat(PointImportService.addressAction(imported(null), stored(LON + 0.01, LAT, "Rua B", true)))
                .isEqualTo(AddressAction.LOOK_UP);
    }

    @Test
    void looksUpWhenTheSourceAddressWasRemoved() {
        // The stored address came from the source, which no longer has it.
        assertThat(PointImportService.addressAction(imported(null), stored(LON, LAT, "Rua B, 2", false)))
                .isEqualTo(AddressAction.LOOK_UP);
    }

    private static ImportedPoint imported(String address) {
        return new ImportedPoint(SourceType.OSM, "node/1", null, LON, LAT, address,
                List.of(Material.BATTERIES), null, null, null);
    }

    private static CollectionPoint stored(double lon, double lat, String address, boolean approximate) {
        return new CollectionPoint("66fb1c2e8f1b2a3c4d5e6f70", null, new GeoJsonPoint(lon, lat), address, approximate,
                List.of(Material.BATTERIES), null, null, null,
                new PointSource(SourceType.OSM, "node/1", null), PointStatus.ACTIVE, null, null);
    }
}
