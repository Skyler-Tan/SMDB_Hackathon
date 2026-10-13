
package com.threer.service;

import com.threer.dto.ScanRequest;
import com.threer.dto.ScanResponse;
import com.threer.model.ScannedItem;
import com.threer.repository.ScannedItemRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
public class ScanService {

    private static final long RECYCLING_TIMEOUT_SECONDS = 10;

    private final GroqVisionService visionService;
    private final TavilySearchService tavilySearchService;
    private final ScannedItemRepository scannedItemRepository;
    private final ImpactService impactService;
    private final ConditionService conditionService;

    public ScanService(
            GroqVisionService visionService,
            TavilySearchService tavilySearchService,
            ScannedItemRepository scannedItemRepository,
            ImpactService impactService,
            ConditionService conditionService
    ) {
        this.visionService = visionService;
        this.tavilySearchService = tavilySearchService;
        this.scannedItemRepository = scannedItemRepository;
        this.impactService = impactService;
        this.conditionService = conditionService;
    }

    // Identify an item, save it, and verify recycling automatically
    // when identification confidence is at least 80%.
    public ScanResponse scan(ScanRequest request) {

        if (request == null
                || request.getImage() == null
                || request.getImage().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Image is required for scanning."
            );
        }

        GroqVisionService.VisionResult vision;

