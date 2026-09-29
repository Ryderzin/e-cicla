package br.com.ecicla.api.importer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.util.List;

import org.junit.jupiter.api.Test;

import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.SourceType;

class SeedPointTest {

    @Test
    void becomesManualPoint() {
        SeedPoint seed = new SeedPoint("manual/ecoponto-teste", "Ecoponto Teste", -23.5, -46.6, "Rua B, 1",
                List.of("BATTERIES", "COMPUTERS"), "Mo-Fr 08:00-17:00", "Prefeitura", null);

        ImportedPoint point = seed.toImportedPoint();

        assertThat(point.sourceType()).isEqualTo(SourceType.MANUAL);
        assertThat(point.externalId()).isEqualTo("manual/ecoponto-teste");
        assertThat(point.latitude()).isEqualTo(-23.5);
        assertThat(point.longitude()).isEqualTo(-46.6);
        assertThat(point.acceptedMaterials()).containsExactly(Material.BATTERIES, Material.COMPUTERS);
    }

    @Test
    void rejectsUnknownMaterial() {
        SeedPoint seed = new SeedPoint("manual/x", "X", -23.5, -46.6, null, List.of("TELEVISIONS"), null, null, null);

        assertThatIllegalArgumentException().isThrownBy(seed::toImportedPoint).withMessageContaining("TELEVISIONS");
    }

    @Test
    void rejectsMissingOrMalformedId() {
        SeedPoint missing = new SeedPoint(null, "X", -23.5, -46.6, null, List.of("BATTERIES"), null, null, null);
        SeedPoint malformed = new SeedPoint("node/1", "X", -23.5, -46.6, null, List.of("BATTERIES"), null, null, null);

        assertThatIllegalArgumentException().isThrownBy(missing::toImportedPoint);
        assertThatIllegalArgumentException().isThrownBy(malformed::toImportedPoint);
    }

    @Test
    void rejectsMissingCoordinates() {
        SeedPoint seed = new SeedPoint("manual/x", "X", null, -46.6, null, List.of("BATTERIES"), null, null, null);

        assertThatIllegalArgumentException().isThrownBy(seed::toImportedPoint);
    }
}
