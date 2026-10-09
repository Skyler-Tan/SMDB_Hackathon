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
    private final YoloVisionService yoloService;
    private final TavilySearchService tavilySearchService;
    private final ScannedItemRepository scannedItemRepository;
    private final ImpactService impactService;

    public ScanService(
            HuggingFaceVisionService visionService,
            YoloVisionService yoloService,
            TavilySearchService tavilySearchService,
            ScannedItemRepository scannedItemRepository,
            ImpactService impactService) {

        this.visionService = visionService;
        this.yoloService = yoloService;
        this.tavilySearchService = tavilySearchService;
        this.scannedItemRepository = scannedItemRepository;
        this.impactService = impactService;
    }

    public ScanResponse scan(ScanRequest request) {

        if (request.getImage() == null ||
                request.getImage().isBlank()) {

            throw new IllegalArgumentException(
                    "Image is required"
            );
        }

        /*
         * STEP 1:
         * Identify the item using YOLO (local ONNX model).
         *
         * This is the only AI call performed during
         * the initial scan.
         */

        System.out.println(
                "========== SCAN IDENTIFICATION =========="
        );

        HuggingFaceVisionService.VisionResult vision =
                yoloService.analyze(
                        request.getImage()
                );

        /*
         * STEP 2:
         * Calculate the material label only.
         *
         * Recycling information is NOT checked here.
         */

        ImpactService.ImpactResult impact =
                impactService.calculate(
                        vision.material(),
                        vision.container()
                );

        /*
         * STEP 3:
         * Save the identified item immediately.
         *
         * Recycling is temporarily marked as unknown.
         */

        ScannedItem item =
                new ScannedItem();

        item.setName(
                vision.item()
        );

        item.setBrand(
                vision.brand()
        );

        item.setSize(
                vision.size()
        );

        item.setContainer(
                vision.container()
        );

        item.setMaterial(
                vision.material()
        );

        item.setRecyclable(
                false
        );

        item.setBin(
                "unknown"
        );

        item.setDescription(
                vision.description()
                        + " Checking recycling information..."
        );

        item.setConfidence(
                vision.confidence()
        );

        item.setScannedAt(
                Instant.now()
        );

        ScannedItem saved =
                scannedItemRepository.save(
                        item
                );

        System.out.println(
                "Scan identification saved: "
                        + saved.getId()
        );

        /*
         * STEP 4:
         * Return the item immediately.
         *
         * No Tavily search.
         * No recycling verification.
         */

        ScanResponse response =
                new ScanResponse();

        response.setItemId(
                saved.getId()
        );

        response.setName(
                saved.getName()
        );

        response.setBrand(
                saved.getBrand()
        );

        response.setSize(
                saved.getSize()
        );

        response.setContainer(
                saved.getContainer()
        );

        response.setMaterial(
                saved.getMaterial()
        );

        response.setRecyclable(
                false
        );

        response.setBin(
                "unknown"
        );

        response.setNotes(
                saved.getDescription()
        );

        response.setWaterLiters(
                0.0
        );

        response.setCo2Kg(
                0.0
        );

        response.setMaterialGrams(
                0.0
        );

        response.setMaterialLabel(
                impact.materialLabel()
        );

        response.setRewardPoints(
                0
        );

        response.setMatchedLabel(
                saved.getName()
        );

        response.setConfidence(
                saved.getConfidence()
        );

        return response;
    }

    /*
     * Performs the slow recycling lookup AFTER the
     * initial scan has already returned.
     */
    public ScanResponse loadRecycling(
            String itemId) {

        System.out.println(
                "========== RECYCLING CHECK =========="
        );

        ScannedItem item =
                scannedItemRepository
                        .findById(itemId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Scanned item not found: "
                                                + itemId
                                )
                        );

        /*
         * Reconstruct the vision result from the
         * information already stored in MongoDB.
         */

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

        /*
         * STEP 1:
         * Search the web using Tavily.
         */

        System.out.println(
                "Searching recycling information..."
        );

        var searchResults =
                tavilySearchService
                        .searchRecyclingInformation(
                                vision.item(),
                                vision.brand(),
                                vision.material()
                        );

        System.out.println(
                "Web search returned "
                        + searchResults.size()
                        + " results."
        );

        /*
         * STEP 2:
         * Verify the recycling information using Gemma.
         */

        HuggingFaceVisionService.RecyclingResult recycling;

        if (searchResults.isEmpty()) {

            recycling =
                    new HuggingFaceVisionService.RecyclingResult(
                            false,
                            "unknown",
                            "",
                            "No reliable recycling information was found.",
                            0.0
                    );

        } else {

            recycling =
                    visionService.verifyRecycling(
                            vision,
                            searchResults
                    );
        }

        /*
         * STEP 3:
         * Calculate environmental impact.
         */

        ImpactService.ImpactResult impact =
                impactService.calculate(
                        item.getMaterial(),
                        item.getContainer()
                );

        double waterLiters =
                recycling.recyclable()
                        ? impact.waterLiters()
                        : 0.0;

        double co2Kg =
                recycling.recyclable()
                        ? impact.co2Kg()
                        : 0.0;

        double materialGrams =
                recycling.recyclable()
                        ? impact.materialGrams()
                        : 0.0;

        int rewardPoints =
                recycling.recyclable()
                        ? impact.rewardPoints()
                        : 0;

        /*
         * STEP 4:
         * Update the MongoDB item.
         */

        item.setRecyclable(
                recycling.recyclable()
        );

        item.setBin(
                recycling.bin()
        );

        String description =
                vision.description();

        if (!recycling.instructions().isBlank()) {

            description =
                    description
                            + " "
                            + recycling.instructions();
        }

        if (!recycling.reason().isBlank()) {

            description =
                    description
                            + " "
                            + recycling.reason();
        }

        item.setDescription(
                description.trim()
        );

        ScannedItem saved =
                scannedItemRepository.save(
                        item
                );

        /*
         * STEP 5:
         * Return the updated result.
         */

        ScanResponse response =
                new ScanResponse();

        response.setItemId(
                saved.getId()
        );

        response.setName(
                saved.getName()
        );

        response.setBrand(
                saved.getBrand()
        );

        response.setSize(
                saved.getSize()
        );

        response.setContainer(
                saved.getContainer()
        );

        response.setMaterial(
                saved.getMaterial()
        );

        response.setRecyclable(
                saved.isRecyclable()
        );

        response.setBin(
                saved.getBin()
        );

        response.setNotes(
                saved.getDescription()
        );

        response.setWaterLiters(
                waterLiters
        );

        response.setCo2Kg(
                co2Kg
        );

        response.setMaterialGrams(
                materialGrams
        );

        response.setMaterialLabel(
                impact.materialLabel()
        );

        response.setRewardPoints(
                rewardPoints
        );

        response.setMatchedLabel(
                saved.getName()
        );

        response.setConfidence(
                saved.getConfidence()
        );

        System.out.println(
                "========== RECYCLING CHECK COMPLETE =========="
        );

        return response;
    }
}