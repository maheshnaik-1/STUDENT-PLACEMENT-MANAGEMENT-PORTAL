package com.placement.portal.dto.drive;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class DriveRequest {

    @NotNull(message = "Company is required")
    private Object company; // Can be Long, String ID, or Map with id/_id

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Job role is required")
    private String jobRole;

    @NotBlank(message = "Job description is required")
    private String jobDescription;

    @NotBlank(message = "Package CTC is required")
    private String packageCTC;

    @NotBlank(message = "Location is required")
    private String location;

    private EligibilityDTO eligibility;

    // Direct fallback fields if not nested under eligibility
    private BigDecimal minCGPA;
    private List<String> allowedBranches;
    private Integer maxBacklogs;
    private Integer passingYear;

    private Instant driveDate;
    private Instant deadline;
    private String status = "Upcoming";

    private List<String> rounds = new ArrayList<>();
    private List<String> requiredSkills = new ArrayList<>();

    public DriveRequest() {}

    @JsonIgnore
    public Long getResolvedCompanyId() {
        if (company == null) return null;
        if (company instanceof Number num) {
            return num.longValue();
        }
        if (company instanceof String str) {
            try {
                return Long.parseLong(str.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        if (company instanceof Map<?, ?> map) {
            Object idVal = map.get("id");
            if (idVal == null) idVal = map.get("_id");
            if (idVal instanceof Number n) return n.longValue();
            if (idVal instanceof String s) {
                try {
                    return Long.parseLong(s.trim());
                } catch (NumberFormatException ignored) {}
            }
        }
        return null;
    }

    @JsonIgnore
    public BigDecimal getEffectiveMinCGPA() {
        if (eligibility != null && eligibility.getMinCGPA() != null) {
            return eligibility.getMinCGPA();
        }
        return minCGPA != null ? minCGPA : new BigDecimal("6.00");
    }

    @JsonIgnore
    public List<String> getEffectiveAllowedBranches() {
        if (eligibility != null && eligibility.getAllowedBranches() != null && !eligibility.getAllowedBranches().isEmpty()) {
            return eligibility.getAllowedBranches();
        }
        if (allowedBranches != null && !allowedBranches.isEmpty()) {
            return allowedBranches;
        }
        return List.of("CSE", "IT");
    }

    @JsonIgnore
    public Integer getEffectiveMaxBacklogs() {
        if (eligibility != null && eligibility.getMaxBacklogs() != null) {
            return eligibility.getMaxBacklogs();
        }
        return maxBacklogs != null ? maxBacklogs : 0;
    }

    @JsonIgnore
    public Integer getEffectivePassingYear() {
        if (eligibility != null && eligibility.getPassingYear() != null) {
            return eligibility.getPassingYear();
        }
        return passingYear != null ? passingYear : 2026;
    }

    @JsonSetter("driveDate")
    public void setDriveDateRaw(Object raw) {
        this.driveDate = parseDate(raw);
    }

    @JsonSetter("deadline")
    public void setDeadlineRaw(Object raw) {
        this.deadline = parseDate(raw);
    }

    private Instant parseDate(Object raw) {
        if (raw == null) return null;
        if (raw instanceof Instant inst) return inst;
        if (raw instanceof Number num) return Instant.ofEpochMilli(num.longValue());
        if (raw instanceof String str) {
            str = str.trim();
            if (str.isEmpty()) return null;
            try {
                return Instant.parse(str);
            } catch (DateTimeParseException e) {
                // If yyyy-MM-dd format without time, append T00:00:00Z
                if (str.length() == 10 && str.charAt(4) == '-' && str.charAt(7) == '-') {
                    return Instant.parse(str + "T00:00:00Z");
                }
            }
        }
        return null;
    }

    public Object getCompany() { return company; }
    public void setCompany(Object company) { this.company = company; }

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

    public BigDecimal getMinCGPA() { return minCGPA; }
    public void setMinCGPA(BigDecimal minCGPA) { this.minCGPA = minCGPA; }

    public List<String> getAllowedBranches() { return allowedBranches; }
    public void setAllowedBranches(List<String> allowedBranches) { this.allowedBranches = allowedBranches; }

    public Integer getMaxBacklogs() { return maxBacklogs; }
    public void setMaxBacklogs(Integer maxBacklogs) { this.maxBacklogs = maxBacklogs; }

    public Integer getPassingYear() { return passingYear; }
    public void setPassingYear(Integer passingYear) { this.passingYear = passingYear; }

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
}
