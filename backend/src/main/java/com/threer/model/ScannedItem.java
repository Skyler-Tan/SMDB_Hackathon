
package com.threer.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "scanned_items")
public class ScannedItem {

    @Id
    private String id;

    private String userId;

    private String name;
    private String brand;
    private String size;
    private String container;
    private String material;

    private boolean recyclable = false;
    private String bin = "unknown";
    private String description;

    private double confidence;

    // Whether the user has confirmed the identified item.
    private boolean identificationConfirmed = false;

    // UNVERIFIED, RECYCLABLE, or NOT_RECYCLABLE.
    private String recyclingStatus = "UNVERIFIED";

    private Instant scannedAt;

    public ScannedItem() {
        this.scannedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getSize() {
        return size;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public String getContainer() {
        return container;
    }

    public void setContainer(String container) {
        this.container = container;
    }

    public String getMaterial() {
        return material;
    }

    public void setMaterial(String material) {
        this.material = material;
    }

    public boolean isRecyclable() {
        return recyclable;
    }

    public void setRecyclable(boolean recyclable) {
        this.recyclable = recyclable;
    }

    public String getBin() {
        return bin;
    }

    public void setBin(String bin) {
        this.bin = bin;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public boolean isIdentificationConfirmed() {
        return identificationConfirmed;
    }

    public void setIdentificationConfirmed(boolean identificationConfirmed) {
        this.identificationConfirmed = identificationConfirmed;
    }

    public String getRecyclingStatus() {
        return recyclingStatus;
    }

    public void setRecyclingStatus(String recyclingStatus) {
        if (recyclingStatus == null || recyclingStatus.isBlank()) {
            this.recyclingStatus = "UNVERIFIED";
        } else {
            this.recyclingStatus = recyclingStatus.trim().toUpperCase();
        }
    }

    public Instant getScannedAt() {
        return scannedAt;
    }

    public void setScannedAt(Instant scannedAt) {
        this.scannedAt = scannedAt;
    }
}
