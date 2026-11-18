package com.placement.portal.dto.application;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class OfficerAnalyticsDTO {

    private Map<String, Object> summary = new HashMap<>();
    private List<Map<String, Object>> statusDistribution = new ArrayList<>();
    private Map<String, Object> recruitmentFunnel = new HashMap<>();
    private Map<String, Object> salaryAnalytics = new HashMap<>();
    private List<Map<String, Object>> driveAnalytics = new ArrayList<>();
    private List<Map<String, Object>> branchAnalytics = new ArrayList<>();
    private List<Map<String, Object>> recentApplications = new ArrayList<>();
    private List<Map<String, Object>> applicationsRoster = new ArrayList<>();
    private List<Map<String, Object>> studentRoster = new ArrayList<>();
    private Map<String, Object> availableFilters = new HashMap<>();

    public OfficerAnalyticsDTO() {}

    public Map<String, Object> getSummary() { return summary; }
    public void setSummary(Map<String, Object> summary) { this.summary = summary; }

    public List<Map<String, Object>> getStatusDistribution() { return statusDistribution; }
    public void setStatusDistribution(List<Map<String, Object>> statusDistribution) { this.statusDistribution = statusDistribution; }

    public Map<String, Object> getRecruitmentFunnel() { return recruitmentFunnel; }
    public void setRecruitmentFunnel(Map<String, Object> recruitmentFunnel) { this.recruitmentFunnel = recruitmentFunnel; }

    public Map<String, Object> getSalaryAnalytics() { return salaryAnalytics; }
    public void setSalaryAnalytics(Map<String, Object> salaryAnalytics) { this.salaryAnalytics = salaryAnalytics; }

    public List<Map<String, Object>> getDriveAnalytics() { return driveAnalytics; }
    public void setDriveAnalytics(List<Map<String, Object>> driveAnalytics) { this.driveAnalytics = driveAnalytics; }

    public List<Map<String, Object>> getBranchAnalytics() { return branchAnalytics; }
    public void setBranchAnalytics(List<Map<String, Object>> branchAnalytics) { this.branchAnalytics = branchAnalytics; }

    public List<Map<String, Object>> getRecentApplications() { return recentApplications; }
    public void setRecentApplications(List<Map<String, Object>> recentApplications) { this.recentApplications = recentApplications; }

    public List<Map<String, Object>> getApplicationsRoster() { return applicationsRoster; }
    public void setApplicationsRoster(List<Map<String, Object>> applicationsRoster) { this.applicationsRoster = applicationsRoster; }

    public List<Map<String, Object>> getStudentRoster() { return studentRoster; }
    public void setStudentRoster(List<Map<String, Object>> studentRoster) { this.studentRoster = studentRoster; }

    public Map<String, Object> getAvailableFilters() { return availableFilters; }
    public void setAvailableFilters(Map<String, Object> availableFilters) { this.availableFilters = availableFilters; }
}
