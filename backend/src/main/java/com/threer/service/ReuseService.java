
package com.threer.service;

import com.threer.dto.ReuseRequest;
import com.threer.dto.ReuseResponse;
import com.threer.model.ScannedItem;
import com.threer.repository.ScannedItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
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
            ScannedItemRepository scannedItemRepository) {
        this.tavilySearchService = tavilySearchService;
        this.scannedItemRepository = scannedItemRepository;
    }

    public ReuseResponse generateIdeas(ReuseRequest request) {

        if (request == null
                || request.getItemId() == null
                || request.getItemId().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A scanned item ID is required. Please scan and confirm an item first."
            );
        }

        ScannedItem item = scannedItemRepository
                .findById(request.getItemId().trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Scanned item not found. Please scan the item again."
                ));

        if (!item.isIdentificationConfirmed()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Please confirm the item's identification before generating reuse ideas."
            );
        }

        if (item.getName() == null || item.getName().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The confirmed item has no name."
            );
        }

        System.out.println("========== TAVILY REUSE ==========");
        System.out.println("Item: " + item.getName());
        System.out.println("Material: " + safe(item.getMaterial()));
        System.out.println("Searching all difficulties.");

        List<ReuseResponse.DiyIdea> ideas = new ArrayList<>();

        // Generate a separate set of results for each difficulty.
        for (String difficulty : List.of("Easy", "Medium", "Hard")) {
            System.out.println("Searching difficulty: " + difficulty);

            List<TavilySearchService.SearchResult> projects =
                    findProjects(item, difficulty);

            List<TavilySearchService.SearchResult> videos =
                    findYoutubeVideos(item, difficulty);

            int added = 0;

            for (TavilySearchService.SearchResult project : projects) {
                if (added >= 3) {
                    break;
                }

                if (project.title() == null || project.title().isBlank()
                        || project.url() == null || project.url().isBlank()
                        || isYoutubeUrl(project.url())) {
                    continue;
                }

                String videoUrl = findMatchingVideoUrl(videos, project);

                List<String> steps = extractSteps(project.content());

                ideas.add(new ReuseResponse.DiyIdea(
                        project.title().trim(),
                        difficulty,
                        safeSummary(project.content()),
                        project.title().trim(),
                        buildMaterials(item),
                        List.of(),
                        steps,
                        videoUrl == null ? null : "YouTube video tutorial",
                        videoUrl,
                        project.title().trim(),
                        project.url().trim()
                ));

                added++;
            }

            System.out.println(
                    difficulty + " ideas added: " + added
            );
        }

        System.out.println("Total reuse ideas: " + ideas.size());
        System.out.println("========== REUSE COMPLETE ==========");

        if (ideas.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "No suitable reuse projects were found. Please try again later."
            );
        }

        // "All" indicates that the response contains all three difficulty levels.
        return new ReuseResponse("All", ideas);
    }

    private List<TavilySearchService.SearchResult> findProjects(
            ScannedItem item,
            String difficulty) {

        String name = safe(item.getName());
        String material = safe(item.getMaterial());

        List<String> queries = List.of(
                name + " DIY upcycling reuse project " + difficulty
                        + " step by step",
                "creative ways to reuse " + name + " "
                        + difficulty + " DIY instructions",
                name + " " + material
                        + " upcycle craft project tutorial"
        );

        Map<String, TavilySearchService.SearchResult> unique =
                new LinkedHashMap<>();

        for (String query : queries) {
            searchAndCollect(query, unique);
        }

        List<TavilySearchService.SearchResult> relevant = new ArrayList<>();

        for (TavilySearchService.SearchResult result : unique.values()) {
            if (!isYoutubeUrl(result.url()) && isRelevant(result, item)) {
                relevant.add(result);
            }
        }

        return relevant;
    }

    private List<TavilySearchService.SearchResult> findYoutubeVideos(
            ScannedItem item,
            String difficulty) {

        String name = safe(item.getName());

        List<String> queries = List.of(
                "site:youtube.com/watch DIY upcycle " + name
                        + " " + difficulty + " tutorial",
                "site:youtu.be " + name
                        + " reuse DIY " + difficulty + " tutorial"
        );

        Map<String, TavilySearchService.SearchResult> unique =
                new LinkedHashMap<>();

        for (String query : queries) {
            searchAndCollect(query, unique);
        }

        List<TavilySearchService.SearchResult> videos = new ArrayList<>();

        for (TavilySearchService.SearchResult result : unique.values()) {
            if (isYoutubeUrl(result.url())) {
                videos.add(result);
            }
        }

        return videos;
    }

    private void searchAndCollect(
            String query,
            Map<String, TavilySearchService.SearchResult> results) {

        try {
            System.out.println("Tavily query: " + query);

            List<TavilySearchService.SearchResult> found =
                    tavilySearchService.searchGeneral(query);

            if (found == null) {
                return;
            }

            for (TavilySearchService.SearchResult result : found) {
                if (result == null || result.url() == null
                        || result.url().isBlank()) {
                    continue;
                }

                results.putIfAbsent(result.url().trim(), result);
            }
        } catch (Exception e) {
            System.err.println(
                    "Tavily query failed: " + query
                            + " | " + e.getMessage()
            );
        }
    }

    private boolean isRelevant(
            TavilySearchService.SearchResult result,
            ScannedItem item) {

        String text = (
                safe(result.title()) + " " + safe(result.content())
        ).toLowerCase(Locale.ROOT);

        String itemName = safe(item.getName())
                .toLowerCase(Locale.ROOT);

        String material = safe(item.getMaterial())
                .toLowerCase(Locale.ROOT);

        // Prefer results mentioning the actual item.
        String[] words = itemName.split("[^a-z0-9]+");
        int matchedWords = 0;

        for (String word : words) {
            if (word.length() >= 3 && text.contains(word)) {
                matchedWords++;
            }
        }

        if (matchedWords > 0) {
            return true;
        }

        // Material alone is a weaker match, so require a DIY/reuse context.
        boolean materialMatches = !material.equals("unknown")
                && text.contains(material);

        boolean diyContext = text.contains("reuse")
                || text.contains("upcycl")
                || text.contains("diy")
                || text.contains("craft")
                || text.contains("project");

        return materialMatches && diyContext;
    }

    private String findMatchingVideoUrl(
            List<TavilySearchService.SearchResult> videos,
            TavilySearchService.SearchResult project) {

        if (videos == null || videos.isEmpty()) {
            return null;
        }

        // Prefer a video whose title shares words with the project title.
        String projectTitle = safe(project.title())
                .toLowerCase(Locale.ROOT);

        for (TavilySearchService.SearchResult video : videos) {
            String videoTitle = safe(video.title())
                    .toLowerCase(Locale.ROOT);

            for (String word : projectTitle.split("[^a-z0-9]+")) {
                if (word.length() >= 4 && videoTitle.contains(word)) {
                    return video.url();
                }
            }
        }

        // The search was specifically for this item and difficulty.
        return videos.get(0).url();
    }

    private boolean isYoutubeUrl(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }

        try {
            String host = URI.create(url.trim())
                    .getHost();

            if (host == null) {
                return false;
            }

            host = host.toLowerCase(Locale.ROOT);

            return host.equals("youtube.com")
                    || host.endsWith(".youtube.com")
                    || host.equals("youtu.be")
                    || host.endsWith(".youtu.be");
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private List<String> extractSteps(String content) {
        List<String> steps = new ArrayList<>();

        if (content == null || content.isBlank()) {
            return steps;
        }

        String normalized = content.trim()
                .replaceAll("\\s+", " ");

        // Keep every usable sentence supplied in the search result.
        String[] sentences = normalized.split("(?<=[.!?])\\s+");

        for (String sentence : sentences) {
            String step = sentence.trim();

            if (step.length() < 15) {
                continue;
            }

            if (steps.stream().noneMatch(
                    existing -> existing.equalsIgnoreCase(step))) {
                steps.add(step);
            }
        }

        return steps;
    }

    private String safeSummary(String content) {
        if (content == null || content.isBlank()) {
            return "Open the source link for project information and instructions.";
        }

        String summary = content.trim().replaceAll("\\s+", " ");

        if (summary.length() > 300) {
            return summary.substring(0, 297).trim() + "...";
        }

        return summary;
    }

    private List<String> buildMaterials(ScannedItem item) {
        List<String> materials = new ArrayList<>();

        String name = safe(item.getName());
        String material = safe(item.getMaterial());

        materials.add(name);

        if (!material.equals("unknown")
                && !material.equalsIgnoreCase(name)) {
            materials.add(material);
        }

        return materials;
    }

    private String safe(String value) {
        return value == null || value.isBlank()
                ? "unknown"
                : value.trim();
    }
}
