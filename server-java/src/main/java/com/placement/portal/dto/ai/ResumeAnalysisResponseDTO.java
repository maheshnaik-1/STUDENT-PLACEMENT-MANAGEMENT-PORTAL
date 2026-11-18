package com.placement.portal.dto.ai;

import java.util.ArrayList;
import java.util.List;

public class ResumeAnalysisResponseDTO {
    private String originalName;
    private String fileType;
    private int characterCount;
    private int wordCount;
    private List<String> extractedSkills = new ArrayList<>();
    private List<String> newSkillsFound = new ArrayList<>();
    private List<String> currentProfileSkills = new ArrayList<>();
    private ContactInfoDTO contactInfo;
    private List<ResumeSuggestionDTO> suggestions = new ArrayList<>();

    public ResumeAnalysisResponseDTO() {}

    public String getOriginalName() {
        return originalName;
    }

    public void setOriginalName(String originalName) {
        this.originalName = originalName;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public int getCharacterCount() {
        return characterCount;
    }

    public void setCharacterCount(int characterCount) {
        this.characterCount = characterCount;
    }

    public int getWordCount() {
        return wordCount;
    }

    public void setWordCount(int wordCount) {
        this.wordCount = wordCount;
    }

    public List<String> getExtractedSkills() {
        return extractedSkills;
    }

    public void setExtractedSkills(List<String> extractedSkills) {
        this.extractedSkills = extractedSkills != null ? extractedSkills : new ArrayList<>();
    }

    public List<String> getNewSkillsFound() {
        return newSkillsFound;
    }

    public void setNewSkillsFound(List<String> newSkillsFound) {
        this.newSkillsFound = newSkillsFound != null ? newSkillsFound : new ArrayList<>();
    }

    public List<String> getCurrentProfileSkills() {
        return currentProfileSkills;
    }

    public void setCurrentProfileSkills(List<String> currentProfileSkills) {
        this.currentProfileSkills = currentProfileSkills != null ? currentProfileSkills : new ArrayList<>();
    }

    public ContactInfoDTO getContactInfo() {
        return contactInfo;
    }

    public void setContactInfo(ContactInfoDTO contactInfo) {
        this.contactInfo = contactInfo;
    }

    public List<ResumeSuggestionDTO> getSuggestions() {
        return suggestions;
    }

    public void setSuggestions(List<ResumeSuggestionDTO> suggestions) {
        this.suggestions = suggestions != null ? suggestions : new ArrayList<>();
    }
}

