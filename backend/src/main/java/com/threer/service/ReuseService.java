package com.threer.service;

import com.threer.dto.ReuseRequest;
import com.threer.dto.ReuseResponse;
import com.threer.model.SavedIdea;
import com.threer.model.ScannedItem;
import com.threer.repository.SavedIdeaRepository;
import com.threer.repository.ScannedItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ReuseService {

    private static final int IDEAS_PER_LEVEL = 3;

    // Titles with at least this word overlap count as the same idea.
    private static final double TITLE_SIMILARITY = 0.7;

    private final TavilySearchService tavilySearchService;
    private final ScannedItemRepository scannedItemRepository;
    private final SavedIdeaRepository savedIdeaRepository;

    public ReuseService(
            TavilySearchService tavilySearchService,
            ScannedItemRepository scannedItemRepository,
            SavedIdeaRepository savedIdeaRepository) {
        this.tavilySearchService = tavilySearchService;
        this.scannedItemRepository = scannedItemRepository;
        this.savedIdeaRepository = savedIdeaRepository;
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

        String userId = request.getUserId() == null
                || request.getUserId().isBlank()
                ? "demo-user"
                : request.getUserId().trim();

        // Load what this user has already saved.
        Set<String> savedUrls = new HashSet<>();
        List<String> savedTitles = new ArrayList<>();

        for (SavedIdea saved
                : savedIdeaRepository.findByUserIdOrderByCreatedAtDesc(userId)) {

            String url = normalizeUrl(saved.getSourceUrl());
            if (!url.isEmpty()) {
                savedUrls.add(url);
            }

            String title = normalizeTitle(saved.getTitle());
            if (!title.isEmpty()) {
                savedTitles.add(title);
            }
        }

        // URLs already used in this response, so one article
        // never appears under two difficulty levels.
        Set<String> usedUrls = new HashSet<>();

        System.out.println("========== TAVILY REUSE ==========");
        System.out.println("Item: " + item.getName());
        System.out.println("Material: " + safe(item.getMaterial()));
        System.out.println("User: " + userId);
        System.out.println("Saved ideas to avoid: " + savedUrls.size());
        System.out.println("Searching all difficulties.");

        List<ReuseResponse.DiyIdea> ideas = new ArrayList<>();

        for (String difficulty : List.of("Easy", "Medium", "Hard")) {
            System.out.println("Searching difficulty: " + difficulty);

            List<TavilySearchService.SearchResult> projects =
                    findProjects(item, difficulty);

            List<TavilySearchService.SearchResult> videos =
                    findYoutubeVideos(item, difficulty);

            int added = addIdeas(
                    ideas, projects, videos, item, difficulty, 0,
                    savedUrls, savedTitles, usedUrls
            );

            // Some results were skipped. Look for different ideas.
            if (added < IDEAS_PER_LEVEL) {
                System.out.println(
                        difficulty + ": only " + added
                                + " new ideas. Searching for alternatives."
                );

                List<TavilySearchService.SearchResult> alternatives =
                        findAlternativeProjects(item, difficulty);

                added = addIdeas(
                        ideas, alternatives, videos, item, difficulty, added,
                        savedUrls, savedTitles, usedUrls
                );
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
                    "No new reuse projects were found. You may have saved the best ones already. Please try again later."
            );
        }

        return new ReuseResponse("All", ideas);
    }

    // Adds new ideas until the level has enough. Returns the new total.
    private int addIdeas(
            List<ReuseResponse.DiyIdea> ideas,
            List<TavilySearchService.SearchResult> projects,
            List<TavilySearchService.SearchResult> videos,
            ScannedItem item,
            String difficulty,
            int alreadyAdded,
            Set<String> savedUrls,
            List<String> savedTitles,
            Set<String> usedUrls) {

        int added = alreadyAdded;

        for (TavilySearchService.SearchResult project : projects) {
            if (added >= IDEAS_PER_LEVEL) {
                break;
            }

            if (project.title() == null || project.title().isBlank()
                    || project.url() == null || project.url().isBlank()
                    || isYoutubeUrl(project.url())) {
                continue;
            }

            String urlKey = normalizeUrl(project.url());

            if (usedUrls.contains(urlKey)) {
                continue;
            }

            if (overlapsSaved(project, savedUrls, savedTitles)) {
                System.out.println(
                        "Skipping idea already saved: " + project.title()
                );
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

            usedUrls.add(urlKey);
            added++;
        }

        return added;
    }

    // True when a result matches something the user already saved.
    private boolean overlapsSaved(
            TavilySearchService.SearchResult project,
            Set<String> savedUrls,
            List<String> savedTitles) {

        if (savedUrls.contains(normalizeUrl(project.url()))) {
            return true;
        }

        String title = normalizeTitle(project.title());

        if (title.isEmpty()) {
            return false;
        }

        for (String savedTitle : savedTitles) {
            if (similar(title, savedTitle)) {
                return true;
            }
        }

        return false;
    }

    // Host + path, ignoring www, query string, fragment and trailing slash.
    private String normalizeUrl(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }

        try {
            URI uri = URI.create(url.trim());
            String host = uri.getHost();

            if (host == null) {
                return url.trim().toLowerCase(Locale.ROOT);
            }

            host = host.toLowerCase(Locale.ROOT);

            if (host.startsWith("www.")) {
                host = host.substring(4);
            }

            String path = uri.getPath() == null ? "" : uri.getPath();

            while (path.endsWith("/")) {
                path = path.substring(0, path.length() - 1);
            }

            return host + path.toLowerCase(Locale.ROOT);
        } catch (IllegalArgumentException e) {
            return url.trim().toLowerCase(Locale.ROOT);
        }
    }

    // Lowercase, drop a trailing "| Site name", strip punctuation.
    private String normalizeTitle(String title) {
        if (title == null || title.isBlank()) {
            return "";
        }

        String value = title;
        int bar = value.indexOf(" | ");

        if (bar > 0) {
            value = value.substring(0, bar);
        }

        return value.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }

    private boolean similar(String a, String b) {
        if (a.equals(b)) {
            return true;
        }

        Set<String> wordsA = words(a);
        Set<String> wordsB = words(b);

        if (wordsA.isEmpty() || wordsB.isEmpty()) {
            return false;
        }

        Set<String> common = new HashSet<>(wordsA);
        common.retainAll(wordsB);

        Set<String> all = new HashSet<>(wordsA);
        all.addAll(wordsB);

        return (double) common.size() / all.size() >= TITLE_SIMILARITY;
    }

    private Set<String> words(String text) {
        Set<String> result = new HashSet<>();

        for (String word : text.split("\\s+")) {
            if (word.length() >= 3) {
                result.add(word);
            }
        }

        return result;
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

        return collectRelevantProjects(item, queries);
    }

    // Different wording, used when saved ideas were skipped.
    private List<TavilySearchService.SearchResult> findAlternativeProjects(
            ScannedItem item,
            String difficulty) {

        String name = safe(item.getName());

        List<String> queries = List.of(
                "repurpose old " + name + " new use "
                        + difficulty + " project",
                name + " upcycle ideas for home " + difficulty,
                "how to turn a " + name + " into something useful "
                        + difficulty + " DIY",
                name + " reuse craft ideas tutorial"
        );

        return collectRelevantProjects(item, queries);
    }

    private List<TavilySearchService.SearchResult> collectRelevantProjects(
            ScannedItem item,
            List<String> queries) {

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
        String[] itemWords = itemName.split("[^a-z0-9]+");
        int matchedWords = 0;

        for (String word : itemWords) {
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