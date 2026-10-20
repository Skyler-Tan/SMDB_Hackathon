package com.threer.web;

import com.threer.repository.ReuseRecordRepository;
import com.threer.service.ReuseRecord;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * GET  /api/reuse/history?userId=...  -> the user's reuse history, newest first
 * POST /api/reuse/history              -> record one reuse event
 *
 * Uses its own path so it cannot clash with an existing POST /api/reuse/confirm.
 */
@RestController
@RequestMapping("/api/reuse/history")
public class ReuseHistoryController {

    /** Must match REUSE_POINTS in Profile.jsx. */
    private static final int REUSE_POINTS = 5;
    private static final int MAX_QUANTITY = 100;
    private static final String DEFAULT_USER = "demo-user";

    private final ReuseRecordRepository repository;

    public ReuseHistoryController(ReuseRecordRepository repository) {
        this.repository = repository;
    }

    public record ReuseRequest(String userId, String itemName, String idea, Integer quantity) {}

    @GetMapping
    public List<ReuseRecord> list(@RequestParam(required = false) String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(normaliseUser(userId));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ReuseRequest request) {
        String itemName = clean(request.itemName(), 120);
        if (itemName.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "itemName is required."));
        }

        int quantity = request.quantity() == null ? 1 : request.quantity();
        if (quantity < 1 || quantity > MAX_QUANTITY) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "quantity must be between 1 and " + MAX_QUANTITY + "."));
        }

        ReuseRecord record = new ReuseRecord();
        record.setUserId(normaliseUser(request.userId()));
        record.setItemName(itemName);
        record.setIdea(clean(request.idea(), 255));
        record.setQuantity(quantity);
        // Points are decided by the server, never trusted from the client.
        record.setPointsEarned(quantity * REUSE_POINTS);

        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(record));
    }

    private static String normaliseUser(String userId) {
        return userId == null || userId.isBlank() ? DEFAULT_USER : userId.trim();
    }

    private static String clean(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    }
}