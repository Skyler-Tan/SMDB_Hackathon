package com.threer.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("recycle_events")
public class RecycleEvent {

    @Id
    private String id;
    private String userId;
    private String itemId;
    private String itemName;
    private String material;
    private String bin;
    private int quantity;
    private double waterLiters;
    private double co2Kg;
    private double materialGrams;
    private int pointsEarned;
    private Instant createdAt;

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

    public String getItemId() {
        return itemId;
    }

    public void setItemId(String itemId) {
        this.itemId = itemId;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getMaterial() {
        return material;
    }

    public void setMaterial(String material) {
        this.material = material;
    }

    public String getBin() {
        return bin;
    }

    public void setBin(String bin) {
        this.bin = bin;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public double getWaterLiters() {
        return waterLiters;
    }

    public void setWaterLiters(double waterLiters) {
        this.waterLiters = waterLiters;
    }

    public double getCo2Kg() {
        return co2Kg;
    }

    public void setCo2Kg(double co2Kg) {
        this.co2Kg = co2Kg;
    }

    public double getMaterialGrams() {
        return materialGrams;
    }

    public void setMaterialGrams(double materialGrams) {
        this.materialGrams = materialGrams;
    }

    public int getPointsEarned() {
        return pointsEarned;
    }

    public void setPointsEarned(int pointsEarned) {
        this.pointsEarned = pointsEarned;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
