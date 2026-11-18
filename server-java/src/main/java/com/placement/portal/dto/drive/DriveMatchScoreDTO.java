package com.placement.portal.dto.drive;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.placement.portal.dto.company.CompanyResponseDTO;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class DriveMatchScoreDTO {

    private Object driveId; // String or Long
    private String driveTitle;
    private String jobRole;
    private CompanyResponseDTO company;
    private List<String> requiredSkills = new ArrayList<>();
    private List<String> studentSkills = new ArrayList<>();
    private Boolean hasApplied;
    private String myApplicationStatus;
    private String myApplicationId;
    private AcademicEligibilityDTO academicEligibility;
    private SkillMatchResultDTO skillMatch;

    public DriveMatchScoreDTO() {}

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

    public List<String> getStudentSkills() { return studentSkills; }
    public void setStudentSkills(List<String> studentSkills) { this.studentSkills = studentSkills; }

    public Boolean getHasApplied() { return hasApplied; }
    public void setHasApplied(Boolean hasApplied) { this.hasApplied = hasApplied; }

    public String getMyApplicationStatus() { return myApplicationStatus; }
    public void setMyApplicationStatus(String myApplicationStatus) { this.myApplicationStatus = myApplicationStatus; }

    public String getMyApplicationId() { return myApplicationId; }
    public void setMyApplicationId(String myApplicationId) { this.myApplicationId = myApplicationId; }

    public AcademicEligibilityDTO getAcademicEligibility() { return academicEligibility; }
    public void setAcademicEligibility(AcademicEligibilityDTO academicEligibility) { this.academicEligibility = academicEligibility; }

    public SkillMatchResultDTO getSkillMatch() { return skillMatch; }
    public void setSkillMatch(SkillMatchResultDTO skillMatch) { this.skillMatch = skillMatch; }
}
