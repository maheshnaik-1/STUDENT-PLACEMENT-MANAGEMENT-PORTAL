package com.placement.portal.dto.application;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.placement.portal.dto.drive.AcademicEligibilityDTO;
import com.placement.portal.dto.drive.SkillMatchResultDTO;

import java.time.Instant;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApplicantMatchItemDTO {

    private Object applicationId;
    private String status;
    private String remarks;
    private Instant appliedAt;
    private Map<String, Object> student;
    private AcademicEligibilityDTO academicEligibility;
    private SkillMatchResultDTO skillMatch;

    public ApplicantMatchItemDTO() {}

    public Object getApplicationId() { return applicationId; }
    public void setApplicationId(Object applicationId) { this.applicationId = applicationId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public Instant getAppliedAt() { return appliedAt; }
    public void setAppliedAt(Instant appliedAt) { this.appliedAt = appliedAt; }

    public Map<String, Object> getStudent() { return student; }
    public void setStudent(Map<String, Object> student) { this.student = student; }

    public AcademicEligibilityDTO getAcademicEligibility() { return academicEligibility; }
    public void setAcademicEligibility(AcademicEligibilityDTO academicEligibility) { this.academicEligibility = academicEligibility; }

    public SkillMatchResultDTO getSkillMatch() { return skillMatch; }
    public void setSkillMatch(SkillMatchResultDTO skillMatch) { this.skillMatch = skillMatch; }
}
