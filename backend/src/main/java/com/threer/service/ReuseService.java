
package com.threer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.threer.dto.ReuseRequest;
import com.threer.dto.ReuseResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

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

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final TavilySearchService tavilySearchService;

    @Value("${groq.api-key}")
    private String apiKey;

    public ReuseService(
            ObjectMapper objectMapper,
            TavilySearchService tavilySearchService) {

        this.objectMapper = objectMapper;
        this.tavilySearchService = tavilySearchService;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    public ReuseResponse generateIdeas(ReuseRequest request) {

        if (request == null || request.getName() == null
                || request.getName().isBlank()) {
            throw new IllegalArgumentException(
                    "An identified item is required to generate reuse ideas."
            );
        }

        String difficulty = normalizeDifficulty(request.getDifficulty());
        String prompt = buildPrompt(request, difficulty);

        try {
            Map<String, Object> body = Map.of(
                    "model", MODEL,
                    "messages", List.of(
                            Map.of("role", "user", "content", prompt)
                    ),
                    "temperature", 0.3,
                    "max_tokens", 650
            );

            String json = objectMapper.writeValueAsString(body);

            System.out.println("========== GROQ REUSE ==========");
            System.out.println("Item: " + request.getName());
            System.out.println("Difficulty: " + difficulty);

            JsonNode root = sendGroqRequest(json);
            String content = root.path("choices")
                    .path(0)
                    .path("message")
                    .path("content")
                    .asText("");

            if (content.isBlank()) {
                throw new IllegalStateException(
                        "Groq returned an empty reuse response."
                );
            }

            JsonNode result = objectMapper.readTree(cleanJson(content));
            List<ReuseResponse.DiyIdea> ideas =
                    parseIdeas(result, difficulty);

            if (ideas.isEmpty()) {
                throw new IllegalStateException(
                        "Groq did not return valid " + difficulty + " ideas."
                );
            }

            // One web search for all generated ideas instead of one
            // Tavily request per idea.
            List<TavilySearchService.SearchResult> tutorialResults =
                    findTutorials(request);

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

    private JsonNode sendGroqRequest(String json) throws Exception {

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .timeout(Duration.ofSeconds(90))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        // Share the lock with vision and recycling verification.
        // This prevents these services from sending Groq requests
        // simultaneously inside this application.
        synchronized (HuggingFaceVisionService.GROQ_REQUEST_LOCK) {

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
                        "Groq reuse request limited/temporarily failed. "
                                + "Retrying in " + waitSeconds + " seconds."
                );

                Thread.sleep(waitSeconds * 1000L);
            }
        }

        throw new IllegalStateException("Groq reuse request failed.");
    }

    private long retryDelaySeconds(
            HttpResponse<?> response,
            int attempt) {

        try {
            String retryAfter =
                    response.headers().firstValue("Retry-After").orElse("");

            if (!retryAfter.isBlank()) {
                return Math.min(30, Math.max(1,
                        (long) Math.ceil(Double.parseDouble(retryAfter))));
            }

            String reset =
                    response.headers()
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
            // Use the fallback delay below.
        }

        return Math.min(15, attempt * 5L);
    }

    private String buildPrompt(
            ReuseRequest request,
            String difficulty) {

        return """
                Create exactly 3 practical DIY REUSE ideas for this item.
                Do not suggest recycling.

                Item: %s
                Brand: %s
                Size: %s
                Container: %s
                Material: %s
                Required difficulty: %s

                Rules:
                - All ideas must match the requested difficulty.
                - Make ideas different, cheap and realistic.
                - Reuse the actual item.
                - Include clear, ordered steps.
                - Avoid burning, melting, dangerous chemicals and unsafe uses.
                - Clean and dry packaging before reuse.
                - Do not invent brand features.
                - Easy: simple tools; Medium: basic tools; Hard: more construction.
                - Keep each summary and step concise.
                - Return valid JSON only, with no Markdown fences.

                JSON structure:
                {
                  "ideas": [
                    {
                      "title": "Short title",
                      "difficulty": "%s",
                      "summary": "Short explanation",
                      "finalProduct": "Description of finished product",
                      "materials": ["material"],
                      "tools": ["tool"],
                      "steps": ["Step 1", "Step 2", "Step 3"]
                    }
                  ]
                }
                """.formatted(
                safe(request.getName()),
                safe(request.getBrand()),
                safe(request.getSize()),
                safe(request.getContainer()),
                safe(request.getMaterial()),
                difficulty,
                difficulty
        );
    }

    private List<ReuseResponse.DiyIdea> parseIdeas(
            JsonNode root,
            String requestedDifficulty) {

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

            ideas.add(new ReuseResponse.DiyIdea(
                    title,
                    requestedDifficulty,
                    idea.path("summary").asText(""),
                    idea.path("finalProduct").asText(""),
                    readStringArray(idea.path("materials")),
                    readStringArray(idea.path("tools")),
                    readStringArray(idea.path("steps")),
                    "",
                    "",
                    "",
                    ""
            ));
        }

        return ideas;
    }

    private List<TavilySearchService.SearchResult> findTutorials(
            ReuseRequest request) {

        try {
            String query = safe(request.getName()) + " "
                    + safe(request.getMaterial())
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
            int ideaIndex) {

        if (results.isEmpty()) {
            return emptyTutorial();
        }

        // Prefer a different result for each idea where possible.
        int index = Math.min(ideaIndex, results.size() - 1);

        // Prefer YouTube when one is available.
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
        return value == null || value.isBlank() ? "unknown" : value.trim();
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
            String sourceUrl) {
    }
}