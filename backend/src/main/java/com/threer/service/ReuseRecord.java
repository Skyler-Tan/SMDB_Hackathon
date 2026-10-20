package com.threer.service;

import java.time.Instant;

/**
 * One "I reused this item" event. Serialised to JSON with the field names
 * the React ReuseHistory page expects: id, userId, itemName, idea, quantity,
 * pointsEarned, createdAt.
 */
public class ReuseRecord {

    private Long id;
    private String userId;
    private String itemName;
    private String idea;
    private int quantity = 1;
    private int pointsEarned;
    private Instant createdAt;

    public ReuseRecord() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public String getIdea() { return idea; }
    public void setIdea(String idea) { this.idea = idea; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public int getPointsEarned() { return pointsEarned; }
    public void setPointsEarned(int pointsEarned) { this.pointsEarned = pointsEarned; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}