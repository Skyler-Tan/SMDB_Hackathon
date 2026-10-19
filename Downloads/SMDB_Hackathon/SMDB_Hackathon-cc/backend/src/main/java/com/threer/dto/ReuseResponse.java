package com.threer.dto;

import java.util.List;

public class ReuseResponse {

    private String difficulty;
    private List<DiyIdea> ideas;

    public ReuseResponse() {
    }

    public ReuseResponse(
            String difficulty,
            List<DiyIdea> ideas) {

        this.difficulty = difficulty;
        this.ideas = ideas;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public List<DiyIdea> getIdeas() {
        return ideas;
    }

    public void setIdeas(List<DiyIdea> ideas) {
        this.ideas = ideas;
    }

    public record DiyIdea(
            String title,
            String difficulty,
            String summary,
            String finalProduct,
            List<String> materials,
            List<String> tools,
            List<String> steps,
            String tutorialTitle,
            String tutorialUrl,
            String sourceTitle,
            String sourceUrl
    ) {
    }
}