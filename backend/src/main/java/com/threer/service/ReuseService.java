package com.threer.service;

import com.threer.dto.ReuseRequest;
import com.threer.dto.ReuseResponse;
import com.threer.model.CatalogItem;
import com.threer.model.SavedIdea;
import com.threer.model.ScannedItem;
import com.threer.repository.CatalogItemRepository;
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
    private static final double TITLE_SIMILARITY = 0.7;

    private final TavilySearchService tavilySearchService;
    private final ScannedItemRepository scannedItemRepository;
    private final SavedIdeaRepository savedIdeaRepository;
    private final CatalogItemRepository catalogItemRepository;

    public ReuseService(
            TavilySearchService tavilySearchService,
            ScannedItemRepository scannedItemRepository,
            SavedIdeaRepository savedIdeaRepository,
            CatalogItemRepository catalogItemRepository) {

        this.tavilySearchService = tavilySearchService;
        this.scannedItemRepository = scannedItemRepository;
        this.savedIdeaRepository = savedIdeaRepository;
        this.catalogItemRepository = catalogItemRepository;
    }

    public ReuseResponse generateIdeas(ReuseRequest request) {

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Item details are required."
            );
        }

        String itemId = request.getItemId() == null
                ? ""
                : request.getItemId().trim();

        ScannedItem item = null;

        // First, try to find an existing scanned item.
        if (!itemId.isBlank()) {
            item = scannedItemRepository.findById(itemId)
                    .orElse(null);
        }

        if (item != null) {

            // Image-scanned items must still be confirmed.
            if (!item.isIdentificationConfirmed()) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Please confirm the item's identification before generating reuse ideas."
                );
            }

        } else {

            // A manually selected catalog item does not need a scan.
            CatalogItem catalogItem = null;

            if (!itemId.isBlank()) {
                catalogItem = catalogItemRepository
                        .findById(itemId)
                        .orElse(null);
            }

            // Support frontend requests that send item details
            // without a database ID.
            String requestedName = clean(request.getName());

            if (catalogItem == null && requestedName != null) {
                catalogItem = catalogItemRepository.findAll()
                        .stream()
                        .filter(candidate ->
                                candidate.getName() != null
                                        && candidate.getName()
                                        .equalsIgnoreCase(requestedName))
                        .findFirst()
                        .orElse(null);
            }

            if (catalogItem != null) {

                // Build an in-memory item for the existing Tavily logic.
                // Do not save it as a scanned item.
                item = new ScannedItem();

                item.setName(firstNonBlank(
                        catalogItem.getName(),
                        request.getName(),
                        "Unknown item"
                ));

                item.setMaterial(firstNonBlank(
                        catalogItem.getMaterial(),
                        request.getMaterial(),
                        "unknown"
                ));

                item.setBin(firstNonBlank(
                        catalogItem.getBin(),
                        "unknown"
                ));

                item.setDescription(firstNonBlank(
                        catalogItem.getNotes(),
                        ""
                ));

                item.setBrand(firstNonBlank(
                        request.getBrand(),
                        ""
                ));

                item.setSize(firstNonBlank(
                        request.getSize(),
                        ""
                ));

                item.setContainer(firstNonBlank(
                        request.getContainer(),
                        ""
                ));

            } else if (requestedName != null) {

                // Fallback for a manual-entry request that supplies
                // complete item details but no matching catalog record.
                item = new ScannedItem();

                item.setName(requestedName);
                item.setBrand(firstNonBlank(request.getBrand(), ""));
                item.setSize(firstNonBlank(request.getSize(), ""));
                item.setContainer(firstNonBlank(
                        request.getContainer(), ""));
                item.setMaterial(firstNonBlank(
                        request.getMaterial(), "unknown"));
                item.setBin("unknown");
                item.setDescription("");
                
            } else {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Item not found. Please select an item from Key in Details or provide its name."
                );
            }
        }

        if (item.getName() == null || item.getName().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The selected item has no name."
            );
        }

        String userId = request.getUserId() == null
                || request.getUserId().isBlank()
                ? "demo-user"
                : request.getUserId().trim();

        Set<String> savedUrls = new HashSet<>();
        List<String> savedTitles = new ArrayList<>();

        for (SavedIdea saved :
                savedIdeaRepository.findByUserIdOrderByCreatedAtDesc(userId)) {

            String url = normalizeUrl(saved.getSourceUrl());

            if (!url.isEmpty()) {
                savedUrls.add(url);
            }

            String title = normalizeTitle(saved.getTitle());

            if (!title.isEmpty()) {
                savedTitles.add(title);
            }
        }

        Set<String> usedUrls = new HashSet<>();
        List<ReuseResponse.DiyIdea> ideas = new ArrayList<>();

        System.out.println("========== TAVILY REUSE ==========");
        System.out.println("Item: " + item.getName());
        System.out.println("Material: " + safe(item.getMaterial()));
        System.out.println("User: " + userId);
        System.out.println("Searching all difficulties.");

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

            if (added < IDEAS_PER_LEVEL) {

                System.out.println(
                        difficulty + ": searching for alternative ideas."
                );

                List<TavilySearchService.SearchResult> alternatives =
                        findAlternativeProjects(item, difficulty);

                added = addIdeas(
                        ideas, alternatives, videos, item, difficulty,
                        added, savedUrls, savedTitles, usedUrls
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
                    "No new reuse projects were found. Please try again later."
            );
        }

        return new ReuseResponse("All", ideas);
    }

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
                    videoUrl == null
                            ? null
                            : "YouTube video tutorial",
                    videoUrl,
                    project.title().trim(),
                    project.url().trim()
            ));

            usedUrls.add(urlKey);
            added++;
        }

        return added;
    }

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

        return (double) common.size() / all.size()
                >= TITLE_SIMILARITY;
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
                name + " DIY upcycling reuse project "
                        + difficulty + " step by step",
                "creative ways to reuse " + name + " "
                        + difficulty + " DIY instructions",
                name + " " + material
                        + " upcycle craft project tutorial"
        );

        return collectRelevantProjects(item, queries);
    }

    private List<TavilySearchService.SearchResult> findAlternativeProjects(
            ScannedItem item,
            String difficulty) {

        String name = safe(item.getName());

        List<String> queries = List.of(
                "repurpose old " + name + " new use "
                        + difficulty + " project",
                name + " upcycle ideas for home " + difficulty,
                "how to turn a " + name
                        + " into something useful " + difficulty + " DIY",
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

        List<TavilySearchService.SearchResult> relevant =
                new ArrayList<>();

        for (TavilySearchService.SearchResult result : unique.values()) {

            if (!isYoutubeUrl(result.url())
                    && isRelevant(result, item)) {
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
                "site:youtube.com/watch DIY upcycle "
                        + name + " " + difficulty + " tutorial",
                "site:youtu.be " + name
                        + " reuse DIY " + difficulty + " tutorial"
        );

        Map<String, TavilySearchService.SearchResult> unique =
                new LinkedHashMap<>();

        for (String query : queries) {
            searchAndCollect(query, unique);
        }

        List<TavilySearchService.SearchResult> videos =
                new ArrayList<>();

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

        int matchedWords = 0;

        for (String word : itemName.split("[^a-z0-9]+")) {

            if (word.length() >= 3 && text.contains(word)) {
                matchedWords++;
            }
        }

        if (matchedWords > 0) {
            return true;
        }

        boolean materialMatches =
                !material.equals("unknown")
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

        String projectTitle = safe(project.title())
                .toLowerCase(Locale.ROOT);

        for (TavilySearchService.SearchResult video : videos) {

            String videoTitle = safe(video.title())
                    .toLowerCase(Locale.ROOT);

            for (String word : projectTitle.split("[^a-z0-9]+")) {

                if (word.length() >= 4
                        && videoTitle.contains(word)) {
                    return video.url();
                }
            }
        }

        return videos.get(0).url();
    }

    private boolean isYoutubeUrl(String url) {

        if (url == null || url.isBlank()) {
            return false;
        }

        try {
            String host = URI.create(url.trim()).getHost();

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

        String[] sentences =
                normalized.split("(?<=[.!?])\\s+");

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

        String summary = content.trim()
                .replaceAll("\\s+", " ");

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

        if (!material.equalsIgnoreCase("unknown")
                && !material.equalsIgnoreCase(name)) {
            materials.add(material);
        }

        return materials;
    }

    private String clean(String value) {
        return value == null || value.isBlank()
                ? null
                : value.trim();
    }

    private String firstNonBlank(String... values) {

        for (String value : values) {

            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }

        return "";
    }

    private String safe(String value) {
        return value == null || value.isBlank()
                ? "unknown"
                : value.trim();
    }
}
