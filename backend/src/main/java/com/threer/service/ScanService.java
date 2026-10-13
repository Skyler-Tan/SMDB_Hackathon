
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

@Service
public class ScanService {

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

    /**
     * Identifies an item using Groq Vision.
     * High-confidence results are automatically confirmed.
     * Lower-confidence results require user confirmation.
     */
    public ScanResponse scan(ScanRequest request) {
        if (request == null
                || request.getImage() == null
                || request.getImage().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Image is required for scanning."
            );
        }

        GroqVisionService.VisionResult vision =
                visionService.analyzeImage(request.getImage());

        ScannedItem item = new ScannedItem();
        item.setName(vision.item());
        item.setBrand(vision.brand());
        item.setSize(vision.size());
        item.setContainer(vision.container());
        item.setMaterial(vision.material());
        item.setConfidence(vision.confidence());
        // Store userId so scan history can be fetched per user
        String userId = (request.getUserId() == null || request.getUserId().isBlank())
                ? "demo-user"
                : request.getUserId();
        item.setUserId(userId);

        double confidencePercent = toConfidencePercent(vision.confidence());
        boolean autoConfirmed = confidencePercent >= 80.0;

        item.setIdentificationConfirmed(autoConfirmed);
        item.setRecyclable(false);
        item.setRecyclingStatus("UNVERIFIED");
        item.setBin("unknown");
        item.setDescription(
                "Recycling information has not been verified yet."
        );

        ScannedItem savedItem = scannedItemRepository.save(item);

        System.out.println("Saved scanned item: " + savedItem.getId());
        System.out.println("Identification confidence: " + confidencePercent);
        System.out.println("Identification confirmed: " + autoConfirmed);

        String message = autoConfirmed
                ? "High-confidence identification accepted. Recycling information is being checked."
                : "Please confirm the identified item before continuing.";

