package br.com.ecicla.api.suggestion;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecicla.api.admin.PointInput;
import br.com.ecicla.api.auth.Authenticated;

/** Moderation of user suggestions. Only for administrators: see {@code AuthWebConfig}. */
@RestController
@RequestMapping("/api/admin/suggestions")
public class AdminSuggestionController {

    private final SuggestionService service;

    public AdminSuggestionController(SuggestionService service) {
        this.service = service;
    }

    record ApproveRequest(PointInput proposed, String reason) {
    }

    record RejectRequest(String reason) {
    }

    @GetMapping
    public List<SuggestionView> list(@RequestParam Optional<SuggestionStatus> status) {
        return service.listForAdmin(status);
    }

    @GetMapping("/{id}")
    public AdminSuggestionDetailView get(@PathVariable String id) {
        return service.findForAdmin(id).orElseThrow(AdminSuggestionController::notFound);
    }

    @PutMapping("/{id}/approve")
    public SuggestionView approve(
            Authenticated admin,
            @PathVariable String id,
            @RequestBody(required = false) ApproveRequest request) {
        try {
            Optional<PointInput> proposed = request == null ? Optional.empty() : Optional.ofNullable(request.proposed());
            Optional<String> reason = request == null ? Optional.empty() : Optional.ofNullable(request.reason());
            return service.approve(admin, id, proposed, reason).orElseThrow(AdminSuggestionController::notFound);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PutMapping("/{id}/reject")
    public SuggestionView reject(
            Authenticated admin,
            @PathVariable String id,
            @RequestBody RejectRequest request) {
        try {
            return service.reject(admin, id, request == null ? null : request.reason())
                    .orElseThrow(AdminSuggestionController::notFound);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Suggestion not found");
    }
}
