package com.placement.portal.dto.drive;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class DriveRecommendationDTO extends DriveResponseDTO {

    private String recommendationTier;
    private AcademicEligibilityDTO academicEligibility;
    private SkillMatchResultDTO skillMatch;

    public DriveRecommendationDTO() {}

    public String getRecommendationTier() { return recommendationTier; }
    public void setRecommendationTier(String recommendationTier) { this.recommendationTier = recommendationTier; }

    public AcademicEligibilityDTO getAcademicEligibility() { return academicEligibility; }
    public void setAcademicEligibility(AcademicEligibilityDTO academicEligibility) { this.academicEligibility = academicEligibility; }

    public SkillMatchResultDTO getSkillMatch() { return skillMatch; }
    public void setSkillMatch(SkillMatchResultDTO skillMatch) { this.skillMatch = skillMatch; }
}
