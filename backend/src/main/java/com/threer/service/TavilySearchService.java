
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
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class TavilySearchService {

    private static final String API_URL =
            "https://api.tavily.com/search";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${tavily.api-key}")
    private String apiKey;

    public TavilySearchService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    /**
     * Search for recycling information specifically relevant to Malaysia.
     *
     * Search priority:
     * 1. Malaysian government and official recycling sources.
     * 2. Malaysian recycling centres and collection programmes.
     * 3. General Malaysia-specific recycling guidance.
     *
     * Groq is not used by this service.
     */
    public List<SearchResult> searchRecyclingInformation(
            String itemName,
            String brand,
            String material) {

        String name = safe(itemName);
        String mat = safe(material);
        String brandName = safe(brand);

        System.out.println("========== MALAYSIA RECYCLING SEARCH ==========");
        System.out.println("Item: " + name);
        System.out.println("Material: " + mat);

        List<String> queries = buildMalaysiaQueries(
                name,
                mat,
                brandName
        );

        Map<String, SearchResult> collected =
                new LinkedHashMap<>();

        for (String query : queries) {

            System.out.println("Tavily query: " + query);

            List<SearchResult> results = search(query);

            for (SearchResult result : results) {

                if (!isMalaysiaRelevant(result)) {
                    System.out.println(
                            "Excluded non-Malaysia/unverified source: "
                                    + result.url()
                    );
                    continue;
                }

                String key = result.url().isBlank()
                        ? result.title() + result.content()
                        : result.url();

                collected.putIfAbsent(key, result);
            }

            // Stop once enough potentially relevant sources are collected.
            if (collected.size() >= 8) {
                break;
            }
        }

        List<SearchResult> finalResults =
                new ArrayList<>(collected.values());

        if (finalResults.size() > 8) {
            finalResults = new ArrayList<>(
                    finalResults.subList(0, 8)
            );
        }

        System.out.println(
                "Malaysia-related results retained: "
                        + finalResults.size()
        );
        System.out.println("========== SEARCH COMPLETE ==========");

        return finalResults;
    }

    /**
     * Create multiple targeted searches rather than relying on one query.
     */
    private List<String> buildMalaysiaQueries(
            String itemName,
            String material,
            String brand) {

        String item = cleanForQuery(itemName);
        String mat = cleanForQuery(material);

        List<String> queries = new ArrayList<>();

        // Search official Malaysian sources first.
        queries.add(
                "site:gov.my Malaysia " + item + " "
                        + mat + " recycling disposal guidelines"
        );

        queries.add(
                "Malaysia official recycling centre accepted items "
                        + item + " " + mat
        );

        // Look for actual acceptance rules from Malaysian facilities.
        queries.add(
                "Malaysia recycling centre accepts "
                        + item + " " + mat
                        + " collection requirements"
        );

        queries.add(
                "Malaysia " + mat
                        + " recycling rules accepted items "
                        + "recycling bin disposal"
        );

        // Item-specific cases need additional guidance.
        if (item.toLowerCase(Locale.ROOT).contains("receipt")) {
            queries.add(
                    "Malaysia thermal paper receipt recycling "
                            + "official disposal guidance"
            );
        }

        if (mat.toLowerCase(Locale.ROOT).contains("plastic")) {
            queries.add(
                    "Malaysia PET 1 HDPE 2 PP 5 plastic recycling "
                            + "centres accepted plastic items"
            );
        }

        // Brand is only an additional search, not the main evidence.
        if (!brand.isBlank()) {
            queries.add(
                    "\"" + brand + "\" " + item
                            + " Malaysia material recycling information"
            );
        }

        return queries;
    }

    /**
     * General search method for other app features.
     */
    public List<SearchResult> searchGeneral(String query) {
        return search(query);
    }

    private List<SearchResult> search(String query) {

        if (apiKey == null || apiKey.isBlank()) {
            System.err.println("Tavily API key is missing.");
            return List.of();
        }

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                Map<String, Object> body = Map.of(
                        "query", query,
                        "search_depth", "advanced",
                        "topic", "general",
                        "max_results", 8,
                        "include_answer", false
                );

                String json = objectMapper.writeValueAsString(body);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(API_URL))
                        .timeout(Duration.ofSeconds(30))
                        .header("Authorization", "Bearer " + apiKey)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(json))
                        .build();

                HttpResponse<String> response = httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );

                int status = response.statusCode();

                System.out.println("Tavily HTTP status: " + status);

                if (status == 429 || status >= 500) {
                    if (attempt < 2) {
                        Thread.sleep(1000);
                        continue;
                    }

                    System.err.println(
                            "Tavily temporarily unavailable."
                    );
                    return List.of();
                }

                if (status < 200 || status >= 300) {
                    System.err.println(
                            "Tavily request failed: HTTP "
                                    + status + " " + response.body()
                    );
                    return List.of();
                }

                JsonNode root = objectMapper.readTree(
                        response.body()
                );

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
                            results.add(new SearchResult(
                                    title,
                                    url,
                                    content
                            ));
                        }
                    }
                }

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

                return List.of();
            }
        }

        return List.of();
    }

    /**
     * Exclude results that cannot reasonably be connected to Malaysia.
     *
     * Malaysian domains are strong signals. For other domains, require
     * explicit Malaysia-related context in the title or content.
     *
     * This is a relevance filter, not a guarantee that the source is official.
     */
    private boolean isMalaysiaRelevant(SearchResult result) {

        String url = safe(result.url())
                .toLowerCase(Locale.ROOT);

        String text = (
                safe(result.title()) + " "
                        + safe(result.content())
        ).toLowerCase(Locale.ROOT);

        // Malaysian government, education and local authority domains.
        if (url.matches(".*://([a-z0-9-]+\\.)*gov\\.my(/.*)?")
                || url.matches(".*://([a-z0-9-]+\\.)*edu\\.my(/.*)?")) {
            return true;
        }

        // Malaysian country-code domains.
        if (url.matches(".*://([a-z0-9-]+\\.)*com\\.my(/.*)?")
                || url.matches(".*://([a-z0-9-]+\\.)*org\\.my(/.*)?")
                || url.matches(".*://([a-z0-9-]+\\.)*net\\.my(/.*)?")) {
            return true;
        }

        // Other websites must explicitly discuss Malaysia.
        return text.contains("malaysia")
                || text.contains("malaysian")
                || text.contains("majlis bandaraya")
                || text.contains("majlis perbandaran")
                || text.contains("majlis daerah")
                || text.contains("local council malaysia");
    }

    private String cleanForQuery(String value) {
        return safe(value)
                .replace("\"", " ")
                .replace("\n", " ")
                .replace("\r", " ")
                .trim();
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    public record SearchResult(
            String title,
            String url,
            String content
    ) {
    }
}
