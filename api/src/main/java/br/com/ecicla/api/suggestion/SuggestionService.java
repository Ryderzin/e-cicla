package br.com.ecicla.api.suggestion;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.bson.types.ObjectId;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.Metrics;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecicla.api.admin.AdminPointView;
import br.com.ecicla.api.admin.PointInput;
import br.com.ecicla.api.auth.Authenticated;
import br.com.ecicla.api.auth.User;
import br.com.ecicla.api.auth.UserRepository;
import br.com.ecicla.api.point.CollectionPoint;
import br.com.ecicla.api.point.CollectionPointRepository;
import br.com.ecicla.api.point.NearbyPoint;
import br.com.ecicla.api.point.PointSource;
import br.com.ecicla.api.point.PointStatus;
import br.com.ecicla.api.point.SourceType;

/**
 * User suggestions of new collection points or updates to existing points, and their moderation by
 * administrators.
 */
@Service
public class SuggestionService {

    /** Active points within 250 m are flagged as possible duplicates during moderation (PB25). */
    static final Distance DUPLICATE_RADIUS = new Distance(0.25, Metrics.KILOMETERS);
    static final int REASON_MAX = 500;

    private final SuggestionRepository suggestions;
    private final CollectionPointRepository points;
    private final UserRepository users;

    public SuggestionService(
            SuggestionRepository suggestions,
            CollectionPointRepository points,
            UserRepository users) {
        this.suggestions = suggestions;
        this.points = points;
        this.users = users;
    }

    public List<SuggestionView> listMine(Authenticated authenticated) {
        return toViews(suggestions.findByUserIdOrderByCreatedAtDesc(authenticated.user().id()));
    }

    public Optional<SuggestionView> findMine(Authenticated authenticated, String id) {
        return findOwned(authenticated, id).map(this::toView);
    }

    public SuggestionView create(Authenticated authenticated, SuggestionInput input) {
        SuggestionInput valid = input.validated();
        CollectionPoint target = null;
        if (valid.type() == SuggestionType.POINT_UPDATE) {
            target = findPoint(valid.pointId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection point not found"));
        }
        Instant now = Instant.now();
        Suggestion saved = suggestions.save(new Suggestion(
                null,
                authenticated.user().id(),
                valid.type(),
                valid.pointId(),
                ProposedPoint.from(valid.proposed()),
                valid.comment(),
                SuggestionStatus.PENDING,
                null,
                now,
                now));
        return SuggestionView.from(saved, target == null ? null : target.name());
    }

    public Optional<SuggestionView> updateMine(Authenticated authenticated, String id, SuggestionInput input) {
        PointInput validProposed = input.proposed() == null ? null : input.proposed().validated();
        if (validProposed == null) {
            throw new IllegalArgumentException("proposed point details are required");
        }
        String cleanComment = trimMax("comment", input.comment(), SuggestionInput.COMMENT_MAX);
        return findOwned(authenticated, id).map(stored -> {
            requirePending(stored, "Only pending suggestions can be edited");
            Suggestion updated = suggestions.save(new Suggestion(
                    stored.id(),
                    stored.userId(),
                    stored.type(),
                    stored.pointId(),
                    ProposedPoint.from(validProposed),
                    cleanComment,
                    stored.status(),
                    stored.review(),
                    stored.createdAt(),
                    Instant.now()));
            return toView(updated);
        });
    }

    public boolean deleteMine(Authenticated authenticated, String id) {
        return findOwned(authenticated, id).map(stored -> {
            requirePending(stored, "Only pending suggestions can be deleted");
            suggestions.deleteById(stored.id());
            return true;
        }).orElse(false);
    }

    public List<SuggestionView> listForAdmin(Optional<SuggestionStatus> status) {
        List<Suggestion> list = status
                .map(s -> s == SuggestionStatus.PENDING
                        ? suggestions.findByStatusOrderByCreatedAtAsc(s)
                        : suggestions.findAllByOrderByCreatedAtDesc().stream().filter(item -> item.status() == s).toList())
                .orElseGet(suggestions::findAllByOrderByCreatedAtDesc);
        return toViews(list);
    }

    public Optional<AdminSuggestionDetailView> findForAdmin(String id) {
        return findSuggestion(id).map(suggestion -> {
            User author = suggestion.userId() != null && ObjectId.isValid(suggestion.userId())
                    ? users.findById(suggestion.userId()).orElse(null)
                    : null;
            CollectionPoint target = suggestion.pointId() != null
                    ? findPoint(suggestion.pointId()).orElse(null)
                    : null;
            List<NearbyPoint> duplicates = findNearbyDuplicates(suggestion);
            return new AdminSuggestionDetailView(
                    SuggestionView.from(suggestion, target == null ? null : target.name()),
                    author == null ? null : author.name(),
                    author == null ? null : author.email(),
                    target == null ? null : AdminPointView.from(target),
                    duplicates);
        });
    }

    public Optional<SuggestionView> approve(
            Authenticated admin,
            String id,
            Optional<PointInput> overrideProposed,
            Optional<String> reason) {
        Optional<PointInput> validOverride = overrideProposed.map(PointInput::validated);
        String cleanReason = trimMax("reason", reason.orElse(null), REASON_MAX);
        return findSuggestion(id).map(stored -> {
            requirePending(stored, "Suggestion has already been reviewed");
            ProposedPoint finalProposed = validOverride.map(ProposedPoint::from).orElse(stored.proposed());
            Instant now = Instant.now();
            CollectionPoint savedPoint;
            if (stored.type() == SuggestionType.NEW_POINT) {
                savedPoint = points.save(new CollectionPoint(
                        null,
                        finalProposed.name(),
                        new GeoJsonPoint(finalProposed.longitude(), finalProposed.latitude()),
                        finalProposed.address(),
                        false,
                        finalProposed.acceptedMaterials(),
                        finalProposed.openingHours(),
                        finalProposed.operator(),
                        finalProposed.notes(),
                        new PointSource(SourceType.SUGGESTION, "suggestion/" + stored.id(), now),
                        PointStatus.ACTIVE,
                        now,
                        now));
            } else {
                CollectionPoint current = findPoint(stored.pointId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.CONFLICT, "The target collection point no longer exists"));
                boolean approximate = Boolean.TRUE.equals(current.addressApproximate())
                        && finalProposed.address() != null
                        && finalProposed.address().equals(current.address());
                savedPoint = points.save(new CollectionPoint(
                        current.id(),
                        finalProposed.name(),
                        new GeoJsonPoint(finalProposed.longitude(), finalProposed.latitude()),
                        finalProposed.address(),
                        approximate,
                        finalProposed.acceptedMaterials(),
                        finalProposed.openingHours(),
                        finalProposed.operator(),
                        finalProposed.notes(),
                        current.source(),
                        current.status(),
                        now,
                        now));
            }
            Suggestion approved = suggestions.save(new Suggestion(
                    stored.id(),
                    stored.userId(),
                    stored.type(),
                    savedPoint.id(),
                    finalProposed,
                    stored.comment(),
                    SuggestionStatus.APPROVED,
                    new SuggestionReview(admin.user().id(), now, cleanReason),
                    stored.createdAt(),
                    now));
            return SuggestionView.from(approved, savedPoint.name());
        });
    }

