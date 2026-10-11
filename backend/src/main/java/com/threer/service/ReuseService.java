
package com.threer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.threer.dto.ReuseRequest;
import com.threer.dto.ReuseResponse;
import com.threer.model.ScannedItem;
import com.threer.repository.ScannedItemRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class ReuseService {

    private static final String API_URL =
            "https://api.groq.com/openai/v1/chat/completions";

    private static final String MODEL = "qwen/qwen3.8-27b";
    private static final int MAX_GENERATION_ATTEMPTS = 2;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final TavilySearchService tavilySearchService;
    private final ScannedItemRepository scannedItemRepository;

    @Value("${groq.api-key}")
    private String apiKey;

    public ReuseService(
            ObjectMapper objectMapper,
            TavilySearchService tavilySearchService,
            ScannedItemRepository scannedItemRepository
    ) {
        this.objectMapper = objectMapper;
        this.tavilySearchService = tavilySearchService;
        this.scannedItemRepository = scannedItemRepository;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
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
                    "Please confirm the item's identification before generating DIY ideas."
            );
        }

        if (item.getName() == null || item.getName().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The confirmed item has no name. Please correct its identification first."
            );
        }

        // Always use the saved, confirmed item details.
        // Do not trust the name/material supplied by the frontend.
        String difficulty = normalizeDifficulty(request.getDifficulty());
        String prompt = buildPrompt(item, difficulty);

        try {
            List<ReuseResponse.DiyIdea> ideas = new ArrayList<>();

            for (int attempt = 1;
                 attempt <= MAX_GENERATION_ATTEMPTS;
                 attempt++) {

                System.out.println("========== GROQ REUSE ==========");
                System.out.println("Confirmed item: " + item.getName());
                System.out.println("Item ID: " + item.getId());
                System.out.println("Difficulty: " + difficulty);
                System.out.println(
                        "Generation attempt: " + attempt + "/"
                                + MAX_GENERATION_ATTEMPTS
                );

                JsonNode root = sendGroqRequest(
                        buildRequestBody(prompt, attempt)
                );

                String finishReason = root.path("choices")
                        .path(0)
                        .path("finish_reason")
                        .asText("");

                String content = root.path("choices")
                        .path(0)
                        .path("message")
                        .path("content")
                        .asText("");

                if (content.isBlank()) {
                    System.err.println("Groq returned empty content.");
                    continue;
                }

                if ("length".equalsIgnoreCase(finishReason)) {
                    System.err.println(
                            "Groq reached its output token limit."
                    );
                    continue;
                }

                try {
                    JsonNode result = objectMapper.readTree(
                            cleanJson(content)
                    );

                    ideas = parseIdeas(result, difficulty);

                    if (!ideas.isEmpty()) {
                        break;
                    }

                    System.err.println(
                            "Groq returned JSON without valid DIY ideas."
                    );

                } catch (JsonProcessingException e) {
                    System.err.println(
                            "Groq returned invalid or incomplete JSON: "
                                    + e.getOriginalMessage()
                    );
                }

                if (attempt < MAX_GENERATION_ATTEMPTS) {
                    System.out.println(
                            "Retrying DIY generation with a larger "
                                    + "output allowance..."
                    );
                }
            }

            if (ideas.isEmpty()) {
                throw new IllegalStateException(
                        "Groq could not generate valid DIY ideas after "
                                + MAX_GENERATION_ATTEMPTS
                                + " attempts. Please try again."
                );
            }

            // Tavily is optional here and searches for tutorials only.
            List<TavilySearchService.SearchResult> tutorialResults =
                    findTutorials(item);

            List<ReuseResponse.DiyIdea> enrichedIdeas = new ArrayList<>();

            for (int i = 0; i < ideas.size(); i++) {
                ReuseResponse.DiyIdea idea = ideas.get(i);

                TutorialInfo tutorial =
                        chooseTutorial(tutorialResults, i);

                enrichedIdeas.add(new ReuseResponse.DiyIdea(
                        idea.title(),
                        difficulty,
                        idea.summary(),
                        idea.finalProduct(),
                        idea.materials(),
                        idea.tools(),
                        idea.steps(),
                        tutorial.tutorialTitle(),
                        tutorial.tutorialUrl(),
                        tutorial.sourceTitle(),
                        tutorial.sourceUrl()
                ));
            }

            System.out.println(
                    "DIY ideas generated: " + enrichedIdeas.size()
            );
            System.out.println("========== REUSE COMPLETE ==========");

            return new ReuseResponse(difficulty, enrichedIdeas);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Reuse generation was interrupted.", e
            );
        } catch (Exception e) {
            System.err.println(
                    "Reuse generation failed: " + e.getMessage()
            );

            throw new IllegalStateException(
                    "Could not generate reuse ideas: " + e.getMessage(), e
            );
        }
    }

    private String buildRequestBody(String prompt, int attempt)
            throws JsonProcessingException {

        int maxTokens = attempt == 1 ? 1200 : 1800;

        Map<String, Object> body = Map.of(
                "model", MODEL,
                "messages", List.of(
                        Map.of(
                                "role", "system",
                                "content", "You generate practical DIY reuse "
                                        + "ideas. Follow the requested JSON "
                                        + "structure exactly."
                        ),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.2,
                "max_tokens", maxTokens,
                "response_format", Map.of("type", "json_object")
        );

        return objectMapper.writeValueAsString(body);
    }

    private JsonNode sendGroqRequest(String json) throws Exception {

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .timeout(Duration.ofSeconds(90))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        synchronized (GroqVisionService.GROQ_REQUEST_LOCK) {

            for (int attempt = 1; attempt <= 3; attempt++) {

                HttpResponse<String> response = httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );

                int status = response.statusCode();

                System.out.println("Groq reuse HTTP status: " + status);

                if (status >= 200 && status < 300) {
                    return objectMapper.readTree(response.body());
                }

                boolean retryable = status == 429 || status >= 500;

                if (!retryable || attempt == 3) {
                    throw new IllegalStateException(
                            "Groq reuse request failed: HTTP "
                                    + status + " " + response.body()
                    );
                }

                long waitSeconds = retryDelaySeconds(response, attempt);

                System.out.println(
                        "Groq request temporarily failed. Retrying in "
                                + waitSeconds + " seconds."
                );

                Thread.sleep(waitSeconds * 1000L);
            }
        }

        throw new IllegalStateException("Groq reuse request failed.");
    }

    private long retryDelaySeconds(
            HttpResponse<?> response,
            int attempt
    ) {
        try {
            String retryAfter =
                    response.headers().firstValue("Retry-After").orElse("");

            if (!retryAfter.isBlank()) {
                return Math.min(30, Math.max(1,
                        (long) Math.ceil(Double.parseDouble(retryAfter))));
            }

            String reset = response.headers()
                    .firstValue("x-ratelimit-reset-tokens")
                    .orElse("");

            if (reset.endsWith("s")) {
                double seconds = Double.parseDouble(
                        reset.substring(0, reset.length() - 1)
                );

                return Math.min(30, Math.max(1,
                        (long) Math.ceil(seconds)));
            }
        } catch (Exception ignored) {
            // Use the fallback delay.
        }

        return Math.min(15, attempt * 5L);
    }

    private String buildPrompt(ScannedItem item, String difficulty) {

        return """
                Generate exactly 3 practical DIY REUSE ideas for this item.
                Do not suggest recycling.

                Item: %s
                Brand: %s
                Size: %s
                Container: %s
                Material: %s
                Required difficulty: %s

                Requirements:
                - Every idea must match the requested difficulty.
                - Reuse the actual item and make the ideas different.
                - Keep projects cheap, practical and realistic.
                - Easy uses simple tools; Medium uses basic tools;
                  Hard involves more construction.
                - Include 3 or 4 short, ordered steps per idea.
                - Use no more than 4 materials and 3 tools per idea.
                - Keep the summary and final product description to one
                  short sentence each.
                - Avoid burning, melting, dangerous chemicals and unsafe uses.
                - Clean and dry packaging before reuse.
                - Do not invent brand features.
                - Return a JSON object with an "ideas" array.
                - Return JSON only, with no Markdown or extra commentary.
                - Include all required fields for all 3 ideas.

                Required JSON structure:
                {
                  "ideas": [
                    {
                      "title": "Short title",
                      "difficulty": "%s",
                      "summary": "Short explanation",
                      "finalProduct": "Finished product description",
                      "materials": ["material"],
                      "tools": ["tool"],
                      "steps": ["Step 1", "Step 2", "Step 3"]
                    }
                  ]
                }
                """.formatted(
                safe(item.getName()),
                safe(item.getBrand()),
                safe(item.getSize()),
                safe(item.getContainer()),
                safe(item.getMaterial()),
                difficulty,
                difficulty
        );
    }

    private List<ReuseResponse.DiyIdea> parseIdeas(
            JsonNode root,
            String requestedDifficulty
    ) {
        List<ReuseResponse.DiyIdea> ideas = new ArrayList<>();
        JsonNode array = root.path("ideas");

        if (!array.isArray()) {
            return ideas;
        }

        for (JsonNode idea : array) {
            String title = idea.path("title").asText("").trim();
            String returnedDifficulty =
                    idea.path("difficulty").asText("");

            if (title.isBlank()
                    || !returnedDifficulty.equalsIgnoreCase(
                            requestedDifficulty)) {
                continue;
            }

            List<String> steps = readStringArray(idea.path("steps"));

            if (steps.isEmpty()) {
                continue;
            }

            ideas.add(new ReuseResponse.DiyIdea(
                    title,
                    requestedDifficulty,
                    idea.path("summary").asText(""),
                    idea.path("finalProduct").asText(""),
                    readStringArray(idea.path("materials")),
                    readStringArray(idea.path("tools")),
                    steps,
                    "",
                    "",
                    "",
                    ""
            ));
        }

        return ideas;
    }

    private List<TavilySearchService.SearchResult> findTutorials(
            ScannedItem item
    ) {
        try {
            String query = safe(item.getName()) + " "
                    + safe(item.getMaterial())
                    + " DIY reuse project tutorial";

            System.out.println("Searching DIY tutorials: " + query);

            List<TavilySearchService.SearchResult> results =
                    tavilySearchService.searchGeneral(query);

            return results == null ? List.of() : results;

        } catch (Exception e) {
            System.err.println(
                    "Optional tutorial search failed: " + e.getMessage()
            );

            return List.of();
        }
    }

    private TutorialInfo chooseTutorial(
            List<TavilySearchService.SearchResult> results,
            int ideaIndex
    ) {
        if (results.isEmpty()) {
            return emptyTutorial();
        }

        int index = Math.min(ideaIndex, results.size() - 1);

        for (TavilySearchService.SearchResult result : results) {
            String url = result.url();

            if (url != null && (
                    url.contains("youtube.com/watch")
                    || url.contains("youtu.be/"))) {
                return new TutorialInfo(
                        result.title(),
                        url,
                        result.title(),
                        url
                );
            }
        }

        TavilySearchService.SearchResult result = results.get(index);

        return new TutorialInfo(
                result.title(),
                result.url(),
                result.title(),
                result.url()
        );
    }

    private TutorialInfo emptyTutorial() {
        return new TutorialInfo("", "", "", "");
    }

    private List<String> readStringArray(JsonNode node) {
        List<String> values = new ArrayList<>();

        if (node.isArray()) {
            for (JsonNode value : node) {
                String text = value.asText("").trim();

                if (!text.isBlank()) {
                    values.add(text);
                }
            }
        }

        return values;
    }

    private String normalizeDifficulty(String difficulty) {
        if (difficulty != null) {
            if (difficulty.equalsIgnoreCase("medium")) return "Medium";
            if (difficulty.equalsIgnoreCase("hard")) return "Hard";
        }

        return "Easy";
    }

    private String safe(String value) {
        return value == null || value.isBlank()
                ? "unknown"
                : value.trim();
    }

    private String cleanJson(String text) {
        String clean = text.trim();

        if (clean.startsWith("```json")) {
            clean = clean.substring(7);
        } else if (clean.startsWith("```")) {
            clean = clean.substring(3);
        }

        if (clean.endsWith("```")) {
            clean = clean.substring(0, clean.length() - 3);
        }

        return clean.trim();
    }

    private record TutorialInfo(
            String tutorialTitle,
            String tutorialUrl,
            String sourceTitle,
            String sourceUrl
    ) {
    }
}
