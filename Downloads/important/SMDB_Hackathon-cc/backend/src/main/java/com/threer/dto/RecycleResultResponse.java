package com.threer.dto;

import java.util.ArrayList;
import java.util.List;

public class RecycleResultResponse {
    private int quantity;
    private String itemName;
    private double waterLitersThisTurn;
    private double co2KgThisTurn;
    private double materialGramsThisTurn;
    private String materialLabel;
    private int pointsThisTurn;
    private List<String> newBadges = new ArrayList<>();
    private StatsResponse totals;

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public double getWaterLitersThisTurn() {
        return waterLitersThisTurn;
    }

    public void setWaterLitersThisTurn(double waterLitersThisTurn) {
        this.waterLitersThisTurn = waterLitersThisTurn;
    }

    public double getCo2KgThisTurn() {
        return co2KgThisTurn;
    }

    public void setCo2KgThisTurn(double co2KgThisTurn) {
        this.co2KgThisTurn = co2KgThisTurn;
    }

    public double getMaterialGramsThisTurn() {
        return materialGramsThisTurn;
    }

    public void setMaterialGramsThisTurn(double materialGramsThisTurn) {
        this.materialGramsThisTurn = materialGramsThisTurn;
    }

    public String getMaterialLabel() {
        return materialLabel;
    }

    public void setMaterialLabel(String materialLabel) {
        this.materialLabel = materialLabel;
    }

    public int getPointsThisTurn() {
        return pointsThisTurn;
    }

    public void setPointsThisTurn(int pointsThisTurn) {
        this.pointsThisTurn = pointsThisTurn;
    }

    public List<String> getNewBadges() {
        return newBadges;
    }

    public void setNewBadges(List<String> newBadges) {
        this.newBadges = newBadges;
    }

    public StatsResponse getTotals() {
        return totals;
    }

    public void setTotals(StatsResponse totals) {
        this.totals = totals;
    }
}
