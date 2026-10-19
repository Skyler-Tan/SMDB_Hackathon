package com.threer.controller;

import com.threer.dto.ListingRequest;
import com.threer.dto.ReportRequest;
import com.threer.dto.StatusRequest;
import com.threer.model.Listing;
import com.threer.service.ListingService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Second-hand marketplace: /api/market/listings
@RestController
@RequestMapping("/api/market/listings")
public class MarketController {

    private final ListingService listingService;

    public MarketController(ListingService listingService) {
        this.listingService = listingService;
    }

    // GET /api/market/listings
    @GetMapping
    public List<Listing> list() {
        return listingService.findAll();
    }

    // GET /api/market/listings/{id}
    @GetMapping("/{id}")
    public Listing get(@PathVariable String id) {
        return listingService.get(id);
    }

    // POST /api/market/listings
    @PostMapping
    public ResponseEntity<Listing> create(@RequestBody ListingRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(listingService.create(request));
    }

    // PUT /api/market/listings/{id}
    @PutMapping("/{id}")
    public Listing update(
            @PathVariable String id,
            @RequestBody ListingRequest request
    ) {
        return listingService.update(id, request);
    }

    // PATCH /api/market/listings/{id}/status
    @PatchMapping("/{id}/status")
    public Listing updateStatus(
            @PathVariable String id,
            @RequestBody StatusRequest request
    ) {
        return listingService.updateStatus(id, request);
    }

    // DELETE /api/market/listings/{id}?userId=...
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String id,
            @RequestParam(required = false) String userId
    ) {
        listingService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    // POST /api/market/listings/{id}/report
    @PostMapping("/{id}/report")
    public ResponseEntity<Void> report(
            @PathVariable String id,
            @RequestBody(required = false) ReportRequest request
    ) {
        listingService.report(id, request);
        return ResponseEntity.ok().build();
    }
}