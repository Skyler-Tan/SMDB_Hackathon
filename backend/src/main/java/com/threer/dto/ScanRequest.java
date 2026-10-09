package com.threer.dto;

import java.util.ArrayList;
import java.util.List;

public class ScanRequest {

    private List<DetectionDto> detections = new ArrayList<>();
    private String hint;

    // Base64 image/data URI sent from Angular
    private String image;

    public List<DetectionDto> getDetections() {
        return detections;
    }

    public void setDetections(List<DetectionDto> detections) {
        this.detections = detections;
    }

    public String getHint() {
        return hint;
    }

    public void setHint(String hint) {
        this.hint = hint;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }
}