        return buildResponse(savedItem, message, 0);
    }

    /**
     * Confirms an identification after the user accepts the suggested item.
     */
    public ScanResponse confirmIdentification(String itemId) {
        ScannedItem item = findItem(itemId);

        item.setIdentificationConfirmed(true);
        ScannedItem savedItem = scannedItemRepository.save(item);

        return buildResponse(
                savedItem,
                "Item identification confirmed. Recycling information has not yet been verified.",
                0
        );
    }

    /**
     * Checks recycling information using Tavily only.
     * The item must be confirmed before this method can continue.
     */
    public ScanResponse loadRecycling(String itemId) {
        System.out.println("========== RECYCLING CHECK ==========");

        ScannedItem item = findItem(itemId);

        if (!item.isIdentificationConfirmed()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Please confirm the item's identification before checking recycling information."
            );
        }

        System.out.println("Item: " + item.getName());
        System.out.println("Brand: " + item.getBrand());
        System.out.println("Material: " + item.getMaterial());

        List<TavilySearchService.SearchResult> results =
                tavilySearchService.searchRecyclingInformation(
                        item.getName(),
                        item.getBrand(),
                        item.getMaterial()
                );

        if (results == null) {
            results = List.of();
        }

        System.out.println("Tavily results returned: " + results.size());

        RecyclingDecision decision = classifyRecycling(item, results);

        item.setRecyclable(
                "RECYCLABLE".equals(decision.status())
        );
        item.setRecyclingStatus(decision.status());
        item.setBin(decision.bin());

        String description = decision.reason();

        if (!decision.sources().isEmpty()) {
            description += "\n\nSources: "
                    + String.join(" | ", decision.sources());
        }

        item.setDescription(description);

        ScannedItem savedItem = scannedItemRepository.save(item);

        int rewardPoints = 0;

        if ("RECYCLABLE".equals(savedItem.getRecyclingStatus())
                && !"unknown".equalsIgnoreCase(savedItem.getBin())
                && !"other".equalsIgnoreCase(savedItem.getBin())) {
            rewardPoints = impactService.calculate(
                    savedItem.getMaterial(),
                    savedItem.getContainer()
            ).rewardPoints();
        }

        System.out.println(
                "Recycling status: " + savedItem.getRecyclingStatus()
        );
        System.out.println("Bin: " + savedItem.getBin());
        System.out.println("Reason: " + decision.reason());
        System.out.println("========== RECYCLING CHECK COMPLETE ==========");

        return buildResponse(savedItem, decision.reason(), rewardPoints);
    }

    public List<ScannedItem> scanHistory(String userId) {
        String id = (userId == null || userId.isBlank()) ? "demo-user" : userId;
        return scannedItemRepository.findByUserIdOrderByScannedAtDesc(id);
    }

    private ScannedItem findItem(String itemId) {
        return scannedItemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Scanned item not found."
                ));
    }

    private RecyclingDecision classifyRecycling(
            ScannedItem item,
            List<TavilySearchService.SearchResult> results
    ) {
        String material = normalize(item.getMaterial());

        boolean plastic = material.contains("plastic");
        boolean paper = material.contains("paper")
                || material.contains("cardboard");
        boolean glass = material.contains("glass");
        boolean metal = material.contains("metal")
                || material.contains("aluminium")
                || material.contains("aluminum");

        if (!plastic && !paper && !glass && !metal) {
            return new RecyclingDecision(
                    "UNVERIFIED",
                    "unknown",
                    "The identified material does not match a supported recycling category. Recycling acceptance could not be verified.",
                    List.of()
            );
        }

        if (results.isEmpty()) {
            return new RecyclingDecision(
                    "UNVERIFIED",
                    "unknown",
                    "No useful recycling evidence was returned. This does not mean the item is non-recyclable. Check with your local recycling provider.",
                    List.of()
            );
        }

        List<String> sources = extractSources(results);
        int positiveMatches = 0;
        int negativeMatches = 0;

        for (TavilySearchService.SearchResult result : results) {
            String title = result.title() == null ? "" : result.title();
            String content = result.content() == null ? "" : result.content();
            String text = normalize(title + " " + content);

            boolean relevantMaterial =
                    (plastic && containsAny(text,
                            "plastic", "pet", "polypropylene",
                            "polyethylene", "polystyrene", "resin code"))
                    || (paper && containsAny(text, "paper", "cardboard"))
                    || (glass && text.contains("glass"))
                    || (metal && containsAny(text,
                            "metal", "aluminium", "aluminum", "metal can"));

            if (!relevantMaterial) {
                continue;
            }

            boolean negative = containsAny(text,
                    "not recyclable",
                    "cannot be recycled",
                    "can't be recycled",
                    "not accepted for recycling",
                    "not accepted in recycling",
                    "not accepted by the recycling",
                    "do not recycle",
                    "don't recycle",
                    "should not be recycled",
                    "not accepted for collection");

            boolean positive = containsAny(text,
                    "accepted for recycling",
                    "accepted in recycling",
                    "accepted for collection",
                    "can be recycled",
                    "is recyclable",
                    "are recyclable",
                    "recyclable material",
                    "recyclable plastics",
                    "recyclable plastic",
                    "recyclable paper",
                    "recyclable cardboard",
                    "recyclable glass",
                    "recyclable metal");

            if (negative) {
                negativeMatches++;
            } else if (positive) {
                positiveMatches++;
            }
        }

        // Conflicting evidence is not enough to make a firm decision.
        if (negativeMatches > 0 && positiveMatches > 0) {
            return new RecyclingDecision(
                    "UNVERIFIED",
                    "unknown",
                    "Search results contain conflicting information. Local acceptance could not be confirmed, so this item should not be marked recyclable or non-recyclable yet.",
                    sources
            );
        }

        if (negativeMatches > 0) {
            return new RecyclingDecision(
                    "NOT_RECYCLABLE",
                    "other",
                    "Search results contain evidence that this material may not be accepted by a recycling programme. Confirm the exact item and local rules with your recycling provider before disposal.",
                    sources
            );
        }

        if (positiveMatches == 0) {
            return new RecyclingDecision(
                    "UNVERIFIED",
                    "unknown",
                    "The search results did not provide enough specific evidence to confirm this item's recycling category. This does not necessarily mean the item is non-recyclable.",
                    sources
            );
        }

        if (plastic) {
            return new RecyclingDecision(
                    "RECYCLABLE",
                    "plastic",
                    "Search results contain evidence that this material may be recyclable. The exact item and local facility acceptance still need to be checked. Clean the item and check its resin code where applicable.",
                    sources
            );
        }

        if (paper) {
            return new RecyclingDecision(
                    "RECYCLABLE",
                    "paper",
                    "Search results contain evidence that paper or cardboard may be recyclable. Check for coatings, food contamination, and local restrictions.",
                    sources
            );
        }

        if (glass) {
            return new RecyclingDecision(
                    "RECYCLABLE",
                    "glass",
                    "Search results contain evidence that glass may be recyclable. Confirm local acceptance and remove residue before disposal.",
                    sources
            );
        }

        return new RecyclingDecision(
                "RECYCLABLE",
                "metal",
                "Search results contain evidence that metal may be recyclable. Confirm local acceptance before disposal.",
                sources
        );
    }

    private boolean containsAny(String text, String... phrases) {
        for (String phrase : phrases) {
            if (text.contains(phrase)) {
                return true;
            }
        }
        return false;
    }

    private List<String> extractSources(
            List<TavilySearchService.SearchResult> results
    ) {
        List<String> sources = new ArrayList<>();

        for (TavilySearchService.SearchResult result : results) {
            if (result.url() != null
                    && !result.url().isBlank()
                    && !sources.contains(result.url())) {
                sources.add(result.url());
            }

            if (sources.size() >= 3) {
                break;
            }
        }

        return sources;
    }

    private String normalize(String value) {
        return value == null
                ? ""
                : value.toLowerCase(Locale.ROOT).trim();
    }

    private double toConfidencePercent(double confidence) {
        return confidence <= 1.0 ? confidence * 100.0 : confidence;
    }

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

        response.setIdentificationConfirmed(item.isIdentificationConfirmed());
        response.setIdentificationMessage(
                item.isIdentificationConfirmed()
                        ? "Identification confirmed."
                        : "Please confirm the identified item before continuing."
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

        // Condition score — pure rule-based, no AI call
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
        private boolean recyclable() {
            return "RECYCLABLE".equals(status);
        }
    }
}
