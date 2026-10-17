package com.threer.dto;

import java.util.List;

// Body for creating or editing a listing.
public record ListingRequest(
        String title,
        String description,
        String category,
        String condition,
        Double price,
        Boolean isFree,
        String location,
        String contact,
        List<String> photos,
        String sellerId,
        String sellerName
) {
}