package com.placement.portal.dto.drive;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class EligibilityDTO {

    private BigDecimal minCGPA;
    private List<String> allowedBranches = new ArrayList<>();
    private Integer maxBacklogs;
    private Integer passingYear;

    public EligibilityDTO() {}

    public EligibilityDTO(BigDecimal minCGPA, List<String> allowedBranches, Integer maxBacklogs, Integer passingYear) {
        this.minCGPA = minCGPA;
        this.allowedBranches = allowedBranches != null ? allowedBranches : new ArrayList<>();
        this.maxBacklogs = maxBacklogs;
        this.passingYear = passingYear;
    }

    public BigDecimal getMinCGPA() { return minCGPA; }
    public void setMinCGPA(BigDecimal minCGPA) { this.minCGPA = minCGPA; }

    public List<String> getAllowedBranches() { return allowedBranches; }
    public void setAllowedBranches(List<String> allowedBranches) { this.allowedBranches = allowedBranches; }

    public Integer getMaxBacklogs() { return maxBacklogs; }
    public void setMaxBacklogs(Integer maxBacklogs) { this.maxBacklogs = maxBacklogs; }

    public Integer getPassingYear() { return passingYear; }
    public void setPassingYear(Integer passingYear) { this.passingYear = passingYear; }
}
