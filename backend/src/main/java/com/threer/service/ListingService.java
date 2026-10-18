package com.threer.service;

import com.threer.dto.ListingRequest;
import com.threer.dto.ReportRequest;
import com.threer.dto.StatusRequest;
import com.threer.model.Listing;
import com.threer.repository.ListingRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class ListingService {

    private static final int MAX_PHOTOS = 4;
    private static final int MAX_PHOTO_CHARS = 3_000_000; // ~2 MB of image data
    private static final int MAX_TITLE = 80;
    private static final int MAX_DESCRIPTION = 1000;
    private static final Set<String> STATUSES =
            Set.of("AVAILABLE", "RESERVED", "SOLD");

    private final ListingRepository listingRepository;

    public ListingService(ListingRepository listingRepository) {
        this.listingRepository = listingRepository;
    }

    // All listings, newest first.
    public List<Listing> findAll() {
        return listingRepository.findAllByOrderByCreatedAtDesc();
    }

    public Listing get(String id) {
        return find(id);
    }

    public Listing create(ListingRequest request) {
        if (request == null) {
            throw bad("Listing details are required.");
        }

        Listing listing = new Listing();
        apply(listing, request);

        listing.setSellerId(resolveUser(request.sellerId()));
        String name = clean(request.sellerName());
        listing.setSellerName(name.isEmpty() ? listing.getSellerId() : name);
        listing.setStatus("AVAILABLE");
        listing.setCreatedAt(Instant.now());
        listing.setUpdatedAt(listing.getCreatedAt());

        Listing saved = listingRepository.save(listing);
        System.out.println("Created listing: " + saved.getId());
        return saved;
    }

    public Listing update(String id, ListingRequest request) {
        if (request == null) {
            throw bad("Listing details are required.");
        }

        Listing listing = find(id);
        requireOwner(listing, request.sellerId());

        apply(listing, request);
        listing.setUpdatedAt(Instant.now());

        return listingRepository.save(listing);
    }

    public Listing updateStatus(String id, StatusRequest request) {
        if (request == null || request.status() == null) {
            throw bad("Status is required.");
        }

        String status = request.status().trim().toUpperCase(Locale.ROOT);

        if (!STATUSES.contains(status)) {
            throw bad("Status must be AVAILABLE, RESERVED or SOLD.");
        }

        Listing listing = find(id);
        requireOwner(listing, request.userId());

        listing.setStatus(status);
        listing.setUpdatedAt(Instant.now());

        return listingRepository.save(listing);
    }

    public void delete(String id, String userId) {
        Listing listing = find(id);
        requireOwner(listing, userId);

        listingRepository.delete(listing);
        System.out.println("Deleted listing: " + id);
    }

    public void report(String id, ReportRequest request) {
        Listing listing = find(id);

        String reporter = resolveUser(request == null ? null : request.userId());

        if (reporter.equals(listing.getSellerId())) {
            throw bad("You cannot report your own listing.");
        }

        String reason = clean(request == null ? null : request.reason());

        if (reason.isEmpty()) {
            reason = "Other";
        }

        if (reason.length() > 100) {
            reason = reason.substring(0, 100);
        }

        List<String> reports = listing.getReports() == null
                ? new ArrayList<>()
                : listing.getReports();

        // One report per user per listing.
        boolean alreadyReported = reports.stream()
                .anyMatch(entry -> entry.startsWith(reporter + "|"));

        if (alreadyReported) {
            return;
        }

        reports.add(reporter + "|" + reason);
        listing.setReports(reports);
        listing.setReportCount(reports.size());

        listingRepository.save(listing);
        System.out.println("Listing " + id + " reported: " + reason);
    }

    // ── Helpers ──────────────────────────────────────────────

    // Validate the request and copy its fields onto the listing.
    private void apply(Listing listing, ListingRequest request) {

        String title = clean(request.title());
        if (title.isEmpty()) {
            throw bad("Title is required.");
        }
        if (title.length() > MAX_TITLE) {
            throw bad("Title must be " + MAX_TITLE + " characters or fewer.");
        }

        String category = clean(request.category());
        if (category.isEmpty()) {
            throw bad("Category is required.");
        }

        String condition = clean(request.condition());
        if (condition.isEmpty()) {
            throw bad("Condition is required.");
        }

        boolean free = Boolean.TRUE.equals(request.isFree());
        double price = 0;

        if (!free) {
            price = request.price() == null ? 0 : request.price();

            if (Double.isNaN(price) || Double.isInfinite(price) || price <= 0) {
                throw bad("Enter a price above 0, or mark the item as free.");
            }
        }

        String location = clean(request.location());
        if (location.isEmpty()) {
            throw bad("Pickup location is required.");
        }

        String contact = clean(request.contact());
        if (contact.isEmpty()) {
            throw bad("Contact details are required.");
        }

        String description = clean(request.description());
        if (description.length() > MAX_DESCRIPTION) {
            throw bad("Description must be " + MAX_DESCRIPTION
                    + " characters or fewer.");
        }

        List<String> photos = request.photos() == null
                ? List.of()
                : request.photos();

        if (photos.size() > MAX_PHOTOS) {
            throw bad("You can add up to " + MAX_PHOTOS + " photos.");
        }

        for (String photo : photos) {
            if (photo == null || !photo.startsWith("data:image/")) {
                throw bad("Photos must be image files.");
            }
            if (photo.length() > MAX_PHOTO_CHARS) {
                throw bad("One of the photos is too large.");
            }
        }

        listing.setTitle(title);
        listing.setDescription(description);
        listing.setCategory(category);
        listing.setCondition(condition);
        listing.setIsFree(free);
        listing.setPrice(price);
        listing.setLocation(location);
        listing.setContact(contact);
        listing.setPhotos(new ArrayList<>(photos));
    }

    private Listing find(String id) {
        return listingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Listing not found."
                ));
    }

    // Only the seller may change or remove a listing.
    // The user id comes from the client, so this guards against mistakes,
    // not against a determined attacker. Add real authentication for that.
    private void requireOwner(Listing listing, String userId) {
        if (!resolveUser(userId).equals(listing.getSellerId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You can only change your own listings."
            );
        }
    }

    private String resolveUser(String userId) {
        return userId == null || userId.isBlank() ? "demo-user" : userId.trim();
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}