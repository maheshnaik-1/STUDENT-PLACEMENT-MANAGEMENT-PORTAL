package com.placement.portal.dto.drive;

import java.util.ArrayList;
import java.util.List;

public class SkillMatchResultDTO {

    private int score;
    private int matchPercentage;
    private List<String> matchedSkills = new ArrayList<>();
    private List<String> missingSkills = new ArrayList<>();
    private List<String> additionalSkills = new ArrayList<>();
    private int totalRequired;
    private int totalMatched;
    private String explanation;

    public SkillMatchResultDTO() {}

    public SkillMatchResultDTO(int score, int matchPercentage, List<String> matchedSkills,
                               List<String> missingSkills, List<String> additionalSkills,
                               int totalRequired, int totalMatched, String explanation) {
        this.score = score;
        this.matchPercentage = matchPercentage;
        this.matchedSkills = matchedSkills != null ? matchedSkills : new ArrayList<>();
        this.missingSkills = missingSkills != null ? missingSkills : new ArrayList<>();
        this.additionalSkills = additionalSkills != null ? additionalSkills : new ArrayList<>();
        this.totalRequired = totalRequired;
        this.totalMatched = totalMatched;
        this.explanation = explanation;
    }

    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }

    public int getMatchPercentage() { return matchPercentage; }
    public void setMatchPercentage(int matchPercentage) { this.matchPercentage = matchPercentage; }

    public List<String> getMatchedSkills() { return matchedSkills; }
    public void setMatchedSkills(List<String> matchedSkills) { this.matchedSkills = matchedSkills; }

    public List<String> getMissingSkills() { return missingSkills; }
    public void setMissingSkills(List<String> missingSkills) { this.missingSkills = missingSkills; }

    public List<String> getAdditionalSkills() { return additionalSkills; }
    public void setAdditionalSkills(List<String> additionalSkills) { this.additionalSkills = additionalSkills; }

    public int getTotalRequired() { return totalRequired; }
    public void setTotalRequired(int totalRequired) { this.totalRequired = totalRequired; }

    public int getTotalMatched() { return totalMatched; }
    public void setTotalMatched(int totalMatched) { this.totalMatched = totalMatched; }

    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }
}
