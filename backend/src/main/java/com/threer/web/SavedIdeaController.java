package com.threer.web;

import com.threer.model.SavedIdea;
import com.threer.repository.SavedIdeaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@CrossOrigin(origins = {
        "https://sampies-web.onrender.com",
        "http://localhost:5173",
        "http://localhost:4200"
})
@RequestMapping("/api/ideas/saved")
public class SavedIdeaController {

    private final SavedIdeaRepository repository;

    public SavedIdeaController(SavedIdeaRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<SavedIdea> list(@RequestParam String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId.trim());
    }

    @PostMapping
    public SavedIdea save(@RequestBody SavedIdea body) {
        if (body.getUserId() == null || body.getUserId().isBlank()
                || body.getIdeaKey() == null || body.getIdeaKey().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "userId and ideaKey are required.");
        }

        String userId = body.getUserId().trim();
        String ideaKey = body.getIdeaKey().trim();

        // Already saved: return the existing record instead of a duplicate.
        return repository.findByUserIdAndIdeaKey(userId, ideaKey)
                .orElseGet(() -> {
                    body.setId(null);
                    body.setUserId(userId);
                    body.setIdeaKey(ideaKey);
                    body.setCreatedAt(java.time.Instant.now());
                    return repository.save(body);
                });
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id, @RequestParam String userId) {
        SavedIdea idea = repository.findByIdAndUserId(id, userId.trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Saved idea not found."));

        repository.delete(idea);
    }
}