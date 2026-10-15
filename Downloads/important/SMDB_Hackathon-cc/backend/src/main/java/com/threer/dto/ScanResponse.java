
package com.threer.dto;

public class ScanResponse {

    private String itemId;

    // AI identification
    private String name;
    private String brand;
    private String size;
    private String container;

    // Identification confirmation
    private boolean identificationConfirmed;
    private String identificationMessage;

    // Recycling information
    private boolean recyclable;
    private String recyclingStatus = "UNVERIFIED";
    private String bin = "unknown";
    private String material;
    private String notes;

    // Environmental impact
    private double waterLiters;
    private double co2Kg;
    private double materialGrams;
    private String materialLabel;
    private int rewardPoints;

    // AI confidence
    private String matchedLabel;
    private double confidence;

    // Condition score
    private int conditionScore;
    private String conditionLabel;
    private java.util.List<String> conditionTips = new java.util.ArrayList<>();

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

    public boolean isIdentificationConfirmed() {
        return identificationConfirmed;
    }

    public void setIdentificationConfirmed(
            boolean identificationConfirmed) {
        this.identificationConfirmed = identificationConfirmed;
    }

    public String getIdentificationMessage() {
        return identificationMessage;
    }

    public void setIdentificationMessage(String identificationMessage) {
        this.identificationMessage = identificationMessage;
    }

    public boolean isRecyclable() {
        return recyclable;
    }

    public void setRecyclable(boolean recyclable) {
        this.recyclable = recyclable;
    }

    public String getRecyclingStatus() {
        return recyclingStatus;
    }

    public void setRecyclingStatus(String recyclingStatus) {
        this.recyclingStatus = recyclingStatus == null
                || recyclingStatus.isBlank()
                ? "UNVERIFIED"
                : recyclingStatus.toUpperCase();
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

    public int getConditionScore() {
        return conditionScore;
    }

    public void setConditionScore(int conditionScore) {
        this.conditionScore = conditionScore;
    }

    public String getConditionLabel() {
        return conditionLabel;
    }

    public void setConditionLabel(String conditionLabel) {
        this.conditionLabel = conditionLabel;
    }

    public java.util.List<String> getConditionTips() {
        return conditionTips;
    }

    public void setConditionTips(java.util.List<String> conditionTips) {
        this.conditionTips = conditionTips == null
                ? new java.util.ArrayList<>()
                : conditionTips;
    }
}
