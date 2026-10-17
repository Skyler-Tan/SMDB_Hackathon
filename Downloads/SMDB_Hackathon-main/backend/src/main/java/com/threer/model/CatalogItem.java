package com.threer.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document("catalog_items")
public class CatalogItem {

    @Id
    private String id;
    private String name;
    private String material;
    private boolean recyclable;
    private String bin;
    private String notes;
    private double waterLiters;
    private double co2Kg;
    private double materialGrams;
    private String materialLabel;
    private int rewardPoints;
    private List<String> cocoLabels = new ArrayList<>();
    private List<String> aliases = new ArrayList<>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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

    public List<String> getCocoLabels() {
        return cocoLabels;
    }

    public void setCocoLabels(List<String> cocoLabels) {
        this.cocoLabels = cocoLabels;
    }

    public List<String> getAliases() {
        return aliases;
    }

    public void setAliases(List<String> aliases) {
        this.aliases = aliases;
    }
}
