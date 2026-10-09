package com.threer.dto;

public class ScanResponse {

    private String itemId;
    private String name;
    private String brand;
    private String size;
    private String container;

    private boolean recyclable;
    private String bin;
    private String material;
    private String notes;

    private double waterLiters;
    private double co2Kg;
    private double materialGrams;

    private String materialLabel;
    private int rewardPoints;

    private String matchedLabel;
    private double confidence;

    public String getItemId() {
        return itemId;
    }

    public void setItemId(String itemId) {
        this.itemId = itemId;
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

    public String getMaterial() {
        return material;
    }

    public void setMaterial(String material) {
        this.material = material;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
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

    public String getMaterialLabel() {
        return materialLabel;
    }

    public void setMaterialLabel(String materialLabel) {
        this.materialLabel = materialLabel;
    }

    public int getRewardPoints() {
        return rewardPoints;
    }

    public void setRewardPoints(int rewardPoints) {
        this.rewardPoints = rewardPoints;
    }

    public String getMatchedLabel() {
        return matchedLabel;
    }

    public void setMatchedLabel(String matchedLabel) {
        this.matchedLabel = matchedLabel;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }
}