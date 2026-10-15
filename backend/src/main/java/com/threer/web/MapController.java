package com.threer.web;

import com.threer.dto.NearbyPlace;
import com.threer.service.MapService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Exposes LocationIQ nearby-search to the frontend.
 *
 * GET /api/places/recycling?lat=3.1390&lng=101.6869&material=plastic
 */
@RestController
@RequestMapping("/api/places")
public class MapController {

    private final MapService mapService;

    public MapController(MapService mapService) {
        this.mapService = mapService;
    }

    @GetMapping("/recycling")
    public List<NearbyPlace> nearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(required = false, defaultValue = "") String material) {

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid coordinates.");
        }

        return mapService.findNearby(lat, lng, material);
    }
}
