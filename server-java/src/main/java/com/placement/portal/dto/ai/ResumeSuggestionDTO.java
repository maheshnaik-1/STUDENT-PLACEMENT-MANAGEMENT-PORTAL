package com.placement.portal.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ResumeSuggestionDTO {
    private String id;
    private String category;
    private String type;
    private String title;
    private String description;
    private String explanation;
    private String recommendation;

    @JsonProperty("isPositive")
    private boolean isPositive;

    private String severity;

    public ResumeSuggestionDTO() {}

    public ResumeSuggestionDTO(String id, String category, String type, String title,
                               String explanation, String recommendation,
                               boolean isPositive, String severity) {
        this.id = id;
        this.category = category;
        this.type = type;
        this.title = title;
        this.explanation = explanation;
        this.description = explanation;
        this.recommendation = recommendation;
        this.isPositive = isPositive;
        this.severity = severity;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
        if (this.description == null) {
            this.description = explanation;
        }
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }

    public boolean isPositive() {
        return isPositive;
    }

    public void setPositive(boolean positive) {
        isPositive = positive;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }
}

