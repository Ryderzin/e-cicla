package br.com.ecicla.api.importer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

import br.com.ecicla.api.importer.OverpassResponse.Center;
import br.com.ecicla.api.importer.OverpassResponse.Element;
import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.SourceType;

class OsmPointMapperTest {

    @Test
    void mapsNodeWithAllTags() {
        Element node = new Element("node", 123L, -23.55, -46.63, null, Map.ofEntries(
                Map.entry("amenity", "recycling"),
                Map.entry("name", "Ecoponto Centro"),
                Map.entry("recycling:batteries", "yes"),
                Map.entry("recycling:mobile_phones", "yes"),
                Map.entry("addr:street", "Rua Exemplo"),
                Map.entry("addr:housenumber", "100"),
                Map.entry("addr:suburb", "Centro"),
                Map.entry("addr:city", "São Paulo"),
                Map.entry("addr:state", "SP"),
                Map.entry("opening_hours", "Mo-Sa 08:00-17:00"),
                Map.entry("operator", "Prefeitura"),
                Map.entry("description", "Não recebe geladeiras")));

        ImportedPoint point = OsmPointMapper.toImportedPoint(node).orElseThrow();

        assertThat(point.sourceType()).isEqualTo(SourceType.OSM);
        assertThat(point.externalId()).isEqualTo("node/123");
        assertThat(point.name()).isEqualTo("Ecoponto Centro");
        assertThat(point.latitude()).isEqualTo(-23.55);
        assertThat(point.longitude()).isEqualTo(-46.63);
        assertThat(point.acceptedMaterials()).containsExactly(Material.BATTERIES, Material.MOBILE_PHONES);
        assertThat(point.address()).isEqualTo("Rua Exemplo, 100 - Centro, São Paulo - SP");
        assertThat(point.openingHours()).isEqualTo("Mo-Sa 08:00-17:00");
        assertThat(point.operator()).isEqualTo("Prefeitura");
        assertThat(point.notes()).isEqualTo("Não recebe geladeiras");
    }

    @Test
    void mapsEveryRecyclingTagToItsCategory() {
        Map<String, String> tags = Map.of(
                "recycling:batteries", "yes",
                "recycling:computers", "yes",
                "recycling:mobile_phones", "yes",
                "recycling:electrical_items", "yes",
                "recycling:small_appliances", "yes");

        assertThat(OsmPointMapper.materialsFrom(tags)).containsExactly(
                Material.BATTERIES,
                Material.COMPUTERS,
                Material.MOBILE_PHONES,
                Material.ELECTRICAL_ITEMS,
                Material.SMALL_APPLIANCES);
    }

    @Test
    void ignoresRecyclingTagsThatAreNotYes() {
        Map<String, String> tags = Map.of(
                "recycling:batteries", "no",
                "recycling:computers", "YES",
                "recycling:glass", "yes",
                "recycling:mobile_phones", "");

        assertThat(OsmPointMapper.materialsFrom(tags)).containsExactly(Material.COMPUTERS);
    }

    @Test
    void usesCenterForWaysAndRelations() {
        Element way = new Element("way", 456L, null, null, new Center(-22.9, -43.2),
                Map.of("recycling:electrical_items", "yes"));

        ImportedPoint point = OsmPointMapper.toImportedPoint(way).orElseThrow();

        assertThat(point.externalId()).isEqualTo("way/456");
        assertThat(point.latitude()).isEqualTo(-22.9);
        assertThat(point.longitude()).isEqualTo(-43.2);
    }

    @Test
    void skipsElementsWithoutCoordinates() {
        Element relation = new Element("relation", 789L, null, null, null, Map.of("recycling:batteries", "yes"));

        assertThat(OsmPointMapper.toImportedPoint(relation)).isEmpty();
    }

    @Test
    void skipsElementsWithoutElectronicCategories() {
        Element node = new Element("node", 1L, -23.5, -46.6, null, Map.of("recycling:glass", "yes"));

        assertThat(OsmPointMapper.toImportedPoint(node)).isEmpty();
    }

    @Test
    void fallsBackToBrandWhenThereIsNoName() {
        Element node = new Element("node", 2L, -23.5, -46.6, null,
                Map.of("brand", "Loja Exemplo", "recycling:batteries", "yes"));

        assertThat(OsmPointMapper.toImportedPoint(node).orElseThrow().name()).isEqualTo("Loja Exemplo");
    }

    @Test
    void leavesOptionalFieldsEmptyWhenTagsAreMissing() {
        Element node = new Element("node", 3L, -23.5, -46.6, null, Map.of("recycling:batteries", "yes"));

        ImportedPoint point = OsmPointMapper.toImportedPoint(node).orElseThrow();

        assertThat(point.name()).isNull();
        assertThat(point.address()).isNull();
        assertThat(point.openingHours()).isNull();
        assertThat(point.operator()).isNull();
        assertThat(point.notes()).isNull();
    }

    @Test
    void formatsPartialAddresses() {
        assertThat(OsmPointMapper.addressFrom(Map.of("addr:street", "Rua A", "addr:city", "Recife")))
                .isEqualTo("Rua A - Recife");
        assertThat(OsmPointMapper.addressFrom(Map.of("addr:suburb", "Boa Vista", "addr:city", "Recife",
                "addr:state", "PE")))
                .isEqualTo("Boa Vista, Recife - PE");
        assertThat(OsmPointMapper.addressFrom(Map.of("addr:full", "Av. Central, 5, Curitiba",
                "addr:street", "Ignorada")))
                .isEqualTo("Av. Central, 5, Curitiba");
        assertThat(OsmPointMapper.addressFrom(Map.of())).isNull();
    }
}
