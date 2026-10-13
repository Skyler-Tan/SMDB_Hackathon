
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
import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:4200")
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

    @GetMapping("/scan/history")
    public List<ScannedItem> scanHistory(@RequestParam(required = false) String userId) {
        return scanService.scanHistory(userId);
    }

    @PostMapping("/scan/{itemId}/confirm")
    public ScanResponse confirmIdentification(@PathVariable String itemId) {
        return scanService.confirmIdentification(itemId);
    }

    @PutMapping("/scan/{itemId}/correct")
    public Map<String, Object> correctItemName(
            @PathVariable String itemId,
            @RequestBody Map<String, String> request
    ) {
        String correctedName = request == null ? null : request.get("name");

        if (correctedName == null || correctedName.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please enter the correct item name."
            );
        }

        correctedName = correctedName.trim();

        if (correctedName.length() > 150) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The item name must be 150 characters or fewer."
            );
        }

        ScannedItem item = scannedItemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Scanned item not found."
                ));

        item.setName(correctedName);
        item.setIdentificationConfirmed(true);

        // A correction invalidates any previous recycling decision.
        item.setRecyclable(false);
        item.setRecyclingStatus("UNVERIFIED");
        item.setBin("unknown");
        item.setDescription(
                "Item identification corrected by the user. "
                        + "Recycling information must be checked again."
        );

        scannedItemRepository.save(item);

        System.out.println(
                "User corrected and confirmed item name: " + correctedName
        );

        return Map.of(
                "success", true,
                "name", correctedName,
                "identificationConfirmed", true
        );
    }

    @PostMapping("/recycling/{itemId}")
    public ScanResponse recycling(@PathVariable String itemId) {
        return scanService.loadRecycling(itemId);
    }

    @GetMapping("/catalog")
    public List<CatalogItem> catalog() {
        return catalogItemRepository.findAll();
    }

    @GetMapping("/catalog/{id}")
    public CatalogItem item(@PathVariable String id) {
        return catalogItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Catalog item not found."
                ));
    }
}
