
package com.threer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class GroqVisionService {

    private static final String API_URL =
            "https://api.groq.com/openai/v1/chat/completions";

    private static final String MODEL = "qwen/qwen3.8-27b";

    // Shared by vision, recycling verification and reuse generation.
    public static final Object GROQ_REQUEST_LOCK = new Object();

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${groq.api-key}")
    private String apiKey;

    public GroqVisionService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    public VisionResult analyzeImage(String imageDataUri) {
        try {
            if (imageDataUri == null || imageDataUri.isBlank()) {
                throw new IllegalArgumentException("Image is required.");
            }

            System.out.println("========== GROQ VISION ==========");

            String base64Image = imageDataUri;

            if (imageDataUri.contains(",")) {
                base64Image =
                        imageDataUri.substring(imageDataUri.indexOf(",") + 1);
            }

            String prompt = """
                    Identify the main real-world item in this image.

                    Read visible product names, brand and size when possible.
                    Do not invent details. Use "unknown" when uncertain.
                    Identify the likely main material.

                    Return valid JSON only:
                    {
                      "name": "item name",
                      "brand": "brand or unknown",
                      "size": "size or unknown",
                      "container": "container type or unknown",
                      "material": "main material or unknown",
                      "confidence": 0.0,
                      "description": "short description"
                    }

                    Confidence must be between 0 and 1.
                    """;

            Map<String, Object> requestBody = Map.of(
                    "model", MODEL,
                    "messages", new Object[]{
                            Map.of(
                                    "role", "user",
                                    "content", new Object[]{
                                            Map.of(
                                                    "type", "text",
                                                    "text", prompt
                                            ),
                                            Map.of(
                                                    "type", "image_url",
                                                    "image_url", Map.of(
                                                            "url",
                                                            "data:image/jpeg;base64,"
                                                                    + base64Image
                                                    )
                                            )
                                    }
                            )
                    },
                    "temperature", 0.1,
                    "max_tokens", 350
            );

            JsonNode response = sendRequest(
                    objectMapper.writeValueAsString(requestBody)
            );

            JsonNode result = objectMapper.readTree(
                    cleanJson(getMessageContent(response))
            );

            String name = result.path("name").asText("unknown");
            String brand = result.path("brand").asText("unknown");
            String size = result.path("size").asText("unknown");
            String container = result.path("container").asText("unknown");
            String material = result.path("material").asText("unknown");
            double confidence = clamp(
                    result.path("confidence").asDouble(0.0)
            );
            String description = result.path("description").asText("");

            System.out.println("Identified item: " + name);
            System.out.println("Material: " + material);

            return new VisionResult(
                    name, brand, size, container,
                    material, confidence, description
            );

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Vision request was interrupted.", e
            );
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Groq vision request failed: " + e.getMessage(), e
            );
        }
    }

    public RecyclingResult verifyRecycling(
            VisionResult item,
            List<TavilySearchService.SearchResult> searchResults) {

        try {
            System.out.println(
                    "========== GROQ RECYCLING VERIFICATION =========="
            );

            StringBuilder sources = new StringBuilder();

            for (int i = 0; i < searchResults.size(); i++) {
                TavilySearchService.SearchResult result = searchResults.get(i);

                sources.append("\nSOURCE ").append(i + 1)
                        .append("\nTITLE: ").append(result.title())
                        .append("\nURL: ").append(result.url())
                        .append("\nCONTENT: ").append(result.content())
                        .append("\n");
            }

            String prompt = """
                    Verify recycling information for an application in Malaysia.

                    ITEM: %s
                    BRAND: %s
                    SIZE: %s
                    CONTAINER: %s
                    MATERIAL: %s
                    DESCRIPTION: %s

                    WEB SOURCES:
                    %s

                    Rules:
                    - Prefer official and Malaysia-specific evidence.
                    - Do not assume overseas acceptance applies in Malaysia.
                    - If evidence is insufficient or conflicting, use false and unknown.
                    - Consider contamination where supported by the evidence.
                    - Allowed bin values: plastic, glass, paper, metal, e-waste,
                      other, unknown.
                    - Return valid JSON only.

                    {
                      "recyclable": false,
                      "bin": "unknown",
                      "instructions": "short instructions",
                      "reason": "short explanation",
                      "confidence": 0.0
                    }
                    """.formatted(
                    safe(item.item()),
                    safe(item.brand()),
                    safe(item.size()),
                    safe(item.container()),
                    safe(item.material()),
                    safe(item.description()),
                    sources
            );

            Map<String, Object> requestBody = Map.of(
                    "model", MODEL,
                    "messages", new Object[]{
                            Map.of("role", "user", "content", prompt)
                    },
                    "temperature", 0.1,
                    "max_tokens", 350
            );

            JsonNode response = sendRequest(
                    objectMapper.writeValueAsString(requestBody)
            );

            JsonNode result = objectMapper.readTree(
                    cleanJson(getMessageContent(response))
            );

            boolean recyclable =
                    result.path("recyclable").asBoolean(false);

            String bin = result.path("bin").asText("unknown");
            String instructions = result.path("instructions").asText("");
            String reason = result.path("reason").asText("");
            double confidence = clamp(
                    result.path("confidence").asDouble(0.0)
            );

            String material = safe(item.material()).toLowerCase();
            String normalizedBin = bin.toLowerCase();

            boolean materialBinConflict =
                    (material.contains("plastic") && normalizedBin.contains("glass"))
                    || (material.contains("glass") && normalizedBin.contains("plastic"))
                    || (material.contains("paper") && normalizedBin.contains("glass"))
                    || (material.contains("glass") && normalizedBin.contains("paper"));

            if (materialBinConflict) {
                recyclable = false;
                bin = "unknown";
                instructions = "Recycling information could not be verified.";
                reason = "The identified material conflicts with the suggested bin.";
                confidence = 0.0;
            }

            String combinedText = (
                    safe(item.item()) + " "
                    + safe(item.container()) + " "
                    + safe(item.description()) + " "
                    + instructions + " "
                    + reason
            ).toLowerCase();

            boolean foodContamination =
                    combinedText.contains("food residue")
                    || combinedText.contains("food contamination")
                    || combinedText.contains("grease")
                    || combinedText.contains("greasy")
                    || combinedText.contains("food stain")
                    || combinedText.contains("food-soiled")
                    || combinedText.contains("food soiled")
                    || combinedText.contains("heavily contaminated");

            boolean paperFoodPackaging =
                    material.contains("paper")
                    || material.contains("cardboard");

            if (foodContamination && paperFoodPackaging) {
                recyclable = false;
                bin = "unknown";
                instructions =
                        "Do not place food-contaminated paper in the recycling bin.";
                reason =
                        "The paper packaging may be contaminated with food or grease.";
                confidence = 0.0;
            }

            System.out.println("Recyclable: " + recyclable);
            System.out.println("Bin: " + bin);

            return new RecyclingResult(
                    recyclable, bin, instructions, reason, confidence
            );

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();

            return new RecyclingResult(
                    false,
                    "unknown",
                    "",
                    "Recycling verification was interrupted.",
                    0.0
            );

        } catch (Exception e) {
            System.err.println(
                    "Recycling verification failed: " + e.getMessage()
            );

            return new RecyclingResult(
                    false,
                    "unknown",
                    "",
                    "Recycling information could not be verified.",
                    0.0
            );
        }
    }

    private JsonNode sendRequest(String json) throws Exception {

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .timeout(Duration.ofSeconds(90))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        synchronized (GROQ_REQUEST_LOCK) {

            for (int attempt = 1; attempt <= 3; attempt++) {
                HttpResponse<String> response = httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );

                int status = response.statusCode();

                System.out.println("Groq HTTP status: " + status);

                if (status >= 200 && status < 300) {
                    return objectMapper.readTree(response.body());
                }

                boolean retryable = status == 429 || status >= 500;

                if (!retryable || attempt == 3) {
                    throw new IllegalStateException(
                            "Groq request failed with HTTP "
                                    + status + ": " + response.body()
                    );
                }

                long delay = retryDelaySeconds(response, attempt);

                System.out.println(
                        "Groq request temporarily failed. Retrying in "
                                + delay + " seconds."
                );

                Thread.sleep(delay * 1000L);
            }
        }

        throw new IllegalStateException("Groq request failed.");
    }

    private long retryDelaySeconds(
            HttpResponse<?> response,
            int attempt) {

        try {
            String retryAfter = response.headers()
                    .firstValue("Retry-After")
                    .orElse("");

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
            // Fall back to a short delay.
        }

        return Math.min(15, attempt * 5L);
    }

    private String getMessageContent(JsonNode response) {
        JsonNode choices = response.path("choices");

        if (!choices.isArray() || choices.isEmpty()) {
            throw new IllegalStateException("Groq returned no choices.");
        }

        String content = choices.get(0)
                .path("message")
                .path("content")
                .asText("");

        if (content.isBlank()) {
            throw new IllegalStateException("Groq returned empty content.");
        }

        return content;
    }

    private String cleanJson(String content) {
        String clean = content.trim();

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

    private String safe(String value) {
        return value == null || value.isBlank() ? "unknown" : value.trim();
    }

    private double clamp(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    public record VisionResult(
            String item,
            String brand,
            String size,
            String container,
            String material,
            double confidence,
            String description) {
    }

    public record RecyclingResult(
            boolean recyclable,
            String bin,
            String instructions,
            String reason,
            double confidence) {
    }
}