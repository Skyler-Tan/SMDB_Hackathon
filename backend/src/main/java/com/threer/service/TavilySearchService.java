
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
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    /**
     * Search Malaysia first, then international guidance if needed.
     */
    public List<SearchResult> searchRecyclingInformation(
            String itemName,
            String brand,
            String material) {

        String item = clean(itemName);
        String brandName = clean(brand);
        String mat = clean(material);

        if (item.isBlank() && mat.isBlank()) {
            return List.of();
        }

        String subject = join(item, mat);

        List<String> queries = new ArrayList<>();

        queries.add(
                subject + " recycling acceptance Malaysia"
        );

        queries.add(
                subject + " material recyclability recycling guidelines"
        );

        if (!brandName.isBlank()) {
            queries.add(
                    "\"" + brandName + "\" " + item
                            + " packaging material recycling"
            );
        }

        Map<String, SearchResult> collected =
                new LinkedHashMap<>();

        for (String query : queries) {
            List<SearchResult> results = search(query);

            for (SearchResult result : results) {
                if (result == null) {
                    continue;
                }

                String key = result.url().isBlank()
                        ? result.title() + result.content()
                        : result.url().toLowerCase(Locale.ROOT);

                collected.putIfAbsent(key, result);
            }

            // Stop early if enough evidence has been collected.
            if (collected.size() >= 5) {
                break;
            }
        }

        return collected.values()
                .stream()
                .limit(5)
                .toList();
    }

    /**
     * General search method for other features.
     */
    public List<SearchResult> searchGeneral(String query) {
        return search(query);
    }

    private List<SearchResult> search(String query) {

        if (apiKey == null || apiKey.isBlank()) {
            System.err.println("Tavily API key is missing.");
            return List.of();
        }

        try {
            Map<String, Object> body = Map.of(
                    "query", query,
                    "search_depth", "basic",
                    "topic", "general",
                    "max_results", 5,
                    "include_answer", false
            );

            String json = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .timeout(Duration.ofSeconds(8))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() < 200
                    || response.statusCode() >= 300) {

                System.err.println(
                        "Tavily returned HTTP "
                                + response.statusCode()
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
                        results.add(new SearchResult(
                                title,
                                url,
                                content
                        ));
                    }
                }
            }

            System.out.println(
                    "Tavily returned " + results.size()
                            + " results for: " + query
            );

            return results;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.err.println("Tavily search interrupted.");
            return List.of();

        } catch (Exception e) {
            System.err.println(
                    "Tavily search failed: " + e.getMessage()
            );
            return List.of();
        }
    }

    private String join(String first, String second) {
        if (first.isBlank()) return second;
        if (second.isBlank()) return first;
        return first + " " + second;
    }

    private String clean(String value) {
        return value == null
                ? ""
                : value.replaceAll("[\\r\\n\\t]+", " ")
                        .replaceAll("\\s+", " ")
                        .trim();
    }

    public record SearchResult(
            String title,
            String url,
            String content
    ) {
    }
}
