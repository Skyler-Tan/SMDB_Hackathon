package com.threer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.threer.dto.NearbyPlace;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class MapService {

    private static final String NEARBY_URL =
            "https://us1.locationiq.com/v1/nearby";

    /**
     * Search radius in metres.
     * 25 km is a good default — recycling centres can be sparse.
     */
    private static final int RADIUS_METRES = 25000;

    /** Maximum results returned to the frontend. */
    private static final int MAX_RESULTS = 50;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${locationiq.api-key}")
    private String apiKey;

    public MapService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Returns up to {@value MAX_RESULTS} recycling centres near (lat, lng).
     *
     * @param lat      user latitude
     * @param lng      user longitude
     * @param material e.g. "plastic" — currently unused for tag selection
     *                 since OSM uses amenity:recycling for all drop-off points
     */
    public List<NearbyPlace> findNearby(double lat, double lng, String material) {

        // The correct OSM / LocationIQ tag for recycling drop-off points
        // is the key-value pair "amenity:recycling".
        // A plain single word like "recycling" is not a valid tag and
        // returns 404 "Unable to geocode".
        String tag = "amenity:recycling";

        String url = NEARBY_URL
                + "?key=" + apiKey
                + "&lat=" + lat
                + "&lon=" + lng
                + "&tag=" + URLEncoder.encode(tag, StandardCharsets.UTF_8)
                + "&radius=" + RADIUS_METRES
                + "&limit=" + MAX_RESULTS
                + "&dedupe=1"
                + "&format=json";

        System.out.println("========== LOCATIONIQ NEARBY ==========");
        System.out.println("Location : " + lat + ", " + lng);
        System.out.println("Tag      : " + tag);
        System.out.println("Radius   : " + RADIUS_METRES + " m");

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(15))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString());

            System.out.println("HTTP status : " + response.statusCode());
            System.out.println("Body        : " + response.body());

            // LocationIQ returns 404 when there are zero results — not an error
            if (response.statusCode() == 404) {
                System.out.println("Zero results within " + RADIUS_METRES + " m.");
                System.out.println("========== LOCATIONIQ COMPLETE ==========");
                return List.of();
            }

            if (response.statusCode() == 401 || response.statusCode() == 403) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "LocationIQ API key is invalid or unauthorised. "
                        + "Get a free key at https://locationiq.com");
            }

            if (response.statusCode() != 200) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "LocationIQ returned HTTP " + response.statusCode()
                        + ": " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());

            // Error object instead of array
            if (root.isObject() && root.has("error")) {
                String errorText = root.path("error").asText();
                System.err.println("LocationIQ error field: " + errorText);
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "LocationIQ error: " + errorText);
            }

            if (!root.isArray()) {
                System.err.println("Unexpected response shape.");
                return List.of();
            }

            List<NearbyPlace> places = new ArrayList<>();
            for (int i = 0; i < root.size() && i < MAX_RESULTS; i++) {
                places.add(parsePlace(root.get(i), lat, lng));
            }

            System.out.println("Places found : " + places.size());
            System.out.println("========== LOCATIONIQ COMPLETE ==========");

            return places;

        } catch (ResponseStatusException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Places request was interrupted.");
        } catch (Exception e) {
            System.err.println("LocationIQ exception: " + e.getMessage());
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Could not reach LocationIQ: " + e.getMessage());
        }
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private NearbyPlace parsePlace(JsonNode r, double userLat, double userLng) {
        NearbyPlace p = new NearbyPlace();

        // Name — fall back to first segment of display_name
        String name = r.path("name").asText("").trim();
        if (name.isEmpty()) {
            String display = r.path("display_name").asText("");
            name = display.contains(",")
                    ? display.substring(0, display.indexOf(",")).trim()
                    : display;
        }
        if (name.isEmpty()) name = "Recycling Centre";
        p.setName(name);

        // Address — display_name minus the leading name
        String displayName = r.path("display_name").asText("");
        String address = displayName;
        if (!name.isEmpty() && displayName.startsWith(name)) {
            address = displayName
                    .substring(name.length())
                    .replaceFirst("^,\\s*", "");
        }
        p.setAddress(address);

        // Coordinates
        double placeLat = parseDouble(r.path("lat").asText("0"));
        double placeLng = parseDouble(r.path("lon").asText("0"));
        p.setLat(placeLat);
        p.setLng(placeLng);
        p.setOsmType(r.path("osm_type").asText(""));
        p.setOsmId(r.path("osm_id").asText(""));

        // Keep distance as a numeric field; open/closed status is not provided
        // by the Nearby API and should not be fabricated.
        double distanceM = r.path("distance").asDouble(0);
        p.setDistanceMeters(distanceM);
        p.setOpenNow("Unknown");

        // LocationIQ does not provide ratings
        p.setRating(0);

        // OpenStreetMap directions deep-link
        p.setMapsUrl("https://www.google.com/maps/dir/?api=1"
        + "&origin=" + userLat + "," + userLng
        + "&destination=" + placeLat + "," + placeLng);
        return p;
        }

    private double parseDouble(String value) {
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }
}
