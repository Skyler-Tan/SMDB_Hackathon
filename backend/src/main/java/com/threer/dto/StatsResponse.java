package com.threer.dto;

import java.util.ArrayList;
import java.util.List;

public class StatsResponse {
    private int points;
    private int itemsRecycled;
    private double waterLiters;
    private double co2Kg;
    private double materialGrams;
    private List<String> badges = new ArrayList<>();
    private List<MaterialCount> byMaterial = new ArrayList<>();

    public int getPoints() {
        return points;
    }

    public void setPoints(int points) {
        this.points = points;
    }

    public int getItemsRecycled() {
        return itemsRecycled;
    }

    public void setItemsRecycled(int itemsRecycled) {
        this.itemsRecycled = itemsRecycled;
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

    public List<String> getBadges() {
        return badges;
    }

    public void setBadges(List<String> badges) {
        this.badges = badges;
    }

    public List<MaterialCount> getByMaterial() {
        return byMaterial;
    }

    public void setByMaterial(List<MaterialCount> byMaterial) {
        this.byMaterial = byMaterial;
    }

    public static class MaterialCount {
        private String material;
        private long count;

        public MaterialCount() {
        }

        public MaterialCount(String material, long count) {
            this.material = material;
            this.count = count;
        }

        public String getMaterial() {
            return material;
        }

        public void setMaterial(String material) {
            this.material = material;
        }

        public long getCount() {
            return count;
        }

        public void setCount(long count) {
            this.count = count;
        }
    }
}
