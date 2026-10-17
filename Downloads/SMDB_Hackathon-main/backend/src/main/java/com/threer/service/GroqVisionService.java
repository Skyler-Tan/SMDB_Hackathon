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

    /**
     * Identifies an object and, where applicable, its packaging material.
     */
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
                    Identify the main physical object or product in this image.

                    CRITICAL: IDENTIFY THE PHYSICAL MATERIAL CORRECTLY.

                    The "material" field must describe the material of the
                    physical object or its packaging, NOT the contents inside it.

                    Examples:
                    - Seaweed snacks inside a plastic packet:
                      name = "Seaweed snacks"
                      material = "plastic"
                      container = "plastic packet"

                    - Biscuits inside a plastic wrapper:
                      name = "Biscuits"
                      material = "plastic"
                      container = "plastic wrapper"

                    - A drink inside a glass bottle:
                      name = "Drink bottle"
                      material = "glass"
                      container = "glass bottle"

                    - A drink inside an aluminium can:
                      name = "Drink can"
                      material = "metal"
                      container = "metal can"

                    - A product inside a cardboard box:
                      name = "Product box"
                      material = "cardboard"
                      container = "cardboard box"

                    - A standalone camera lens:
                      name = "Camera lens"
                      material = "mixed materials" if multiple materials
                      are visibly present; otherwise identify the main
                      visible structural material or use "unknown".

                    MATERIAL RULES:
                    1. Do not return "seaweed" for the packaging material
                       just because the package contains seaweed.
                    2. Do not return "food", "liquid", or other contents
                       as the packaging material.
                    3. Inspect the visible wrapper, bag, bottle, jar,
                       box, can, or other container.
                    4. If the user photographs a standalone object rather
                       than packaging, identify the object's main material.
                    5. If multiple materials are visibly important, use
                       "mixed materials".
                    6. Never claim a material is certain when it cannot
                       reasonably be determined from the image.
                    7. Use "unknown" if the material is not visually clear.
                    8. Do not assume all food packaging is plastic.
                    9. Do not invent brand names, sizes, or product details.
                    10. Keep the item name short and descriptive.

                    Read the visible brand and size when possible.
                    The container field describes the physical packaging
                    or object type, not its contents.

                    Return valid JSON only, without Markdown fences:
                    {
                      "name": "item or product name",
                      "brand": "brand or unknown",
                      "size": "size or unknown",
                      "container": "visible container or object type",
                      "material": "physical packaging or object material",
                      "confidence": 0.0,
                      "description": "short description of the visible object"
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
            System.out.println("Brand: " + brand);
            System.out.println("Container: " + container);
            System.out.println("Packaging/object material: " + material);
            System.out.println("Confidence: " + confidence);

            return new VisionResult(
                    name,
                    brand,
                    size,
                    container,
                    material,
                    confidence,
                    description
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

    /**
     * Verifies recycling information against the supplied web search results.
     */
    public RecyclingResult verifyRecycling(
            VisionResult item,
            List<TavilySearchService.SearchResult> searchResults) {

        try {
            System.out.println(
                    "========== GROQ RECYCLING VERIFICATION =========="
            );

            StringBuilder sources = new StringBuilder();

            if (searchResults != null) {
                for (int i = 0; i < searchResults.size(); i++) {
                    TavilySearchService.SearchResult result =
                            searchResults.get(i);

                    sources.append("\nSOURCE ").append(i + 1)
                            .append("\nTITLE: ").append(result.title())
                            .append("\nURL: ").append(result.url())
                            .append("\nCONTENT: ").append(result.content())
                            .append("\n");
                }
            }

            if (sources.isEmpty()) {
                return new RecyclingResult(
                        false,
                        "unknown",
                        "Check with your local recycling provider.",
                        "No web search evidence was available.",
                        0.0
                );
            }

            String prompt = """
                    Verify whether the following physical item can be
                    recycled in Malaysia using the supplied web sources.

                    ITEM: %s
                    BRAND: %s
                    SIZE: %s
                    CONTAINER: %s
                    MATERIAL: %s
                    DESCRIPTION: %s

                    WEB SOURCES:
                    %s

                    RULES:
                    1. Prefer official Malaysian government, municipal,
                       waste-management, or recycling-provider sources.
                    2. Do not assume overseas recycling rules apply in Malaysia.
                    3. Do not treat search-result snippets as proof if they
                       do not actually support the recycling decision.
                    4. If evidence is insufficient or conflicting, return
                       recyclable=false and bin="unknown".
                    5. Do not assume an item is accepted merely because its
                       material is theoretically recyclable.
                    6. Consider local collection restrictions and contamination
                       only when supported by the available evidence.
                    7. Allowed bin values: plastic, glass, paper, metal,
                       e-waste, other, unknown.
                    8. The bin must match the identified physical material.
                    9. Return valid JSON only, without Markdown fences.

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
                    sources.toString()
            );

            Map<String, Object> requestBody = Map.of(
                    "model", MODEL,
                    "messages", new Object[]{
                            Map.of(
                                    "role", "user",
                                    "content", prompt
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

            boolean recyclable =
                    result.path("recyclable").asBoolean(false);

            String bin = result.path("bin").asText("unknown");
            String instructions = result.path("instructions").asText("");
            String reason = result.path("reason").asText("");

            double confidence = clamp(
                    result.path("confidence").asDouble(0.0)
            );

            String material = safe(item.material()).toLowerCase();
            String normalizedBin = safe(bin).toLowerCase();

            boolean materialBinConflict =
                    (material.contains("plastic")
                            && normalizedBin.equals("glass"))
                    || (material.contains("glass")
                            && normalizedBin.equals("plastic"))
                    || ((material.contains("paper")
                            || material.contains("cardboard"))
                            && normalizedBin.equals("glass"))
                    || (material.contains("glass")
                            && normalizedBin.equals("paper"));

            if (materialBinConflict) {
                recyclable = false;
                bin = "unknown";
                instructions =
                        "Recycling information could not be verified.";
                reason =
                        "The identified material conflicts with the suggested bin.";
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
            System.out.println("Verification confidence: " + confidence);

            return new RecyclingResult(
                    recyclable,
                    bin,
                    instructions,
                    reason,
                    confidence
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

    /**
     * Sends a request to Groq, retrying rate-limit and server errors.
     */
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
                return Math.min(
                        30,
                        Math.max(
                                1,
                                (long) Math.ceil(
                                        Double.parseDouble(retryAfter)
                                )
                        )
                );
            }

            String reset = response.headers()
                    .firstValue("x-ratelimit-reset-tokens")
                    .orElse("");

            if (reset.endsWith("s")) {
                double seconds = Double.parseDouble(
                        reset.substring(0, reset.length() - 1)
                );

                return Math.min(
                        30,
                        Math.max(1, (long) Math.ceil(seconds))
                );
            }

        } catch (Exception ignored) {
            // Use the default delay if the headers cannot be parsed.
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
        return value == null || value.isBlank()
                ? "unknown"
                : value.trim();
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
            String description
    ) {
    }

    public record RecyclingResult(
            boolean recyclable,
            String bin,
            String instructions,
            String reason,
            double confidence
    ) {
    }
}