    public Optional<SuggestionView> reject(Authenticated admin, String id, String reason) {
        String cleanReason = trimMax("reason", reason, REASON_MAX);
        if (cleanReason == null) {
            throw new IllegalArgumentException("reason is required when rejecting a suggestion");
        }
        return findSuggestion(id).map(stored -> {
            requirePending(stored, "Suggestion has already been reviewed");
            Instant now = Instant.now();
            Suggestion rejected = suggestions.save(new Suggestion(
                    stored.id(),
                    stored.userId(),
                    stored.type(),
                    stored.pointId(),
                    stored.proposed(),
                    stored.comment(),
                    SuggestionStatus.REJECTED,
                    new SuggestionReview(admin.user().id(), now, cleanReason),
                    stored.createdAt(),
                    now));
            return toView(rejected);
        });
    }

    private List<NearbyPoint> findNearbyDuplicates(Suggestion suggestion) {
        ProposedPoint p = suggestion.proposed();
        GeoJsonPoint origin = new GeoJsonPoint(p.longitude(), p.latitude());
        return points.findActiveNear(origin, DUPLICATE_RADIUS).getContent().stream()
                .filter(result -> !Objects.equals(result.getContent().id(), suggestion.pointId()))
                .map(result -> NearbyPoint.from(
                        result.getContent(),
                        Math.round(result.getDistance().in(Metrics.KILOMETERS).getValue() * 1000)))
                .toList();
    }

    private List<SuggestionView> toViews(List<Suggestion> list) {
        Set<String> pointIds = list.stream()
                .map(Suggestion::pointId)
                .filter(id -> id != null && ObjectId.isValid(id))
                .collect(Collectors.toSet());
        Map<String, String> pointNames = pointIds.isEmpty()
                ? Map.of()
                : points.findAllById(pointIds).stream()
                        .filter(p -> p.name() != null)
                        .collect(Collectors.toMap(CollectionPoint::id, CollectionPoint::name, (a, b) -> a));
        return list.stream()
                .map(s -> SuggestionView.from(s, s.pointId() == null ? null : pointNames.get(s.pointId())))
                .toList();
    }

    private SuggestionView toView(Suggestion suggestion) {
        String pointName = suggestion.pointId() != null
                ? findPoint(suggestion.pointId()).map(CollectionPoint::name).orElse(null)
                : null;
        return SuggestionView.from(suggestion, pointName);
    }

    private Optional<Suggestion> findOwned(Authenticated authenticated, String id) {
        return findSuggestion(id).filter(s -> Objects.equals(s.userId(), authenticated.user().id()));
    }

    private Optional<Suggestion> findSuggestion(String id) {
        return ObjectId.isValid(id) ? suggestions.findById(id) : Optional.empty();
    }

    private Optional<CollectionPoint> findPoint(String id) {
        return id != null && ObjectId.isValid(id) ? points.findById(id) : Optional.empty();
    }

    private static void requirePending(Suggestion suggestion, String message) {
        if (suggestion.status() != SuggestionStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, message);
        }
    }

    private static String trimMax(String field, String value, int max) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.strip();
        if (trimmed.length() > max) {
            throw new IllegalArgumentException(field + " must have at most " + max + " characters");
        }
        return trimmed;
    }
}
