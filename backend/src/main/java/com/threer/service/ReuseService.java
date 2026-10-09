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
            "https://router.huggingface.co/v1/chat/completions";

    private static final String MODEL =
            "google/gemma-3-4b-it";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final TavilySearchService tavilySearchService;

    @Value("${huggingface.api-key}")
    private String apiKey;

    public ReuseService(
            ObjectMapper objectMapper,
            TavilySearchService tavilySearchService) {

        this.objectMapper = objectMapper;
        this.tavilySearchService = tavilySearchService;

        this.httpClient =
                HttpClient.newBuilder()
                        .connectTimeout(
                                Duration.ofSeconds(30)
                        )
                        .build();
    }

    public ReuseResponse generateIdeas(
            ReuseRequest request) {

        String difficulty =
                normalizeDifficulty(
                        request.getDifficulty()
                );

        String prompt =
                buildPrompt(
                        request,
                        difficulty
                );

        try {

            Map<String, Object> textPart =
                    Map.of(
                            "type",
                            "text",
                            "text",
                            prompt
                    );

            Map<String, Object> userMessage =
                    Map.of(
                            "role",
                            "user",
                            "content",
                            List.of(textPart)
                    );

            Map<String, Object> body =
                    Map.of(
                            "model",
                            MODEL,
                            "messages",
                            List.of(userMessage),
                            "temperature",
                            0.7,
                            "max_tokens",
                            1800
                    );

            String json =
                    objectMapper.writeValueAsString(
                            body
                    );

            HttpRequest httpRequest =
                    HttpRequest.newBuilder()
                            .uri(
                                    URI.create(API_URL)
                            )
                            .timeout(
                                    Duration.ofSeconds(90)
                            )
                            .header(
                                    "Authorization",
                                    "Bearer " + apiKey
                            )
                            .header(
                                    "Content-Type",
                                    "application/json"
                            )
                            .POST(
                                    HttpRequest.BodyPublishers
                                            .ofString(json)
                            )
                            .build();

            System.out.println(
                    "========== REUSE AI =========="
            );

            System.out.println(
                    "Item: "
                            + request.getName()
            );

            System.out.println(
                    "Difficulty: "
                            + difficulty
            );

            HttpResponse<String> response =
                    httpClient.send(
                            httpRequest,
                            HttpResponse.BodyHandlers.ofString()
                    );

            System.out.println(
                    "Reuse AI HTTP status: "
                            + response.statusCode()
            );

            if (response.statusCode() < 200 ||
                    response.statusCode() >= 300) {

                throw new IllegalStateException(
                        "Hugging Face reuse request failed: "
                                + response.statusCode()
                                + " "
                                + response.body()
                );
            }

            JsonNode root =
                    objectMapper.readTree(
                            response.body()
                    );

            String content =
                    root.path("choices")
                            .path(0)
                            .path("message")
                            .path("content")
                            .asText("");

            System.out.println(
                    "Reuse AI response:"
            );

            System.out.println(content);

            String clean =
                    cleanJson(content);

            JsonNode result =
                    objectMapper.readTree(clean);

            List<ReuseResponse.DiyIdea> ideas =
                    parseIdeas(
                            result,
                            difficulty
                    );

            if (ideas.isEmpty()) {

                throw new IllegalStateException(
                        "AI did not return any valid "
                                + difficulty
                                + " reuse ideas."
                );
            }

            /*
             * Search for a useful tutorial/source
             * for every generated DIY idea.
             */
            List<ReuseResponse.DiyIdea> enrichedIdeas =
                    new ArrayList<>();

            for (ReuseResponse.DiyIdea idea : ideas) {

                TutorialInfo tutorial =
                        findTutorial(
                                request,
                                idea
                        );

                enrichedIdeas.add(
                        new ReuseResponse.DiyIdea(
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
                        )
                );
            }

            System.out.println(
                    "DIY ideas generated: "
                            + enrichedIdeas.size()
            );

            System.out.println(
                    "========== REUSE AI COMPLETE =========="
            );

            return new ReuseResponse(
                    difficulty,
                    enrichedIdeas
            );

        } catch (Exception e) {

            System.out.println(
                    "Reuse AI failed:"
            );

            e.printStackTrace();

            throw new IllegalStateException(
                    "Could not generate reuse ideas.",
                    e
            );
        }
    }

    private String buildPrompt(
            ReuseRequest request,
            String difficulty) {

        String name =
                safe(request.getName());

        String brand =
                safe(request.getBrand());

        String size =
                safe(request.getSize());

        String container =
                safe(request.getContainer());

        String material =
                safe(request.getMaterial());

        return """
                You are a practical DIY reuse assistant.

                The user scanned this real-world item:

                Item: %s
                Brand: %s
                Size: %s
                Container: %s
                Material: %s

                Generate exactly 3 realistic ways to REUSE
                this specific item.

                REQUIRED DIFFICULTY:
                %s

                VERY IMPORTANT:
                Every single idea MUST have the difficulty "%s".
                Do not return Easy or Medium when Hard is requested.
                Do not return Medium or Hard when Easy is requested.
                Do not return Easy or Hard when Medium is requested.

                RULES:

                1. Reuse the actual scanned item.
                2. Do not suggest recycling it.
                3. Prefer cheap household materials.
                4. Ideas must be physically realistic.
                5. Do not suggest unsafe activities.
                6. Do not suggest burning or melting.
                7. Do not suggest dangerous chemical storage.
                8. Easy means beginner-friendly with very simple tools.
                9. Medium can require several steps or basic tools.
                10. Hard can require more construction or creativity.
                11. Make the three ideas meaningfully different.
                12. Keep the instructions practical.
                13. Food packaging should be cleaned and dried first.
                14. Do not recommend unsuitable food storage.
                15. Do not invent brand-specific features.
                16. Explain what the finished product should look like.
                17. Materials and tools must actually be needed.
                18. Steps must be ordered from start to finish.

                Return ONLY valid JSON.

                Use exactly this structure:

                {
                  "ideas": [
                    {
                      "title": "Short DIY title",
                      "difficulty": "%s",
                      "summary": "Short explanation of the DIY",
                      "finalProduct": "Description of what the finished product should look like",
                      "materials": [
                        "material 1",
                        "material 2"
                      ],
                      "tools": [
                        "tool 1",
                        "tool 2"
                      ],
                      "steps": [
                        "Step 1",
                        "Step 2",
                        "Step 3"
                      ]
                    }
                  ]
                }

                Do not include markdown.
                Do not include ```json.
                """.formatted(
                name,
                brand,
                size,
                container,
                material,
                difficulty,
                difficulty,
                difficulty
        );
    }

    private List<ReuseResponse.DiyIdea> parseIdeas(
            JsonNode root,
            String requestedDifficulty) {

        List<ReuseResponse.DiyIdea> ideas =
                new ArrayList<>();

        JsonNode array =
                root.path("ideas");

        if (!array.isArray()) {
            return ideas;
        }

        for (JsonNode idea : array) {

            String title =
                    idea.path("title")
                            .asText("");

            String difficulty =
                    idea.path("difficulty")
                            .asText("");

            String summary =
                    idea.path("summary")
                            .asText("");

            String finalProduct =
                    idea.path("finalProduct")
                            .asText("");

            List<String> materials =
                    readStringArray(
                            idea.path("materials")
                    );

            List<String> tools =
                    readStringArray(
                            idea.path("tools")
                    );

            List<String> steps =
                    readStringArray(
                            idea.path("steps")
                    );

            /*
             * Only accept ideas matching the selected
             * difficulty.
             */
            if (!difficulty.equalsIgnoreCase(
                    requestedDifficulty)) {

                System.out.println(
                        "Ignoring mismatched AI idea: "
                                + title
                                + " ["
                                + difficulty
                                + "]"
                );

                continue;
            }

            if (!title.isBlank()) {

                ideas.add(
                        new ReuseResponse.DiyIdea(
                                title,
                                requestedDifficulty,
                                summary,
                                finalProduct,
                                materials,
                                tools,
                                steps,
                                "",
                                "",
                                "",
                                ""
                        )
                );
            }
        }

        return ideas;
    }

    private TutorialInfo findTutorial(
            ReuseRequest request,
            ReuseResponse.DiyIdea idea) {

        try {

            String query =
                    "\"" + idea.title() + "\" "
                            + "\"" + safe(request.getMaterial()) + "\" "
                            + "DIY tutorial";

            System.out.println(
                    "Searching tutorial: "
                            + query
            );

            List<TavilySearchService.SearchResult> results =
                    tavilySearchService.searchGeneral(
                            query
                    );

            if (results.isEmpty()) {

                return new TutorialInfo(
                        "",
                        "",
                        "",
                        ""
                );
            }

            /*
             * Prefer YouTube results.
             */
            for (TavilySearchService.SearchResult result :
                    results) {

                String url =
                        result.url();

                if (url != null &&
                        (url.contains("youtube.com/watch") ||
                         url.contains("youtu.be/"))) {

                    return new TutorialInfo(
                            result.title(),
                            url,
                            result.title(),
                            url
                    );
                }
            }

            /*
             * If there is no YouTube result,
             * use the best general web source.
             */
            TavilySearchService.SearchResult first =
                    results.get(0);

            return new TutorialInfo(
                    first.title(),
                    first.url(),
                    first.title(),
                    first.url()
            );

        } catch (Exception e) {

            System.out.println(
                    "Tutorial search failed:"
            );

            e.printStackTrace();

            return new TutorialInfo(
                    "",
                    "",
                    "",
                    ""
            );
        }
    }

    private List<String> readStringArray(
            JsonNode node) {

        List<String> values =
                new ArrayList<>();

        if (!node.isArray()) {
            return values;
        }

        for (JsonNode value : node) {

            String text =
                    value.asText("");

            if (!text.isBlank()) {
                values.add(text);
            }
        }

        return values;
    }

    private String normalizeDifficulty(
            String difficulty) {

        if (difficulty == null) {
            return "Easy";
        }

        if (difficulty.equalsIgnoreCase("medium")) {
            return "Medium";
        }

        if (difficulty.equalsIgnoreCase("hard")) {
            return "Hard";
        }

        return "Easy";
    }

    private String safe(String value) {

        if (value == null ||
                value.isBlank()) {

            return "unknown";
        }

        return value;
    }

    private String cleanJson(
            String text) {

        String clean =
                text.trim();

        if (clean.startsWith("```json")) {

            clean =
                    clean.substring(7);

        } else if (clean.startsWith("```")) {

            clean =
                    clean.substring(3);
        }

        if (clean.endsWith("```")) {

            clean =
                    clean.substring(
                            0,
                            clean.length() - 3
                    );
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