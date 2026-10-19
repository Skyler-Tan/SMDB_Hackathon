package com.threer.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "saved_ideas")
@CompoundIndex(name = "user_idea_unique", def = "{'userId': 1, 'ideaKey': 1}", unique = true)
public class SavedIdea {

    @Id
    private String id;

    private String userId;
    private String ideaKey;
    private String itemId;
    private String itemName;
    private String title;
    private String summary;
    private String difficulty;
    private String finalProduct;
    private List<String> materials = new ArrayList<>();
    private List<String> tools = new ArrayList<>();
    private List<String> steps = new ArrayList<>();
    private String tutorialUrl;
    private String sourceUrl;
    private Instant createdAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getIdeaKey() { return ideaKey; }
    public void setIdeaKey(String ideaKey) { this.ideaKey = ideaKey; }

    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getFinalProduct() { return finalProduct; }
    public void setFinalProduct(String finalProduct) { this.finalProduct = finalProduct; }

    public List<String> getMaterials() { return materials; }
    public void setMaterials(List<String> materials) { this.materials = materials; }

    public List<String> getTools() { return tools; }
    public void setTools(List<String> tools) { this.tools = tools; }

    public List<String> getSteps() { return steps; }
    public void setSteps(List<String> steps) { this.steps = steps; }

    public String getTutorialUrl() { return tutorialUrl; }
    public void setTutorialUrl(String tutorialUrl) { this.tutorialUrl = tutorialUrl; }

    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}