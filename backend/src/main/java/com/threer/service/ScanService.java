
package com.threer.service;

import com.threer.dto.ScanRequest;
import com.threer.dto.ScanResponse;
import com.threer.model.ScannedItem;
import com.threer.repository.ScannedItemRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class ScanService {

    private final HuggingFaceVisionService visionService;
    private final TavilySearchService tavilySearchService;
    private final ScannedItemRepository scannedItemRepository;
    private final ImpactService impactService;

    public ScanService(
            HuggingFaceVisionService visionService,
            TavilySearchService tavilySearchService,
            ScannedItemRepository scannedItemRepository,
            ImpactService impactService) {

        this.visionService = visionService;
        this.tavilySearchService = tavilySearchService;
        this.scannedItemRepository = scannedItemRepository;
        this.impactService = impactService;
    }

    /**
     * Identifies and saves an item.
     *
     * Recycling verification is deliberately handled by
     * loadRecycling(), called separately by the frontend.
     */
    public ScanResponse scan(ScanRequest request) {

        if (request == null
                || request.getImage() == null
                || request.getImage().isBlank()) {

            throw new IllegalArgumentException("Image is required.");
        }

        System.out.println("========== SCAN IDENTIFICATION ==========");

        // The initial scan makes the vision request only.
        HuggingFaceVisionService.VisionResult vision =
                visionService.analyzeImage(request.getImage());

        ImpactService.ImpactResult impact =
                impactService.calculate(
                        vision.material(),
                        vision.container()
                );

        // Save the identified item before doing any web lookup.
        ScannedItem item = new ScannedItem();

        item.setName(vision.item());
        item.setBrand(vision.brand());
        item.setSize(vision.size());
        item.setContainer(vision.container());
        item.setMaterial(vision.material());

        // Recycling status is unknown until loadRecycling() completes.
        item.setRecyclable(false);
        item.setBin("unknown");

        item.setDescription(
                vision.description()
                        + " Recycling information is being checked."
        );

        item.setConfidence(vision.confidence());
        item.setScannedAt(Instant.now());

        ScannedItem saved = scannedItemRepository.save(item);

        System.out.println("Saved scanned item: " + saved.getId());

        // Return the identification result without waiting for Tavily.
        return buildResponse(
                saved,
                impact,
                false,
                "unknown",
                "Recycling information is being checked.",
                0.0,
                0.0,
                0.0,
                0
        );
    }

    /**
     * Performs recycling verification after the initial scan.
     * The controller should expose this through the existing
     * recycling endpoint used by ApiService.recycling(itemId).
     */
    public ScanResponse loadRecycling(String itemId) {

        System.out.println("========== RECYCLING CHECK ==========");

        ScannedItem item = scannedItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Scanned item not found: " + itemId
                ));

        HuggingFaceVisionService.VisionResult vision =
                new HuggingFaceVisionService.VisionResult(
                        item.getName(),
                        item.getBrand(),
                        item.getSize(),
                        item.getContainer(),
                        item.getMaterial(),
                        item.getConfidence(),
                        item.getDescription()
                );

        System.out.println("Searching recycling information...");

        var searchResults =
                tavilySearchService.searchRecyclingInformation(
                        vision.item(),
                        vision.brand(),
                        vision.material()
                );

        System.out.println(
                "Recycling search results: " + searchResults.size()
        );

        HuggingFaceVisionService.RecyclingResult recycling;

        if (searchResults.isEmpty()) {
            recycling = new HuggingFaceVisionService.RecyclingResult(
                    false,
                    "unknown",
                    "",
                    "No reliable recycling information was found.",
                    0.0
            );
        } else {
            recycling = visionService.verifyRecycling(
                    vision,
                    searchResults
            );
        }

        ImpactService.ImpactResult impact =
                impactService.calculate(
                        item.getMaterial(),
                        item.getContainer()
                );

        boolean recyclable = recycling.recyclable();

        double waterLiters =
                recyclable ? impact.waterLiters() : 0.0;

        double co2Kg =
                recyclable ? impact.co2Kg() : 0.0;

        double materialGrams =
                recyclable ? impact.materialGrams() : 0.0;

        int rewardPoints =
                recyclable ? impact.rewardPoints() : 0;

        item.setRecyclable(recyclable);
        item.setBin(recycling.bin());

        StringBuilder description = new StringBuilder(
                vision.description() == null ? "" : vision.description()
        );

        if (recycling.instructions() != null
                && !recycling.instructions().isBlank()) {
            description.append(" ").append(recycling.instructions());
        }

        if (recycling.reason() != null
                && !recycling.reason().isBlank()) {
            description.append(" ").append(recycling.reason());
        }

        item.setDescription(description.toString().trim());

        ScannedItem saved = scannedItemRepository.save(item);

        System.out.println("Recyclable: " + saved.isRecyclable());
        System.out.println("Bin: " + saved.getBin());
        System.out.println("========== RECYCLING CHECK COMPLETE ==========");

        return buildResponse(
                saved,
                impact,
                saved.isRecyclable(),
                saved.getBin(),
                saved.getDescription(),
                waterLiters,
                co2Kg,
                materialGrams,
                rewardPoints
        );
    }

    private ScanResponse buildResponse(
            ScannedItem item,
            ImpactService.ImpactResult impact,
            boolean recyclable,
            String bin,
            String notes,
            double waterLiters,
            double co2Kg,
            double materialGrams,
            int rewardPoints) {

        ScanResponse response = new ScanResponse();

        response.setItemId(item.getId());
        response.setName(item.getName());
        response.setBrand(item.getBrand());
        response.setSize(item.getSize());
        response.setContainer(item.getContainer());
        response.setMaterial(item.getMaterial());

        response.setRecyclable(recyclable);
        response.setBin(bin);
        response.setNotes(notes);

        response.setWaterLiters(waterLiters);
        response.setCo2Kg(co2Kg);
        response.setMaterialGrams(materialGrams);
        response.setMaterialLabel(impact.materialLabel());
        response.setRewardPoints(rewardPoints);

        response.setMatchedLabel(item.getName());
        response.setConfidence(item.getConfidence());

        return response;
    }
}