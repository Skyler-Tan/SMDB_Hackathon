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
public class HuggingFaceVisionService {

    private static final String API_URL =
            "https://router.huggingface.co/v1/chat/completions";

    private static final String MODEL =
            "google/gemma-3-4b-it";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${huggingface.api-key}")
    private String apiKey;

    public HuggingFaceVisionService(ObjectMapper objectMapper) {

        this.objectMapper = objectMapper;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
    }

    /*
     * ============================================================
     * IMAGE IDENTIFICATION
     * ============================================================
     */

    public VisionResult analyzeImage(String imageDataUri) {

        try {

            System.out.println(
                    "========== HUGGING FACE VISION =========="
            );

            System.out.println(
                    "Image length: " + imageDataUri.length()
            );

            System.out.println(
                    "Model: " + MODEL
            );

            String base64Image = imageDataUri;

            if (imageDataUri.contains(",")) {

                base64Image =
                        imageDataUri.substring(
                                imageDataUri.indexOf(",") + 1
                        );
            }

            String prompt = """
                    Identify the specific real-world object or product
                    shown in this image.

                    IMPORTANT:
                    - Do NOT classify it into a predefined catalog.
                    - Identify the actual specific product if possible.
                    - Read visible brand names, product names, labels,
                      logos and size information.
                    - Do not invent information that cannot reasonably
                      be seen.
                    - If something cannot be determined, return "unknown".
                    - Determine the most likely main material of the item.
                    - If the exact size is visible, return the exact size.

                    Return ONLY valid JSON.

                    Use exactly this structure:

                    {
                      "name": "specific product or object name",
                      "brand": "brand name or unknown",
                      "size": "size or unknown",
                      "container": "container type or unknown",
                      "material": "main material or unknown",
                      "confidence": 0.0,
                      "description": "short description"
                    }

                    Confidence must be a number between 0 and 1.
                    """;

            Map<String, Object> requestBody =
                    Map.of(
                            "model",
                            MODEL,

                            "messages",
                            new Object[]{

                                    Map.of(
                                            "role",
                                            "user",

                                            "content",
                                            new Object[]{

                                                    Map.of(
                                                            "type",
                                                            "text",
                                                            "text",
                                                            prompt
                                                    ),

                                                    Map.of(
                                                            "type",
                                                            "image_url",
                                                            "image_url",
                                                            Map.of(
                                                                    "url",
                                                                    "data:image/jpeg;base64,"
                                                                            + base64Image
                                                            )
                                                    )
                                            }
                                    )
                            },

                            "temperature",
                            0.1,

                            "max_tokens",
                            500
                    );

            String json =
                    objectMapper.writeValueAsString(
                            requestBody
                    );

            JsonNode result =
                    sendRequest(json);

            JsonNode choices =
                    result.path("choices");

            if (!choices.isArray() ||
                    choices.isEmpty()) {

                throw new IllegalStateException(
                        "Hugging Face returned no choices"
                );
            }

            String content =
                    choices
                            .get(0)
                            .path("message")
                            .path("content")
                            .asText();

            if (content == null ||
                    content.isBlank()) {

                throw new IllegalStateException(
                        "Hugging Face returned empty content"
                );
            }

            System.out.println(
                    "Raw AI identification:"
            );

            System.out.println(content);

            content =
                    cleanJson(content);

            JsonNode identification =
                    objectMapper.readTree(
                            content
                    );

            String name =
                    identification
                            .path("name")
                            .asText("unknown");

            String brand =
                    identification
                            .path("brand")
                            .asText("unknown");

            String size =
                    identification
                            .path("size")
                            .asText("unknown");

            String container =
                    identification
                            .path("container")
                            .asText("unknown");

            String material =
                    identification
                            .path("material")
                            .asText("unknown");

            double confidence =
                    identification
                            .path("confidence")
                            .asDouble(0.0);

            String description =
                    identification
                            .path("description")
                            .asText("");

            confidence =
                    Math.max(
                            0.0,
                            Math.min(
                                    1.0,
                                    confidence
                            )
                    );

            return new VisionResult(
                    name,
                    brand,
                    size,
                    container,
                    material,
                    confidence,
                    description
            );

        } catch (Exception e) {

            System.out.println(
                    "Hugging Face vision request failed:"
            );

            e.printStackTrace();

            throw new IllegalStateException(
                    "AI vision request failed: "
                            + e.getMessage(),
                    e
            );
        }
    }

    /*
     * ============================================================
     * RECYCLING VERIFICATION
     * ============================================================
     */

