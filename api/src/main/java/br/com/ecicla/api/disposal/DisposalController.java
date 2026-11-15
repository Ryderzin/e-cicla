package br.com.ecicla.api.disposal;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecicla.api.auth.Authenticated;

/** The signed-in user's deliveries (PB15) and history (PB16). */
@RestController
@RequestMapping("/api/disposals")
public class DisposalController {

    private final DisposalService service;

    public DisposalController(DisposalService service) {
        this.service = service;
    }

    @GetMapping
    public DisposalView.History history(Authenticated authenticated) {
        return service.history(authenticated);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DisposalView create(Authenticated authenticated, @RequestBody DisposalInput input) {
        return service.create(authenticated, input);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authenticated authenticated, @PathVariable String id) {
        if (!service.delete(authenticated, id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Disposal not found");
        }
    }

    /** 422 with what the point accepts, so the site can explain the warning (PB11). */
    @ExceptionHandler(NotAcceptedException.class)
    ResponseEntity<Map<String, Object>> notAccepted(NotAcceptedException e) {
        return ResponseEntity.unprocessableEntity().body(Map.of("code", "NOT_ACCEPTED", "accepted", e.accepted()));
    }
}
