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

        System.out.println("========== /api/scan RECEIVED ==========");

        if (request == null
                || request.getImage() == null
                || request.getImage().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Image is required."
            );
        }

        System.out.println(
                "Image received. Length: " + request.getImage().length()
        );

        ScanResponse response = scanService.scan(request);

        System.out.println(
                "========== /api/scan IDENTIFICATION COMPLETED =========="
        );

        return response;
    }

    // Get scan history for a specific user, if supplied.
    @GetMapping("/scan/history")
    public List<ScannedItem> scanHistory(
            @RequestParam(required = false) String userId
    ) {
        return scanService.scanHistory(userId);
    }

    // Confirm the AI-identified item.
    // ScanService is responsible for confirming the identification.
    @PostMapping("/scan/{itemId}/confirm")
    public ScanResponse confirmIdentification(
            @PathVariable String itemId
    ) {
        System.out.println(
                "========== ITEM IDENTIFICATION CONFIRMATION =========="
        );

        ScanResponse response =
                scanService.confirmIdentification(itemId);

        System.out.println(
                "========== ITEM IDENTIFICATION CONFIRMED =========="
        );

        return response;
    }

    // Correct an item's name and rerun recycling research.
    @PutMapping("/scan/{itemId}/correct")
    public ScanResponse correctItemName(
            @PathVariable String itemId,
            @RequestBody CorrectionRequest request
    ) {
        System.out.println(
                "========== ITEM CORRECTION RECEIVED =========="
        );

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

        // Save the corrected item identification.
        item.setName(correctedName);
        item.setIdentificationConfirmed(true);

        // Clear the old material prediction unless a new one is supplied.
        if (correctedMaterial != null
                && !correctedMaterial.isBlank()) {
            item.setMaterial(correctedMaterial);
        } else {
            item.setMaterial("");
        }

        // Reset the old recycling decision before researching again.
        item.setRecyclable(false);
        item.setRecyclingStatus("UNVERIFIED");
        item.setBin("unknown");
        item.setDescription(
                "Item identification corrected by the user. "
                        + "Checking recycling information again."
        );

        scannedItemRepository.save(item);

        System.out.println("Corrected item name: " + correctedName);
        System.out.println(
                "Corrected material: "
                        + (correctedMaterial == null
                        || correctedMaterial.isBlank()
                        ? "Not provided"
                        : correctedMaterial)
        );

        // Rerun recycling research using the corrected item.
        System.out.println(
                "========== RESTARTING RECYCLING LOOKUP =========="
        );

        ScanResponse response = scanService.loadRecycling(itemId);

        System.out.println(
                "========== RECYCLING LOOKUP COMPLETED =========="
        );

        if (response == null) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Recycling research did not return a result."
            );
        }

        // Return the complete updated result to the frontend.
        return response;
    }

    // Manually check recycling information again.
    @PostMapping("/recycling/{itemId}")
    public ScanResponse recycling(
            @PathVariable String itemId
    ) {
        return scanService.loadRecycling(itemId);
    }

    // Get the complete recycling catalog.
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

    // Retrieve all scan history.
    @GetMapping("/scan-history")
    public List<ScannedItem> getScanHistory() {
        return scannedItemRepository.findAll();
    }

    // Request body for correcting an item's name and optional material.
    public record CorrectionRequest(
            String name,
            String material
    ) {
    }
}