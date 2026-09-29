package br.com.ecicla.api.point;

import java.util.List;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

@Service
public class PointService {

    private final CollectionPointRepository repository;

    public PointService(CollectionPointRepository repository) {
        this.repository = repository;
    }

    public List<PointSummary> listActive(Optional<BoundingBox> area) {
        List<CollectionPoint> points = area
                .map(box -> repository.findByStatusAndLocationWithin(PointStatus.ACTIVE, box.toPolygon()))
                .orElseGet(() -> repository.findByStatus(PointStatus.ACTIVE));
        return points.stream().map(PointSummary::from).toList();
    }

    public Optional<PointDetails> findActive(String id) {
        // Ids are ObjectIds; anything else cannot exist, so it is simply "not found".
        if (!ObjectId.isValid(id)) {
            return Optional.empty();
        }
        return repository.findByIdAndStatus(id, PointStatus.ACTIVE).map(PointDetails::from);
    }
}
