package com.placement.portal.dto.drive;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.placement.portal.dto.company.CompanyResponseDTO;
import com.placement.portal.entity.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class DriveResponseDTO {

    private Long id;
    private String _id;
    private CompanyResponseDTO company;
    private String title;
    private String jobRole;
    private String jobDescription;
    private String packageCTC;
    private String location;
    private EligibilityDTO eligibility;
    private Instant driveDate;
    private Instant deadline;
    private String status;
    private List<String> rounds = new ArrayList<>();
    private List<String> requiredSkills = new ArrayList<>();
    private Long totalApplicants;
    private Instant createdAt;
    private Instant updatedAt;

    // Student contextual properties
    private Boolean isEligible;
    private List<String> eligibilityReasons;
    private Boolean hasApplied;
    private String myApplicationStatus;
    private String myApplicationId;
    private Object myApplication;

    public DriveResponseDTO() {}

    public static DriveResponseDTO fromEntity(PlacementDrive drive) {
        return fromEntity(drive, null);
    }

    public static DriveResponseDTO fromEntity(PlacementDrive drive, Long applicantCount) {
        if (drive == null) return null;
        DriveResponseDTO dto = new DriveResponseDTO();
        dto.setId(drive.getId());
        dto.set_id(drive.getId() != null ? drive.getId().toString() : null);
        dto.setTitle(drive.getTitle());
        dto.setJobRole(drive.getJobRole());
        dto.setJobDescription(drive.getJobDescription());
        dto.setPackageCTC(drive.getPackageCtc());
        dto.setLocation(drive.getLocation());
        dto.setDriveDate(drive.getDriveDate());
        dto.setDeadline(drive.getDeadline());
        dto.setStatus(drive.getStatus());
        dto.setCreatedAt(drive.getCreatedAt());
        dto.setUpdatedAt(drive.getUpdatedAt());
        dto.setTotalApplicants(applicantCount != null ? applicantCount : 0L);

        if (drive.getCompany() != null) {
            dto.setCompany(CompanyResponseDTO.fromEntity(drive.getCompany()));
        }

        List<String> branches = new ArrayList<>();
        if (drive.getAllowedBranches() != null) {
            for (DriveAllowedBranch b : drive.getAllowedBranches()) {
                branches.add(b.getBranch());
            }
        }

        dto.setEligibility(new EligibilityDTO(
                drive.getMinCgpa(),
                branches,
                drive.getMaxBacklogs(),
                drive.getPassingYear()
        ));

        List<String> roundNames = new ArrayList<>();
        if (drive.getRounds() != null) {
            List<DriveRound> sortedRounds = new ArrayList<>(drive.getRounds());
            sortedRounds.sort(Comparator.comparing(DriveRound::getRoundOrder));
            for (DriveRound r : sortedRounds) {
                roundNames.add(r.getRoundName());
            }
        }
        dto.setRounds(roundNames);

        List<String> skills = new ArrayList<>();
        if (drive.getRequiredSkills() != null) {
            for (DriveRequiredSkill s : drive.getRequiredSkills()) {
                skills.add(s.getSkill());
            }
        }
        dto.setRequiredSkills(skills);

        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String get_id() { return _id; }
    public void set_id(String _id) { this._id = _id; }

    public CompanyResponseDTO getCompany() { return company; }
    public void setCompany(CompanyResponseDTO company) { this.company = company; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getJobRole() { return jobRole; }
    public void setJobRole(String jobRole) { this.jobRole = jobRole; }

    public String getJobDescription() { return jobDescription; }
    public void setJobDescription(String jobDescription) { this.jobDescription = jobDescription; }

    public String getPackageCTC() { return packageCTC; }
    public void setPackageCTC(String packageCTC) { this.packageCTC = packageCTC; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public EligibilityDTO getEligibility() { return eligibility; }
    public void setEligibility(EligibilityDTO eligibility) { this.eligibility = eligibility; }

    public Instant getDriveDate() { return driveDate; }
    public void setDriveDate(Instant driveDate) { this.driveDate = driveDate; }

    public Instant getDeadline() { return deadline; }
    public void setDeadline(Instant deadline) { this.deadline = deadline; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<String> getRounds() { return rounds; }
    public void setRounds(List<String> rounds) { this.rounds = rounds; }

    public List<String> getRequiredSkills() { return requiredSkills; }
    public void setRequiredSkills(List<String> requiredSkills) { this.requiredSkills = requiredSkills; }

    public Long getTotalApplicants() { return totalApplicants; }
    public void setTotalApplicants(Long totalApplicants) { this.totalApplicants = totalApplicants; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Boolean getIsEligible() { return isEligible; }
    public void setIsEligible(Boolean eligible) { isEligible = eligible; }

    public List<String> getEligibilityReasons() { return eligibilityReasons; }
    public void setEligibilityReasons(List<String> eligibilityReasons) { this.eligibilityReasons = eligibilityReasons; }

    public Boolean getHasApplied() { return hasApplied; }
    public void setHasApplied(Boolean hasApplied) { this.hasApplied = hasApplied; }

    public String getMyApplicationStatus() { return myApplicationStatus; }
    public void setMyApplicationStatus(String myApplicationStatus) { this.myApplicationStatus = myApplicationStatus; }

    public String getMyApplicationId() { return myApplicationId; }
    public void setMyApplicationId(String myApplicationId) { this.myApplicationId = myApplicationId; }

    public Object getMyApplication() { return myApplication; }
    public void setMyApplication(Object myApplication) { this.myApplication = myApplication; }
}
