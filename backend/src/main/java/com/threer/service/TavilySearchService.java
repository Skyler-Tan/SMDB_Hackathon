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
import java.util.List;
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
                .connectTimeout(Duration.ofSeconds(30))
                .build();
    }

    public List<SearchResult> searchRecyclingInformation(
            String itemName,
            String brand,
            String material) {

        try {

            System.out.println(
                    "========== TAVILY SEARCH =========="
            );

            String query =
        "\"" + itemName + "\" "
        + "\"" + brand + "\" "
        + "\"" + material + "\" "
        + "packaging recycling Malaysia";

            System.out.println(
                    "Search query: " + query
            );

            Map<String, Object> requestBody =
                    Map.of(
                            "query", query,
                            "search_depth", "basic",
                            "topic", "general",
                            "max_results", 5,
                            "include_answer", false
                    );

            String json =
                    objectMapper.writeValueAsString(
                            requestBody
                    );

            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(URI.create(API_URL))
                            .timeout(Duration.ofSeconds(60))
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
                    "Sending request to Tavily..."
            );

            HttpResponse<String> response =
                    httpClient.send(
                            request,
                            HttpResponse.BodyHandlers.ofString()
                    );

            System.out.println(
                    "Tavily HTTP status: "
                            + response.statusCode()
            );

            if (response.statusCode() < 200 ||
                    response.statusCode() >= 300) {

                throw new IllegalStateException(
                        "Tavily request failed with HTTP "
                                + response.statusCode()
                                + ": "
                                + response.body()
                );
            }

            JsonNode root =
                    objectMapper.readTree(
                            response.body()
                    );

            JsonNode results =
                    root.path("results");

            List<SearchResult> searchResults =
                    new ArrayList<>();

            if (results.isArray()) {

                for (JsonNode result : results) {

                    String title =
                            result
                                    .path("title")
                                    .asText("");

                    String url =
                            result
                                    .path("url")
                                    .asText("");

                    String content =
                            result
                                    .path("content")
                                    .asText("");

                    searchResults.add(
                            new SearchResult(
                                    title,
                                    url,
                                    content
                            )
                    );
                }
            }

            System.out.println(
                    "Tavily results found: "
                            + searchResults.size()
            );

            for (SearchResult result : searchResults) {

                System.out.println(
                        "\n--- SEARCH RESULT ---"
                );

                System.out.println(
                        "Title: "
                                + result.title()
                );

                System.out.println(
                        "URL: "
                                + result.url()
                );

                System.out.println(
                        "Content: "
                                + result.content()
                );
            }

            System.out.println(
                    "========== TAVILY SEARCH COMPLETE =========="
            );

            return searchResults;

        } catch (Exception e) {

            System.out.println(
                    "Tavily search failed:"
            );

            e.printStackTrace();

            /*
             * Do not break the AI scan if the search
             * service temporarily fails.
             */
            return List.of();
        }
    }

    public List<SearchResult> searchGeneral(
        String query) {

    try {

        System.out.println(
                "========== TAVILY GENERAL SEARCH =========="
        );

        System.out.println(
                "Search query: " + query
        );

        Map<String, Object> requestBody =
                Map.of(
                        "query", query,
                        "search_depth", "basic",
                        "topic", "general",
                        "max_results", 5,
                        "include_answer", false
                );

        String json =
                objectMapper.writeValueAsString(
                        requestBody
                );

        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(URI.create(API_URL))
                        .timeout(Duration.ofSeconds(60))
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

        HttpResponse<String> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );

        System.out.println(
                "Tavily HTTP status: "
                        + response.statusCode()
        );

        if (response.statusCode() < 200 ||
                response.statusCode() >= 300) {

            throw new IllegalStateException(
                    "Tavily request failed with HTTP "
                            + response.statusCode()
            );
        }

        JsonNode root =
                objectMapper.readTree(
                        response.body()
                );

        JsonNode results =
                root.path("results");

        List<SearchResult> searchResults =
                new ArrayList<>();

        if (results.isArray()) {

            for (JsonNode result : results) {

                searchResults.add(
                        new SearchResult(
                                result.path("title")
                                        .asText(""),
                                result.path("url")
                                        .asText(""),
                                result.path("content")
                                        .asText("")
                        )
                );
            }
        }

        System.out.println(
                "General results found: "
                        + searchResults.size()
        );

        return searchResults;

    } catch (Exception e) {

        System.out.println(
                "Tavily general search failed:"
        );

        e.printStackTrace();

        return List.of();
    }
}

    public record SearchResult(
            String title,
            String url,
            String content
    ) {
    }
}