    public RecyclingResult verifyRecycling(
            VisionResult item,
            List<TavilySearchService.SearchResult> searchResults) {

        try {

            System.out.println(
                    "========== AI RECYCLING VERIFICATION =========="
            );

            StringBuilder sources =
                    new StringBuilder();

            for (int i = 0;
                 i < searchResults.size();
                 i++) {

                TavilySearchService.SearchResult result =
                        searchResults.get(i);

                sources.append(
                        "\nSOURCE "
                                + (i + 1)
                                + "\n"
                );

                sources.append(
                        "TITLE: "
                                + result.title()
                                + "\n"
                );

                sources.append(
                        "URL: "
                                + result.url()
                                + "\n"
                );

                sources.append(
                        "CONTENT: "
                                + result.content()
                                + "\n"
                );
            }

            String prompt = """
                    You are a recycling information verification assistant
                    for a recycling application used in Malaysia.

                    The product was identified from an actual image.

                    Product:
                    %s

                    Brand:
                    %s

                    Size:
                    %s

                    Container:
                    %s

                    MATERIAL IDENTIFIED FROM IMAGE:
                    %s

                    WEB SEARCH RESULTS:
                    %s

                    IMPORTANT VERIFICATION RULES:

                    1. The material identified from the image is the primary
                       material evidence.

                    2. NEVER change the image-identified material just because
                       a web search result describes a different version of
                       the product.

                    3. Product packaging can vary by country, market, product
                       size and production period.

                    4. If web sources describe different packaging materials,
                       treat this as conflicting evidence.

                    5. If the material from the image and the web sources
                       conflict, DO NOT guess.

                    6. The recycling bin MUST match the material.

                    7. NEVER return:
                       - plastic + glass bin
                       - glass + plastic bin
                       - paper + glass bin
                       - glass + paper bin

                    8. If material = plastic, the bin must be a plastic-related
                       recycling category or "unknown".

                    9. If material = glass, the bin must be a glass-related
                       recycling category or "unknown".

                    10. If material = paper, the bin must be a paper-related
                        recycling category or "unknown".

                    11. Prefer official manufacturer information over random
                        websites.

                    12. Prefer Malaysia-specific recycling information when
                        available.

                    13. Recycling eligibility and recycling-bin type are
                        different things.

                    14. Consider contamination when deciding whether an item
                        is recyclable.

                    15. Paper or cardboard food packaging must NOT automatically
                        be marked recyclable.

                    16. If paper or cardboard packaging appears to have food,
                        grease, oil, sauce, liquid or heavy contamination, mark
                        it as:

                        recyclable = false
                        bin = unknown

                        Explain that the packaging is contaminated.

                    17. If paper or cardboard food packaging is clean and dry,
                        it may be recyclable if reliable recycling information
                        supports this.

                    18. If the image does not show whether the packaging is
                        contaminated, do not invent contamination.

                    19. Plastic food containers should also be considered for
                        contamination. If significant food or drink residue is
                        known or visible, do not automatically mark it
                        recyclable.

                    20. A product being recyclable in another country does NOT
                        automatically mean it is accepted by a Malaysian
                        recycling collection system.

                    21. If reliable Malaysian collection information cannot be
                        established, return the bin as "unknown" instead of
                        guessing.

                    22. Do not invent recycling instructions.

                    23. If the evidence is contradictory or insufficient,
                        return:

                        recyclable = false
                        bin = unknown

                        and explain the uncertainty in "reason".

                    24. The final answer must be internally consistent.

                    25. Return ONLY valid JSON.

                    Return exactly this structure:

                    {
                      "recyclable": true,
                      "bin": "glass",
                      "instructions": "short recycling instructions",
                      "reason": "short explanation",
                      "confidence": 0.0
                    }

                    Confidence must be between 0 and 1.

                    PRODUCT INFORMATION:
                    Product = %s
                    Brand = %s
                    Size = %s
                    Container = %s
                    Image material = %s

                    WEB EVIDENCE:
                    %s
                    """.formatted(
                    item.item(),
                    item.brand(),
                    item.size(),
                    item.container(),
                    item.material(),
                    sources,
                    item.item(),
                    item.brand(),
                    item.size(),
                    item.container(),
                    item.material(),
                    sources
            );

            Map<String, Object> requestBody =
                    Map.of(
                            "model",
                            MODEL,

                            "messages",
                            new Object[]{

                                    Map.of(
                                            "role",
                                            "user",
                                            "content",
                                            prompt
                                    )
                            },

                            "temperature",
                            0.1,

                            "max_tokens",
                            500
                    );

            String json =
                    objectMapper.writeValueAsString(
                            requestBody
                    );

            JsonNode root =
                    sendRequest(json);

            JsonNode choices =
                    root.path("choices");

            if (!choices.isArray() ||
                    choices.isEmpty()) {

                throw new IllegalStateException(
                        "Hugging Face returned no choices"
                );
            }

            String content =
                    choices
                            .get(0)
                            .path("message")
                            .path("content")
                            .asText();

            System.out.println(
                    "Raw recycling verification:"
            );

            System.out.println(content);

            content =
                    cleanJson(content);

            JsonNode result =
                    objectMapper.readTree(
                            content
                    );

            boolean recyclable =
                    result
                            .path("recyclable")
                            .asBoolean(false);

            String bin =
                    result
                            .path("bin")
                            .asText("unknown");

            String instructions =
                    result
                            .path("instructions")
                            .asText("");

            String reason =
                    result
                            .path("reason")
                            .asText("");

            double confidence =
                    result
                            .path("confidence")
                            .asDouble(0.0);

            /*
             * ====================================================
             * SAFETY CHECK 1
             * MATERIAL / BIN CONFLICT
             * ====================================================
             */

            String normalizedMaterial =
                    item.material()
                            .toLowerCase();

            String normalizedBin =
                    bin.toLowerCase();

            boolean materialBinConflict =
                    (normalizedMaterial.contains("plastic")
                            && normalizedBin.contains("glass"))
                    ||
                    (normalizedMaterial.contains("glass")
                            && normalizedBin.contains("plastic"))
                    ||
                    (normalizedMaterial.contains("paper")
                            && normalizedBin.contains("glass"))
                    ||
                    (normalizedMaterial.contains("glass")
                            && normalizedBin.contains("paper"));

            if (materialBinConflict) {

                System.out.println(
                        "WARNING: AI returned conflicting material/bin."
                );

                System.out.println(
                        "Image material: "
                                + item.material()
                );

                System.out.println(
                        "AI bin: "
                                + bin
                );

                recyclable = false;

                bin = "unknown";

                instructions =
                        "Recycling information could not be verified.";

                reason =
                        "The identified material conflicts with the recycling bin returned by the web verification.";

                confidence = 0.0;
            }

            /*
             * ====================================================
             * SAFETY CHECK 2
             * FOOD CONTAMINATION
             * ====================================================
             */

            String combinedText =
                    (
                            item.item()
                                    + " "
                                    + item.container()
                                    + " "
                                    + item.description()
                                    + " "
                                    + instructions
                                    + " "
                                    + reason
                    ).toLowerCase();

            boolean foodContamination =
                    combinedText.contains("food residue")
                    || combinedText.contains("food contamination")
                    || combinedText.contains("grease")
                    || combinedText.contains("greasy")
                    || combinedText.contains("oil")
                    || combinedText.contains("oily")
                    || combinedText.contains("sauce")
                    || combinedText.contains("food stain")
                    || combinedText.contains("food-soiled")
                    || combinedText.contains("food soiled")
                    || combinedText.contains("heavily contaminated");

            boolean paperFoodPackaging =
                    normalizedMaterial.contains("paper")
                    || normalizedMaterial.contains("cardboard");

            if (foodContamination && paperFoodPackaging) {

                System.out.println(
                        "WARNING: Food-contaminated paper packaging detected."
                );

                recyclable = false;

                bin = "unknown";

                instructions =
                        "Do not place food-contaminated paper in the recycling bin.";

                reason =
                        "The paper packaging is contaminated with food, grease, oil or sauce.";

                confidence = 0.0;
            }

            /*
             * ====================================================
             * FINAL CONFIDENCE
             * ====================================================
             */

            confidence =
                    Math.max(
                            0.0,
                            Math.min(
                                    1.0,
                                    confidence
                            )
                    );

            System.out.println(
                    "Recyclable: "
                            + recyclable
            );

            System.out.println(
                    "Bin: "
                            + bin
            );

            System.out.println(
                    "Instructions: "
                            + instructions
            );

            System.out.println(
                    "Reason: "
                            + reason
            );

            System.out.println(
                    "Confidence: "
                            + confidence
            );

            return new RecyclingResult(
                    recyclable,
                    bin,
                    instructions,
                    reason,
                    confidence
            );

        } catch (Exception e) {

            System.out.println(
                    "Recycling verification failed:"
            );

            e.printStackTrace();

            return new RecyclingResult(
                    false,
                    "unknown",
                    "",
                    "Recycling information could not be verified.",
                    0.0
            );
        }
    }

