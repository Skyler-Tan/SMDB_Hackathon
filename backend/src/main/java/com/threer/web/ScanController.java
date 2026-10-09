package com.threer.web;

import com.threer.dto.ScanRequest;
import com.threer.dto.ScanResponse;
import com.threer.model.CatalogItem;
import com.threer.repository.CatalogItemRepository;
import com.threer.service.ScanService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@CrossOrigin(origins = "http://localhost:4200")
@RequestMapping("/api")
public class ScanController {

    private final ScanService scanService;
    private final CatalogItemRepository catalogItemRepository;

    public ScanController(
            ScanService scanService,
            CatalogItemRepository catalogItemRepository) {

        this.scanService = scanService;
        this.catalogItemRepository = catalogItemRepository;
    }

    @PostMapping("/scan")
    public ScanResponse scan(
            @RequestBody ScanRequest request) {

        System.out.println(
                "========== /api/scan RECEIVED =========="
        );

        if (request.getImage() == null ||
                request.getImage().isBlank()) {

            System.out.println(
                    "ERROR: Image is empty"
            );

        } else {

            System.out.println(
                    "Image received. Length: "
                            + request.getImage().length()
            );
        }

        System.out.println(
                "Sending image to ScanService..."
        );

        ScanResponse response =
                scanService.scan(request);

        System.out.println(
                "========== /api/scan IDENTIFICATION COMPLETED =========="
        );

        return response;
    }

    @PostMapping("/recycling/{itemId}")
    public ScanResponse recycling(
            @PathVariable String itemId) {

        System.out.println(
                "========== /api/recycling RECEIVED =========="
        );

        return scanService.loadRecycling(
                itemId
        );
    }

    @GetMapping("/catalog")
    public List<CatalogItem> catalog() {

        return catalogItemRepository.findAll();
    }

    @GetMapping("/catalog/{id}")
    public CatalogItem item(
            @PathVariable String id) {

        return catalogItemRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Catalog item not found"
                        )
                );
    }
}