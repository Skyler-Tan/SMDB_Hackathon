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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class TavilySearchService {

    private static final String API_URL =
            "https://api.tavily.com/search";

    // Minimum number of relevant results needed before
    // a region is considered useful.
    private static final int MIN_RELEVANT_RESULTS = 2;

    private static final int MAX_FINAL_RESULTS = 10;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${tavily.api-key:}")
    private String apiKey;

    public TavilySearchService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    /**
     * Search order:
     * 1. Malaysia
     * 2. ASEAN
     * 3. International
     *
     * Search results are filtered for relevance before deciding
     * whether to continue to the next region.
     */
    public List<SearchResult> searchRecyclingInformation(
            String itemName,
            String brand,
            String material) {

        String item = clean(itemName);
        String brandName = normalizeUnknown(clean(brand));
        String mat = normalizeUnknown(clean(material));

        System.out.println(
                "\n========== RECYCLING RESEARCH =========="
        );
        System.out.println("Item: " + item);
        System.out.println("Brand: " + displayUnknown(brandName));
        System.out.println("Material: " + displayUnknown(mat));

        if (isUnknown(item)) {
            System.err.println(
                    "Cannot search: item name is missing or unknown."
            );
            return List.of();
        }

        if (apiKey == null || apiKey.isBlank()) {
            System.err.println("Tavily API key is missing.");
            return List.of();
        }

        Map<String, SearchResult> relevantResults =
                new LinkedHashMap<>();

        // =====================================================
        // STAGE 1: MALAYSIA
        // =====================================================

        System.out.println("\n--- STAGE 1: MALAYSIA ---");

        List<String> malaysiaQueries =
                buildMalaysiaQueries(item, brandName, mat);

        searchStage(
                "MALAYSIA",
                item,
                malaysiaQueries,
                relevantResults
        );

        int malaysiaCount = relevantResults.size();

        System.out.println(
                "Relevant Malaysian results: " + malaysiaCount
        );

        if (malaysiaCount >= MIN_RELEVANT_RESULTS) {
            System.out.println(
                    "Relevant Malaysian evidence found. "
                            + "Skipping other regions."
            );

            return finishResults(relevantResults);
        }

        // =====================================================
        // STAGE 2: ASEAN
        // =====================================================

        System.out.println(
                "\nInsufficient relevant Malaysian results. "
                        + "Trying ASEAN sources."
        );

        List<String> aseanQueries = new ArrayList<>();

        aseanQueries.add(
                "\"" + item + "\" recycling disposal ASEAN"
        );

        aseanQueries.add(
                item + " e-waste recycling Singapore "
                        + "Thailand Indonesia Philippines"
        );

        if (!isUnknown(mat)) {
            aseanQueries.add(
                    item + " " + mat
                            + " recycling Southeast Asia"
            );
        }

        searchStage(
                "ASEAN",
                item,
                aseanQueries,
                relevantResults
        );

        if (relevantResults.size() >= MIN_RELEVANT_RESULTS) {
            System.out.println(
                    "Sufficient relevant results collected. "
                            + "Skipping international search."
            );

            return finishResults(relevantResults);
        }

        // =====================================================
        // STAGE 3: INTERNATIONAL
        // =====================================================

        System.out.println(
                "\nInsufficient relevant results. "
                        + "Trying international sources."
        );

        List<String> internationalQueries =
                new ArrayList<>();

        internationalQueries.add(
                "\"" + item + "\" recycling disposal guidelines"
        );

        internationalQueries.add(
                item + " recycling official environmental agency"
        );

        if (!isUnknown(mat)) {
            internationalQueries.add(
                    item + " " + mat
                            + " recyclability disposal"
            );
        }

        searchStage(
                "INTERNATIONAL",
                item,
                internationalQueries,
                relevantResults
        );

        System.out.println(
                "International search completed."
        );

        if (relevantResults.isEmpty()) {
            System.err.println(
                    "No relevant recycling evidence found. "
                            + "The item must remain UNVERIFIED."
            );
        }

        return finishResults(relevantResults);
    }

    /**
     * Builds targeted Malaysian searches.
     */
    private List<String> buildMalaysiaQueries(
            String item,
            String brand,
            String material) {

        List<String> queries = new ArrayList<>();

        String lowerItem = item.toLowerCase(Locale.ROOT);

        boolean electronic =
                containsAny(
                        lowerItem,
                        "speaker",
                        "phone",
                        "mobile",
                        "laptop",
                        "computer",
                        "camera",
                        "headphone",
                        "earphone",
                        "keyboard",
                        "mouse",
                        "charger",
                        "cable",
                        "battery",
                        "electronic",
                        "electrical",
                        "monitor",
                        "television",
                        "tablet",
                        "power bank",
                        "printer",
                        "router"
                );

        if (electronic) {
            queries.add(
                    "\"" + item + "\" e-waste recycling Malaysia"
            );

            queries.add(
                    "Malaysia official electronic waste "
                            + "collection disposal guidelines"
            );

            queries.add(
                    item + " battery disposal recycling Malaysia"
            );
        } else {
            queries.add(
                    "\"" + item + "\" recycling Malaysia"
            );

            queries.add(
                    item + " recycling disposal Malaysia "
                            + "government guidelines"
            );
        }

        if (!isUnknown(brand)) {
            queries.add(
                    "\"" + brand + "\" \"" + item
                            + "\" recycling Malaysia"
            );
        }

        if (!isUnknown(material)) {
            queries.add(
                    item + " " + material
                            + " recycling Malaysia"
            );
        }

        // Remove duplicate queries while preserving their order.
        return new ArrayList<>(new LinkedHashSet<>(queries));
    }

    /**
     * Searches a region and retains only results that appear relevant
     * to the item and recycling/disposal subject.
     */
    private void searchStage(
            String region,
            String item,
            List<String> queries,
            Map<String, SearchResult> collected) {

        System.out.println("Searching region: " + region);

        for (String query : queries) {
            List<SearchResult> results = search(query);

            int relevantThisQuery = 0;

            for (SearchResult result : results) {
                if (!isRelevant(item, result)) {
                    System.out.println(
                            "Rejected irrelevant result: "
                                    + result.title()
                    );
                    continue;
                }

                String key = !result.url().isBlank()
                        ? result.url().toLowerCase(Locale.ROOT)
                        : result.title().toLowerCase(Locale.ROOT);

                if (!collected.containsKey(key)) {
                    collected.put(key, result);
                    relevantThisQuery++;
                }
            }

            System.out.println(
                    region + " relevant new results from query: "
                            + relevantThisQuery
            );

            System.out.println(
                    region + " relevant unique results so far: "
                            + collected.size()
            );
        }

        System.out.println(region + " stage complete.");
    }

    /**
     * Basic relevance filter.
     *
     * A result must mention the item or a meaningful component of its
     * name, and contain recycling, disposal, collection, or e-waste
     * context. Generic recycling pages are not automatically accepted.
     */
    private boolean isRelevant(
            String item,
            SearchResult result) {

        String title = safeText(result.title());
        String content = safeText(result.content());
        String url = safeText(result.url());

        String combined = (
                title + " " + content + " " + url
        ).toLowerCase(Locale.ROOT);

        String normalizedItem =
                item.toLowerCase(Locale.ROOT).trim();

        boolean mentionsItem =
                combined.contains(normalizedItem);

        // Allow multiword items to match by their important terms.
        if (!mentionsItem) {
            String[] words = normalizedItem.split("\\s+");

            int matchedWords = 0;
            int meaningfulWords = 0;

            for (String word : words) {
                if (word.length() < 3) {
                    continue;
                }

                meaningfulWords++;

                if (combined.contains(word)) {
                    matchedWords++;
                }
            }

            mentionsItem = meaningfulWords > 0
                    && matchedWords >= Math.min(2, meaningfulWords);
        }

        boolean mentionsRecycling =
                containsAny(
                        combined,
                        "recycl",
                        "e-waste",
                        "electronic waste",
                        "disposal",
                        "dispose",
                        "collection point",
                        "waste management",
                        "recovery",
                        "take-back",
                        "take back"
                );

        boolean genericOnly =
                combined.contains("recycling") && !mentionsItem;

        return mentionsItem && mentionsRecycling && !genericOnly;
    }

    /**
     * General search method for other features.
     */
    public List<SearchResult> searchGeneral(String query) {
        return search(query);
    }

    private List<SearchResult> search(String query) {

        try {
            System.out.println("Tavily query: " + query);

            Map<String, Object> body = Map.of(
                    "query", query,
                    "search_depth", "basic",
                    "topic", "general",
                    "max_results", 5,
                    "include_answer", false
            );

            String json =
                    objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .timeout(Duration.ofSeconds(20))
                    .header(
                            "Authorization",
                            "Bearer " + apiKey
                    )
                    .header(
                            "Content-Type",
                            "application/json"
                    )
                    .POST(
                            HttpRequest.BodyPublishers.ofString(json)
                    )
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            int status = response.statusCode();

            System.out.println(
                    "Tavily HTTP status: " + status
            );

            if (status < 200 || status >= 300) {
                System.err.println(
                        "Tavily error response: " + response.body()
                );
                return List.of();
            }

            JsonNode root =
                    objectMapper.readTree(response.body());

            JsonNode nodes = root.path("results");

            List<SearchResult> results = new ArrayList<>();

            if (nodes.isArray()) {
                for (JsonNode node : nodes) {
                    String title =
                            node.path("title").asText("");

                    String url =
                            node.path("url").asText("");

                    String content =
                            node.path("content").asText("");

                    if (!title.isBlank() || !content.isBlank()) {
                        results.add(
                                new SearchResult(title, url, content)
                        );
                    }
                }
            }

            System.out.println(
                    "Raw results returned: " + results.size()
            );

            return results;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();

            System.err.println(
                    "Tavily request interrupted."
            );

            return List.of();

        } catch (Exception e) {
            System.err.println(
                    "Tavily search failed: " + e.getMessage()
            );

            e.printStackTrace();
            return List.of();
        }
    }

    private boolean containsAny(
            String text,
            String... keywords) {

        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }

        return false;
    }

    private boolean isUnknown(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }

        String normalized = value.trim().toLowerCase(Locale.ROOT);

        return normalized.equals("unknown")
                || normalized.equals("n/a")
                || normalized.equals("none")
                || normalized.equals("null")
                || normalized.equals("not known");
    }

    private String normalizeUnknown(String value) {
        return isUnknown(value) ? "" : value;
    }

    private String displayUnknown(String value) {
        return isUnknown(value) ? "unknown" : value;
    }

    private String clean(String value) {
        return value == null
                ? ""
                : value.replaceAll("[\\r\\n\\t]+", " ")
                       .replaceAll("\\s+", " ")
                       .trim();
    }

    private String safeText(String value) {
        return value == null
                ? ""
                : value.toLowerCase(Locale.ROOT);
    }

    private List<SearchResult> finishResults(
            Map<String, SearchResult> collected) {

        List<SearchResult> results = collected.values()
                .stream()
                .limit(MAX_FINAL_RESULTS)
                .toList();

        System.out.println(
                "\nTotal relevant unique results: " + results.size()
        );

        System.out.println(
                "========== RESEARCH COMPLETE ==========\n"
        );

        return results;
    }

    public record SearchResult(
            String title,
            String url,
            String content
    ) {
    }
}