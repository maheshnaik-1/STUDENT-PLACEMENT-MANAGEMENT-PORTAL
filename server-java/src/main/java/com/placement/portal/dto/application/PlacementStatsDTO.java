package com.placement.portal.dto.application;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class PlacementStatsDTO {

    private long totalCompanies;
    private long totalDrives;
    private long activeDrives;
    private long totalStudents;
    private long totalApplications;
    private long totalSelected;
    private long totalShortlisted;
    private long totalTechnicalRound;
    private long totalInterview;
    private long totalApplied;
    private long totalRejected;
    private int placementRate;

    private Map<String, Object> recruitmentFunnel = new HashMap<>();
    private List<Map<String, Object>> branchStats = new ArrayList<>();
    private List<Map<String, Object>> placedStudents = new ArrayList<>();
    private List<Map<String, Object>> companyHires = new ArrayList<>();
    private List<Map<String, Object>> recentApplications = new ArrayList<>();

    public PlacementStatsDTO() {}

    public long getTotalCompanies() { return totalCompanies; }
    public void setTotalCompanies(long totalCompanies) { this.totalCompanies = totalCompanies; }

    public long getTotalDrives() { return totalDrives; }
    public void setTotalDrives(long totalDrives) { this.totalDrives = totalDrives; }

    public long getActiveDrives() { return activeDrives; }
    public void setActiveDrives(long activeDrives) { this.activeDrives = activeDrives; }

    public long getTotalStudents() { return totalStudents; }
    public void setTotalStudents(long totalStudents) { this.totalStudents = totalStudents; }

    public long getTotalApplications() { return totalApplications; }
    public void setTotalApplications(long totalApplications) { this.totalApplications = totalApplications; }

    public long getTotalSelected() { return totalSelected; }
    public void setTotalSelected(long totalSelected) { this.totalSelected = totalSelected; }

    public long getTotalShortlisted() { return totalShortlisted; }
    public void setTotalShortlisted(long totalShortlisted) { this.totalShortlisted = totalShortlisted; }

    public long getTotalTechnicalRound() { return totalTechnicalRound; }
    public void setTotalTechnicalRound(long totalTechnicalRound) { this.totalTechnicalRound = totalTechnicalRound; }

    public long getTotalInterview() { return totalInterview; }
    public void setTotalInterview(long totalInterview) { this.totalInterview = totalInterview; }

    public long getTotalApplied() { return totalApplied; }
    public void setTotalApplied(long totalApplied) { this.totalApplied = totalApplied; }

    public long getTotalRejected() { return totalRejected; }
    public void setTotalRejected(long totalRejected) { this.totalRejected = totalRejected; }

    public int getPlacementRate() { return placementRate; }
    public void setPlacementRate(int placementRate) { this.placementRate = placementRate; }

    public Map<String, Object> getRecruitmentFunnel() { return recruitmentFunnel; }
    public void setRecruitmentFunnel(Map<String, Object> recruitmentFunnel) { this.recruitmentFunnel = recruitmentFunnel; }

    public List<Map<String, Object>> getBranchStats() { return branchStats; }
    public void setBranchStats(List<Map<String, Object>> branchStats) { this.branchStats = branchStats; }

    public List<Map<String, Object>> getPlacedStudents() { return placedStudents; }
    public void setPlacedStudents(List<Map<String, Object>> placedStudents) { this.placedStudents = placedStudents; }

    public List<Map<String, Object>> getCompanyHires() { return companyHires; }
    public void setCompanyHires(List<Map<String, Object>> companyHires) { this.companyHires = companyHires; }

    public List<Map<String, Object>> getRecentApplications() { return recentApplications; }
    public void setRecentApplications(List<Map<String, Object>> recentApplications) { this.recentApplications = recentApplications; }
}
