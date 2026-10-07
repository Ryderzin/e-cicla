package br.com.ecicla.api.importer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.mongodb.core.BulkOperations;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.bulk.BulkWriteResult;

import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.PointSource;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.SourceType;

class ImportKeepsAdminEditsTest {

    private static final String SEED = """
            [
              {"externalId": "manual/editado", "name": "Nome da fonte", "latitude": -23.5, "longitude": -46.6,
               "address": "Rua A, 1", "acceptedMaterials": ["BATTERIES"]},
              {"externalId": "manual/intocado", "name": "Outro ponto", "latitude": -23.6, "longitude": -46.7,
               "address": "Rua B, 2", "acceptedMaterials": ["COMPUTERS"]}
            ]
            """;

    @Test
    void doesNotOverwritePointsEditedByAdministrators() throws Exception {
        OverpassClient overpass = mock(OverpassClient.class);
        when(overpass.fetchElements()).thenReturn(List.of());
        MongoTemplate mongo = mock(MongoTemplate.class);
        CollectionPoint edited = new CollectionPoint("66fb1c2e8f1b2a3c4d5e6f70", "Nome corrigido pela equipe",
                new GeoJsonPoint(-46.6, -23.5), "Rua A, 1", false, List.of(Material.BATTERIES, Material.MOBILE_PHONES),
                null, null, null, new PointSource(SourceType.MANUAL, "manual/editado", Instant.now()), PointStatus.ACTIVE,
                Instant.now(), Instant.now());
        when(mongo.find(any(Query.class), eq(CollectionPoint.class))).thenReturn(List.of(edited));
        BulkOperations bulk = mock(BulkOperations.class);
        when(mongo.bulkOps(any(BulkOperations.BulkMode.class), eq(CollectionPoint.class))).thenReturn(bulk);
        when(bulk.execute()).thenReturn(mock(BulkWriteResult.class));
        PointImportService service = new PointImportService(overpass, mock(NominatimClient.class), mongo,
                new ObjectMapper(), new ByteArrayResource(SEED.getBytes(StandardCharsets.UTF_8)), false);

        service.importAll();

        ArgumentCaptor<Query> queries = ArgumentCaptor.forClass(Query.class);
        verify(bulk).upsert(queries.capture(), any(Update.class));
        assertThat(queries.getAllValues()).hasSize(1);
        assertThat(queries.getValue().getQueryObject().getString("source.externalId")).isEqualTo("manual/intocado");
        verify(bulk, never()).updateOne(any(Query.class), any(Update.class));
    }

    @Test
    void recognisesEditedPoints() {
        CollectionPoint imported = new CollectionPoint("1", null, new GeoJsonPoint(0, 0), null, false, List.of(), null, null,
                null, null, PointStatus.ACTIVE, Instant.now(), null);
        CollectionPoint edited = new CollectionPoint("1", null, new GeoJsonPoint(0, 0), null, false, List.of(), null, null,
                null, null, PointStatus.ACTIVE, Instant.now(), Instant.now());

        assertThat(PointImportService.editedByAdmin(null)).isFalse();
        assertThat(PointImportService.editedByAdmin(imported)).isFalse();
        assertThat(PointImportService.editedByAdmin(edited)).isTrue();
    }
}
