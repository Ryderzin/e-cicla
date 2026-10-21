package br.com.ecicla.api.suggestion;

import java.util.List;

import br.com.ecicla.api.admin.AdminPointView;
import br.com.ecicla.api.point.NearbyPoint;

/**
 * Full view of a suggestion for an administrator: includes the author, the current point (when
 * suggesting an update) and nearby active points that might be duplicates (PB25).
 */
public record AdminSuggestionDetailView(
        SuggestionView suggestion,
        String authorName,
        String authorEmail,
        AdminPointView targetPoint,
        List<NearbyPoint> nearbyDuplicates) {
}