    /*
     * ============================================================
     * COMMON HTTP REQUEST
     * ============================================================
     */

    private JsonNode sendRequest(String json)
            throws Exception {

        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(URI.create(API_URL))
                        .timeout(Duration.ofSeconds(120))
                        .header(
                                "Authorization",
                                "Bearer " + apiKey
                        )
                        .header(
                                "Content-Type",
                                "application/json"
                        )
                        .POST(
                                HttpRequest.BodyPublishers.ofString(
                                        json
                                )
                        )
                        .build();

        System.out.println(
                "Sending request to Hugging Face..."
        );

        HttpResponse<String> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );

        System.out.println(
                "Hugging Face HTTP status: "
                        + response.statusCode()
        );

        if (response.statusCode() < 200 ||
                response.statusCode() >= 300) {

            throw new IllegalStateException(
                    "Hugging Face request failed with HTTP "
                            + response.statusCode()
                            + ": "
                            + response.body()
            );
        }

        return objectMapper.readTree(
                response.body()
        );
    }

    private String cleanJson(String content) {

        content =
                content.trim();

        if (content.startsWith("```json")) {

            content =
                    content.substring(7);

        } else if (content.startsWith("```")) {

            content =
                    content.substring(3);
        }

        if (content.endsWith("```")) {

            content =
                    content.substring(
                            0,
                            content.length() - 3
                    );
        }

        return content.trim();
    }

    /*
     * ============================================================
     * RESULT RECORDS
     * ============================================================
     */

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