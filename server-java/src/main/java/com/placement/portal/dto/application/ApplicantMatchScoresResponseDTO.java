package com.placement.portal.dto.application;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.placement.portal.dto.company.CompanyResponseDTO;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApplicantMatchScoresResponseDTO {

    private Object driveId;
    private String driveTitle;
    private String jobRole;
    private CompanyResponseDTO company;
    private List<String> requiredSkills = new ArrayList<>();
    private int totalApplicants;
    private int averageScore;
    private Map<String, Integer> scoreDistribution = new HashMap<>();
    private List<ApplicantMatchItemDTO> applicants = new ArrayList<>();

    public ApplicantMatchScoresResponseDTO() {
        scoreDistribution.put("excellent", 0);
        scoreDistribution.put("good", 0);
        scoreDistribution.put("moderate", 0);
        scoreDistribution.put("low", 0);
        scoreDistribution.put("zero", 0);
    }

    public Object getDriveId() { return driveId; }
    public void setDriveId(Object driveId) { this.driveId = driveId; }

    public String getDriveTitle() { return driveTitle; }
    public void setDriveTitle(String driveTitle) { this.driveTitle = driveTitle; }

    public String getJobRole() { return jobRole; }
    public void setJobRole(String jobRole) { this.jobRole = jobRole; }

    public CompanyResponseDTO getCompany() { return company; }
    public void setCompany(CompanyResponseDTO company) { this.company = company; }

    public List<String> getRequiredSkills() { return requiredSkills; }
    public void setRequiredSkills(List<String> requiredSkills) { this.requiredSkills = requiredSkills; }

    public int getTotalApplicants() { return totalApplicants; }
    public void setTotalApplicants(int totalApplicants) { this.totalApplicants = totalApplicants; }

    public int getAverageScore() { return averageScore; }
    public void setAverageScore(int averageScore) { this.averageScore = averageScore; }

    public Map<String, Integer> getScoreDistribution() { return scoreDistribution; }
    public void setScoreDistribution(Map<String, Integer> scoreDistribution) { this.scoreDistribution = scoreDistribution; }

    public List<ApplicantMatchItemDTO> getApplicants() { return applicants; }
    public void setApplicants(List<ApplicantMatchItemDTO> applicants) { this.applicants = applicants; }
}