        try {
            System.out.println("========== GROQ VISION ==========");

            vision = visionService.analyzeImage(request.getImage());

        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            System.err.println(
                    "Groq identification failed: " + e.getMessage()
            );

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Unable to identify this item. Please try again."
            );
        }

        if (vision == null
                || vision.item() == null
                || vision.item().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "The AI could not identify this item."
            );
        }

        ScannedItem item = new ScannedItem();

        item.setName(vision.item());
        item.setBrand(vision.brand());
        item.setSize(vision.size());
        item.setContainer(vision.container());
        item.setMaterial(vision.material());
        item.setConfidence(vision.confidence());

        String userId =
                request.getUserId() == null
                        || request.getUserId().isBlank()
                        ? "demo-user"
                        : request.getUserId();

        item.setUserId(userId);

        boolean confirmed =
                toConfidencePercent(vision.confidence()) >= 80.0;

        item.setIdentificationConfirmed(confirmed);
        item.setRecyclable(false);
        item.setRecyclingStatus("UNVERIFIED");
        item.setBin("unknown");
        item.setDescription(
                "Recycling information has not been verified yet."
        );

        ScannedItem saved = scannedItemRepository.save(item);

        System.out.println("Saved scanned item: " + saved.getId());
        System.out.println("Identified item: " + saved.getName());
        System.out.println("Material: " + saved.getMaterial());
        System.out.println("Identification confirmed: " + confirmed);

        if (confirmed) {
            System.out.println(
                    "========== AUTOMATIC RECYCLING VERIFICATION =========="
            );

            return loadRecycling(saved.getId());
        }

        return buildResponse(
                saved,
                "Please confirm the identified item before checking recycling information.",
                0
        );
    }

    // Confirm identification and immediately verify recycling.
    public ScanResponse confirmIdentification(String itemId) {

        ScannedItem item = findItem(itemId);

        item.setIdentificationConfirmed(true);
        scannedItemRepository.save(item);

        System.out.println(
                "Identification confirmed. Starting recycling verification: "
                        + itemId
        );

        return loadRecycling(itemId);
    }

    // Search Tavily, classify the results, and save the decision.
    public ScanResponse loadRecycling(String itemId) {

        ScannedItem item = findItem(itemId);

        if (!item.isIdentificationConfirmed()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Please confirm the item's identification first."
            );
        }

        System.out.println("========== TAVILY SEARCH STARTED ==========");
        System.out.println("Item: " + item.getName());
        System.out.println("Brand: " + safe(item.getBrand()));
        System.out.println("Material: " + safe(item.getMaterial()));

        List<TavilySearchService.SearchResult> results;

        try {
            results = CompletableFuture.supplyAsync(() ->
                    tavilySearchService.searchRecyclingInformation(
                            item.getName(),
                            item.getBrand(),
                            item.getMaterial()
                    )
            ).orTimeout(
                    RECYCLING_TIMEOUT_SECONDS,
                    TimeUnit.SECONDS
            ).join();

            if (results == null) {
                results = List.of();
            }

            System.out.println(
                    "Tavily search completed. Results: " + results.size()
            );

        } catch (Exception e) {
            System.err.println(
                    "Tavily search failed or timed out: " + e.getMessage()
            );

            results = List.of();
        }

        RecyclingDecision decision = classifyRecycling(item, results);

        item.setRecyclingStatus(decision.status());
        item.setRecyclable("RECYCLABLE".equals(decision.status()));
        item.setBin(decision.bin());

        String description = decision.reason();

        if (!decision.sources().isEmpty()) {
            description += "\n\nSources: "
                    + String.join(" | ", decision.sources());
        }

        item.setDescription(description);

        ScannedItem saved = scannedItemRepository.save(item);

        int points = 0;

        if ("RECYCLABLE".equals(saved.getRecyclingStatus())
                && saved.getBin() != null
                && !saved.getBin().equalsIgnoreCase("unknown")
                && !saved.getBin().equalsIgnoreCase("other")) {

            points = impactService.calculate(
                    saved.getMaterial(),
                    saved.getContainer()
            ).rewardPoints();
        }

        System.out.println("========== RECYCLING DECISION ==========");
        System.out.println("Item: " + saved.getName());
        System.out.println("Status: " + saved.getRecyclingStatus());
        System.out.println("Bin: " + saved.getBin());
        System.out.println("Sources: " + decision.sources().size());

        return buildResponse(saved, description, points);
    }

    // Retrieve a user's scan history, newest scans first.
    public List<ScannedItem> scanHistory(String userId) {

        String resolvedUserId =
                userId == null || userId.isBlank()
                        ? "demo-user"
                        : userId;

        return scannedItemRepository
                .findByUserIdOrderByScannedAtDesc(resolvedUserId);
    }

    // Find a scanned item by its ID.
    private ScannedItem findItem(String itemId) {

        return scannedItemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Scanned item not found."
                ));
    }

    // Determine recycling status from the available search evidence.
    private RecyclingDecision classifyRecycling(
            ScannedItem item,
            List<TavilySearchService.SearchResult> results
    ) {
        String name = normalize(item.getName());
        String material = normalize(item.getMaterial());

        boolean plastic = containsAny(
                material,
                "plastic", "pet", "hdpe",
                "polyethylene", "polypropylene"
        );

        boolean paper = containsAny(material, "paper", "cardboard");
        boolean glass = material.contains("glass");

        boolean metal = containsAny(
                material,
                "metal", "aluminium", "aluminum", "steel"
        );

        boolean plasticBottle = containsAny(
                name,
                "plastic bottle",
                "water bottle",
                "drinking water",
                "drink bottle",
                "beverage bottle",
                "bottled water"
        );

        boolean glassJar = containsAny(
                name,
                "glass jar",
                "glass bottle",
                "jam jar",
                "food jar"
        );

        List<String> sources = extractSources(results);

        if (!plastic && !paper && !glass && !metal) {

            if (plasticBottle) {
                return commonPackagingDecision(true, false, sources);
            }

            if (glassJar) {
                return commonPackagingDecision(false, true, sources);
            }

            return new RecyclingDecision(
                    "UNVERIFIED",
                    "unknown",
                    "The item's material could not be established. Check with your local recycling provider.",
                    sources
            );
        }

        int positive = 0;
        int negative = 0;

        for (TavilySearchService.SearchResult result : results) {

            if (result == null) {
                continue;
            }

            String text = normalize(
                    safe(result.title()) + " " + safe(result.content())
            );

            boolean relevantMaterial =
                    (plastic && containsAny(
                            text,
                            "plastic", "pet", "hdpe",
                            "polypropylene", "polyethylene"
                    ))
                    || (paper && containsAny(
                            text, "paper", "cardboard"
                    ))
                    || (glass && text.contains("glass"))
                    || (metal && containsAny(
                            text, "metal", "aluminium", "aluminum", "steel"
                    ));

            if (!relevantMaterial) {
                continue;
            }

            boolean saysNegative = containsAny(
                    text,
                    "not recyclable",
                    "cannot be recycled",
                    "can't be recycled",
                    "not accepted for recycling",
                    "not accepted in recycling",
                    "not accepted for collection",
                    "do not recycle",
                    "don't recycle"
            );

            boolean saysPositive = containsAny(
                    text,
                    "accepted for recycling",
                    "accepted in recycling",
                    "accepted for collection",
                    "can be recycled",
                    "is recyclable",
                    "are recyclable",
                    "recyclable material",
                    "recyclable plastic",
                    "recyclable paper",
                    "recyclable glass",
                    "recyclable metal"
            );

            if (saysNegative) {
                negative++;
            }

            if (saysPositive) {
                positive++;
            }
        }

        if (positive > 0 && negative > 0) {
            return new RecyclingDecision(
                    "UNVERIFIED",
                    "unknown",
                    "Search results contain conflicting recycling information. Local acceptance could not be confirmed.",
                    sources
            );
        }

        if (negative > 0) {
            return new RecyclingDecision(
                    "NOT_RECYCLABLE",
                    "other",
                    "Search results indicate that this item or material may not be accepted by some recycling programmes. Confirm the rules for your local collection service.",
                    sources
            );
        }

        if (positive > 0) {

            if (plastic) {
                return new RecyclingDecision(
                        "RECYCLABLE",
                        "plastic",
                        "Search results support recycling this plastic material. Empty and rinse the item, and check local collection rules.",
                        sources
                );
            }

            if (paper) {
                return new RecyclingDecision(
                        "RECYCLABLE",
                        "paper",
                        "Search results support recycling this paper or cardboard material. Check for coatings and contamination.",
                        sources
                );
            }

            if (glass) {
                return new RecyclingDecision(
                        "RECYCLABLE",
                        "glass",
                        "Search results support recycling this glass material. Confirm local collection rules.",
                        sources
                );
            }

            return new RecyclingDecision(
                    "RECYCLABLE",
                    "metal",
                    "Search results support recycling this metal material. Check local collection rules.",
                    sources
            );
        }

        // Fallback for common packaging when search evidence is inconclusive.
        if (plasticBottle) {
            return commonPackagingDecision(true, false, sources);
        }

        if (glassJar) {
            return commonPackagingDecision(false, true, sources);
        }

        return new RecyclingDecision(
                "UNVERIFIED",
                "unknown",
                "There is insufficient evidence to confirm whether this exact item is recyclable. This does not necessarily mean it is non-recyclable.",
                sources
        );
    }

    // Provide cautious guidance for common recyclable packaging.
    private RecyclingDecision commonPackagingDecision(
            boolean plasticBottle,
            boolean glassJar,
            List<String> sources
    ) {
        if (plasticBottle) {
            return new RecyclingDecision(
                    "RECYCLABLE",
                    "plastic",
                    "This appears to be a common plastic water or drink bottle, which is generally recyclable. Empty and rinse it. Local collection acceptance has not necessarily been verified.",
                    sources
            );
        }

        if (glassJar) {
            return new RecyclingDecision(
                    "RECYCLABLE",
                    "glass",
                    "Glass jars and bottles are generally recyclable. Empty and rinse the container. Local collection acceptance has not necessarily been verified.",
                    sources
            );
        }

        return new RecyclingDecision(
                "UNVERIFIED",
                "unknown",
                "The item's recycling status could not be verified.",
                sources
        );
    }

    // Extract up to three unique source URLs.
    private List<String> extractSources(
            List<TavilySearchService.SearchResult> results
    ) {
        List<String> sources = new ArrayList<>();

        if (results == null) {
            return sources;
        }

        for (TavilySearchService.SearchResult result : results) {

            if (result == null) {
                continue;
            }

            String url = result.url();

            if (url != null
                    && !url.isBlank()
                    && !sources.contains(url)) {
                sources.add(url);
            }

            if (sources.size() >= 3) {
                break;
            }
        }

        return sources;
    }

    private boolean containsAny(String text, String... terms) {

        for (String term : terms) {
            if (text.contains(term)) {
                return true;
            }
        }

        return false;
    }

    private String normalize(String value) {
        return value == null
                ? ""
                : value.toLowerCase(Locale.ROOT).trim();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private double toConfidencePercent(double confidence) {
        return confidence <= 1.0
                ? confidence * 100.0
                : confidence;
    }

    // Build the response shared by scanning and recycling endpoints.
    private ScanResponse buildResponse(
            ScannedItem item,
            String notes,
            int rewardPoints
    ) {
        ImpactService.ImpactResult impact = impactService.calculate(
                item.getMaterial(),
                item.getContainer()
        );

        ScanResponse response = new ScanResponse();

        response.setItemId(item.getId());
        response.setName(item.getName());
        response.setBrand(item.getBrand());
        response.setSize(item.getSize());
        response.setContainer(item.getContainer());

        response.setIdentificationConfirmed(
                item.isIdentificationConfirmed()
        );

        response.setIdentificationMessage(
                item.isIdentificationConfirmed()
                        ? "Identification confirmed."
                        : "Please confirm the identified item first."
        );

        response.setMaterial(item.getMaterial());
        response.setRecyclable(item.isRecyclable());
        response.setRecyclingStatus(item.getRecyclingStatus());
        response.setBin(item.getBin());
        response.setNotes(notes);

        response.setWaterLiters(impact.waterLiters());
        response.setCo2Kg(impact.co2Kg());
        response.setMaterialGrams(impact.materialGrams());
        response.setMaterialLabel(impact.materialLabel());

        response.setRewardPoints(rewardPoints);
        response.setMatchedLabel(item.getName());
        response.setConfidence(item.getConfidence());

        ConditionService.ConditionResult condition =
                conditionService.evaluate(item);

        response.setConditionScore(condition.score());
        response.setConditionLabel(condition.label());
        response.setConditionTips(condition.tips());

        return response;
    }

    private record RecyclingDecision(
            String status,
            String bin,
            String reason,
            List<String> sources
    ) {
    }
}
