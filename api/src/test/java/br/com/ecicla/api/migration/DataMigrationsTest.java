package br.com.ecicla.api.migration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.Material;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.ServiceArea;
import br.com.ecicla.api.point.ServiceAreaFixtures;

class DataMigrationsTest {

    private static CollectionPoint point(String id, double lng, double lat) {
        return new CollectionPoint(id, null, new GeoJsonPoint(lng, lat), null, false, List.of(Material.BATTERIES), null,
                null, null, null, PointStatus.ACTIVE, Instant.now(), null);
    }

    @Test
    void deactivatesOnlyActivePointsOutsideTheStateOnce() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        ServiceArea area = ServiceAreaFixtures.saoPaulo();
        when(mongo.exists(any(Query.class), eq(DataMigrations.COLLECTION))).thenReturn(false);
        when(mongo.find(any(Query.class), eq(CollectionPoint.class))).thenReturn(List.of(
                point("em-sp", -46.4760, -23.5213),
                point("curitiba", -49.2733, -25.4284),
                point("rio", -43.1729, -22.9068)));

        new DataMigrations(mongo, area).run(null);

        ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<Update> update = ArgumentCaptor.forClass(Update.class);
        verify(mongo).updateMulti(query.capture(), update.capture(), eq(CollectionPoint.class));
        assertThat(query.getValue().getQueryObject().toJson()).contains("curitiba", "rio").doesNotContain("em-sp");
        assertThat(update.getValue().getUpdateObject().get("$set", Document.class).get("status")).isEqualTo(PointStatus.INACTIVE);
        ArgumentCaptor<Document> record = ArgumentCaptor.forClass(Document.class);
        verify(mongo).insert(record.capture(), eq(DataMigrations.COLLECTION));
        assertThat(record.getValue().getString("_id")).isEqualTo(DataMigrations.OUTSIDE_SERVICE_AREA);
        assertThat(record.getValue().getString("result")).startsWith("2 points");
    }

    @Test
    void doesNothingWhenTheMigrationWasAlreadyApplied() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        when(mongo.exists(any(Query.class), eq(DataMigrations.COLLECTION))).thenReturn(true);

        new DataMigrations(mongo, ServiceAreaFixtures.saoPaulo()).run(null);

        verify(mongo, never()).find(any(Query.class), eq(CollectionPoint.class));
        verify(mongo, never()).updateMulti(any(Query.class), any(Update.class), eq(CollectionPoint.class));
        verify(mongo, never()).insert(any(Document.class), eq(DataMigrations.COLLECTION));
    }
}
