package com.threer.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document("users")
public class UserProfile {

    @Id
    private String id;
    private int points;
    private int itemsRecycled;
    private double waterLiters;
    private double co2Kg;
    private double materialGrams;
    private List<String> badges = new ArrayList<>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

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
}
