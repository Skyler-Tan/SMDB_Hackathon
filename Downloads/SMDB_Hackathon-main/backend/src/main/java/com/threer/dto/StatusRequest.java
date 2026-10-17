package com.threer.dto;

// Body for changing a listing's status (AVAILABLE, RESERVED or SOLD).
public record StatusRequest(
        String status,
        String userId
) {
}