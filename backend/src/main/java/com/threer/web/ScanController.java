package com.threer.web;

import com.threer.dto.ScanRequest;
import com.threer.dto.ScanResponse;
import com.threer.model.CatalogItem;
import com.threer.model.ScannedItem;
import com.threer.repository.CatalogItemRepository;
import com.threer.repository.ScannedItemRepository;
import com.threer.service.ScanService;

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
@RequestMapping("/api")
public class ScanController {

    private final ScanService scanService;
    private final CatalogItemRepository catalogItemRepository;
    private final ScannedItemRepository scannedItemRepository;

    public ScanController(
            ScanService scanService,
            CatalogItemRepository catalogItemRepository,
            ScannedItemRepository scannedItemRepository
    ) {
        this.scanService = scanService;
        this.catalogItemRepository = catalogItemRepository;
        this.scannedItemRepository = scannedItemRepository;
    }

    // Scan an image and identify the item.
    @PostMapping("/scan")
    public ScanResponse scan(@RequestBody ScanRequest request) {
        return scanService.scan(request);
    }

    // Get scan history for a user.
    @GetMapping("/scan/history")
    public List<ScannedItem> scanHistory(
            @RequestParam(required = false) String userId
    ) {
        return scanService.scanHistory(userId);
    }

    // Confirm an AI-identified item and check recycling.
    @PostMapping("/scan/{itemId}/confirm")
    public ScanResponse confirmIdentification(
            @PathVariable String itemId
    ) {
        return scanService.confirmIdentification(itemId);
    }

    // Correct an AI-identified item and repeat recycling research.
    @PutMapping("/scan/{itemId}/correct")
    public ScanResponse correctItemName(
            @PathVariable String itemId,
            @RequestBody CorrectionRequest request
    ) {
        if (request == null
                || request.name() == null
                || request.name().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please enter the correct item name."
            );
        }

        String correctedName = request.name().trim();

        if (correctedName.length() > 150) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The item name must be 150 characters or fewer."
            );
        }

        String correctedMaterial = request.material();

        if (correctedMaterial != null) {
            correctedMaterial = correctedMaterial.trim();

            if (correctedMaterial.length() > 100) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Material must be 100 characters or fewer."
                );
            }
        }

        ScannedItem item = scannedItemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Scanned item not found."
                ));

        item.setName(correctedName);
        item.setIdentificationConfirmed(true);

        if (correctedMaterial != null
                && !correctedMaterial.isBlank()) {
            item.setMaterial(correctedMaterial);
        } else {
            item.setMaterial("");
        }

        item.setRecyclable(false);
        item.setRecyclingStatus("UNVERIFIED");
        item.setBin("unknown");
        item.setDescription(
                "Item identification corrected. "
                        + "Checking recycling information again."
        );

        scannedItemRepository.save(item);

        return scanService.loadRecycling(itemId);
    }

    // Recheck recycling for an existing scanned item.
    @PostMapping("/recycling/{itemId}")
    public ScanResponse recycling(
            @PathVariable String itemId
    ) {
        return scanService.loadRecycling(itemId);
    }

    // Get the recycling catalog.
    @GetMapping("/catalog")
    public List<CatalogItem> catalog() {
        return catalogItemRepository.findAll();
    }

    // Get one catalog item.
    @GetMapping("/catalog/{id}")
    public CatalogItem item(@PathVariable String id) {
        return catalogItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Catalog item not found."
                ));
    }

    // NEW: Select a catalog item and check its recycling information.
    @PostMapping("/catalog/{id}/recycling")
    public ScanResponse catalogRecycling(
            @PathVariable String id,
            @RequestParam(required = false) String userId
    ) {
        CatalogItem catalogItem = catalogItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Catalog item not found."
                ));

        ScannedItem item = new ScannedItem();

        item.setName(catalogItem.getName());
        item.setMaterial(catalogItem.getMaterial());

        item.setUserId(
                userId == null || userId.isBlank()
                        ? "demo-user"
                        : userId
        );

        // The user explicitly selected this catalog entry.
        item.setIdentificationConfirmed(true);
        item.setRecyclable(false);
        item.setRecyclingStatus("UNVERIFIED");
        item.setBin("unknown");
        item.setDescription(
                "Item selected manually from the recycling catalog."
        );

        ScannedItem saved = scannedItemRepository.save(item);

        System.out.println(
                "Catalog item selected: " + catalogItem.getName()
        );
        System.out.println(
                "Created scanned-item ID: " + saved.getId()
        );

        // Reuse the existing Tavily recycling verification.
        return scanService.loadRecycling(saved.getId());
    }

    // Retrieve all scan history.
    @GetMapping("/scan-history")
    public List<ScannedItem> getScanHistory() {
        return scannedItemRepository.findAll();
    }

    public record CorrectionRequest(
            String name,
            String material
    ) {
    }
}