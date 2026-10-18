package com.threer.dto;

// Body for reporting a listing.
public record ReportRequest(
        String reason,
        String userId
) {
}