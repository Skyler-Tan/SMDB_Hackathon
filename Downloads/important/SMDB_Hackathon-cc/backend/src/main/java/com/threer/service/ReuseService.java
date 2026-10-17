
package com.threer.service;

import com.threer.dto.ReuseRequest;
import com.threer.dto.ReuseResponse;
import com.threer.model.ScannedItem;
import com.threer.repository.ScannedItemRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class ReuseService {

    private final TavilySearchService tavilySearchService;
    private final ScannedItemRepository scannedItemRepository;

    public ReuseService(
            TavilySearchService tavilySearchService,
            ScannedItemRepository scannedItemRepository
    ) {
        this.tavilySearchService = tavilySearchService;
        this.scannedItemRepository = scannedItemRepository;
    }

    public ReuseResponse generateIdeas(ReuseRequest request) {

        // 1. Validate the request.
        if (request == null
                || request.getItemId() == null
                || request.getItemId().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A scanned item ID is required. "
                            + "Please scan and confirm an item first."
            );
        }

        // 2. Retrieve the saved scanned item.
        ScannedItem item = scannedItemRepository
                .findById(request.getItemId().trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Scanned item not found. Please scan the item again."
                ));

        // 3. Require confirmation before suggesting reuse projects.
        if (!item.isIdentificationConfirmed()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Please confirm the item's identification "
                            + "before generating DIY ideas."
            );
        }

        if (item.getName() == null || item.getName().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The confirmed item has no name. "
                            + "Please correct its identification first."
            );
        }

        String difficulty = normalizeDifficulty(
                request.getDifficulty()
        );

        System.out.println("========== TAVILY REUSE ==========");
        System.out.println("Confirmed item: " + item.getName());
        System.out.println("Item ID: " + item.getId());
        System.out.println("Material: " + safe(item.getMaterial()));
        System.out.println("Difficulty: " + difficulty);

        // 4. Search for projects suitable for this item and difficulty.
        List<TavilySearchService.SearchResult> results =
                findReuseProjects(item, difficulty);

        if (results.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "No suitable reuse projects were found. "
                            + "Please try again later."
            );
        }

        // 5. Convert search results into the existing response format.
        List<ReuseResponse.DiyIdea> ideas = new ArrayList<>();

        for (TavilySearchService.SearchResult result : results) {

            if (ideas.size() >= 3) {
                break;
            }

            if (result.title() == null || result.title().isBlank()
                    || result.url() == null || result.url().isBlank()) {
                continue;
            }

            String title = result.title().trim();
            String summary = createSummary(result.content(), title);

            List<String> materials = buildMaterials(item);
            List<String> tools = new ArrayList<>();
            List<String> steps = buildSteps(result.content(), item);

            ideas.add(new ReuseResponse.DiyIdea(
                    title,
                    difficulty,
                    summary,
                    title,
                    materials,
                    tools,
                    steps,
                    result.title(),
                    result.url(),
                    result.title(),
                    result.url()
            ));
        }

        if (ideas.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Search results did not contain usable reuse projects. "
                            + "Please try again later."
            );
        }

        System.out.println("Reuse projects found: " + ideas.size());
        System.out.println("========== REUSE COMPLETE ==========");

        return new ReuseResponse(difficulty, ideas);
    }

    /**
     * Search Tavily using several query variations.
     * Results are deduplicated by URL while preserving their order.
     */
    private List<TavilySearchService.SearchResult> findReuseProjects(
            ScannedItem item,
            String difficulty
    ) {
        String itemName = safe(item.getName());
        String material = safe(item.getMaterial());

        List<String> queries = List.of(
                itemName + " " + material
                        + " creative DIY reuse projects",
                "how to reuse " + itemName
                        + " DIY upcycling project tutorial",
                itemName + " reuse ideas " + difficulty
                        + " DIY step by step"
        );

        Map<String, TavilySearchService.SearchResult> uniqueResults =
                new LinkedHashMap<>();

        for (String query : queries) {
            try {
                System.out.println("Tavily reuse query: " + query);

                List<TavilySearchService.SearchResult> results =
                        tavilySearchService.searchGeneral(query);

                if (results == null) {
                    continue;
                }

                for (TavilySearchService.SearchResult result : results) {
                    if (result == null
                            || result.url() == null
                            || result.url().isBlank()) {
                        continue;
                    }

                    String url = result.url().trim();

                    // Keep only one result for each URL.
                    uniqueResults.putIfAbsent(url, result);
                }

            } catch (Exception e) {
                System.err.println(
                        "Tavily search failed for query '"
                                + query + "': " + e.getMessage()
                );
            }
        }

        List<TavilySearchService.SearchResult> relevant =
                new ArrayList<>();

        for (TavilySearchService.SearchResult result
                : uniqueResults.values()) {

            if (isRelevant(result, item)) {
                relevant.add(result);
            }
        }

        // If relevance filtering removes every result, use the available
        // search results rather than returning nothing unnecessarily.
        if (relevant.isEmpty()) {
            relevant.addAll(uniqueResults.values());
        }

        return relevant;
    }

    /**
     * Prefer results that mention the scanned item or its material.
     */
    private boolean isRelevant(
            TavilySearchService.SearchResult result,
            ScannedItem item
    ) {
        String text = (
                safe(result.title()) + " " + safe(result.content())
        ).toLowerCase(Locale.ROOT);

        String itemName = safe(item.getName())
                .toLowerCase(Locale.ROOT);

        String material = safe(item.getMaterial())
                .toLowerCase(Locale.ROOT);

        if (!itemName.equals("unknown")
                && text.contains(itemName)) {
            return true;
        }

        return !material.equals("unknown")
                && text.contains(material);
    }

    /**
     * Build a short summary from Tavily's search-result description.
     */
    private String createSummary(String content, String title) {
        if (content == null || content.isBlank()) {
            return "Explore this reuse project using the linked tutorial.";
        }

        String summary = content.trim()
                .replaceAll("\\s+", " ");

        // Keep the summary short enough for a project card.
        if (summary.length() > 240) {
            summary = summary.substring(0, 237).trim() + "...";
        }

        return summary.isBlank()
                ? "Explore this reuse project: " + title
                : summary;
    }

    /**
     * Keep the material list conservative because search snippets
     * do not always provide a complete materials list.
     */
    private List<String> buildMaterials(ScannedItem item) {
        List<String> materials = new ArrayList<>();

        String itemName = safe(item.getName());
        String material = safe(item.getMaterial());

        materials.add(itemName);

        if (!material.equals("unknown")
                && !material.equalsIgnoreCase(itemName)) {
            materials.add(material);
        }

        return materials;
    }

    /**
     * Search snippets may not contain complete instructions.
     * Extract useful sentences when available and add safe preparation
     * steps without inventing project-specific construction details.
     */
    private List<String> buildSteps(
            String content,
            ScannedItem item
    ) {
        List<String> steps = new ArrayList<>();

        String name = safe(item.getName());

        steps.add("Clean the " + name + " and let it dry completely.");

        if (content != null && !content.isBlank()) {
            String normalized = content.trim()
                    .replaceAll("\\s+", " ");

            String[] sentences = normalized.split(
                    "(?<=[.!?])\\s+"
            );

            for (String sentence : sentences) {
                String step = sentence.trim();

                if (step.length() < 20 || step.length() > 220) {
                    continue;
                }

                if (steps.stream().noneMatch(
                        existing -> existing.equalsIgnoreCase(step))) {
                    steps.add(step);
                }

                if (steps.size() >= 3) {
                    break;
                }
            }
        }

        if (steps.size() < 2) {
            steps.add(
                    "Open the linked tutorial and check the materials "
                            + "and instructions for this project."
            );
        }

        if (steps.size() < 3) {
            steps.add(
                    "Follow the tutorial carefully and check that the "
                            + "finished item is clean, stable and safe to use."
            );
        }

        return steps;
    }

    private String normalizeDifficulty(String difficulty) {
        if (difficulty != null) {
            if (difficulty.equalsIgnoreCase("medium")) {
                return "Medium";
            }

            if (difficulty.equalsIgnoreCase("hard")) {
                return "Hard";
            }
        }

        return "Easy";
    }

    private String safe(String value) {
        return value == null || value.isBlank()
                ? "unknown"
                : value.trim();
    }
}
