package br.com.ecicla.api.suggestion;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecicla.api.auth.Authenticated;

/** Endpoints for signed-in users to submit, track, edit and delete their own suggestions. */
@RestController
@RequestMapping("/api/suggestions")
public class SuggestionController {

    private final SuggestionService service;

    public SuggestionController(SuggestionService service) {
        this.service = service;
    }

    @GetMapping
    public List<SuggestionView> listMine(Authenticated authenticated) {
        return service.listMine(authenticated);
    }

    @GetMapping("/{id}")
    public SuggestionView getMine(Authenticated authenticated, @PathVariable String id) {
        return service.findMine(authenticated, id).orElseThrow(SuggestionController::notFound);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SuggestionView create(Authenticated authenticated, @RequestBody SuggestionInput input) {
        try {
            return service.create(authenticated, input);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public SuggestionView updateMine(
            Authenticated authenticated,
            @PathVariable String id,
            @RequestBody SuggestionInput input) {
        try {
            return service.updateMine(authenticated, id, input).orElseThrow(SuggestionController::notFound);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMine(Authenticated authenticated, @PathVariable String id) {
        if (!service.deleteMine(authenticated, id)) {
            throw notFound();
        }
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Suggestion not found");
    }
}
