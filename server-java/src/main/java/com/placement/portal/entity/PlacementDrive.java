package com.placement.portal.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "placement_drives")
public class PlacementDrive {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "job_role", nullable = false)
    private String jobRole;

    @Column(name = "job_description", nullable = false, columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "package_ctc", nullable = false, length = 100)
    private String packageCtc;

    @Column(name = "location", nullable = false)
    private String location;

    @Column(name = "min_cgpa", nullable = false, precision = 4, scale = 2)
    private BigDecimal minCgpa;

    @Column(name = "max_backlogs", nullable = false)
    private Integer maxBacklogs;

    @Column(name = "passing_year", nullable = false)
    private Integer passingYear;

    @Column(name = "drive_date", nullable = false)
    private Instant driveDate;

    @Column(name = "deadline", nullable = false)
    private Instant deadline;

    @Column(name = "status", nullable = false, length = 50)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "drive", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DriveAllowedBranch> allowedBranches = new ArrayList<>();

    @OneToMany(mappedBy = "drive", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DriveRound> rounds = new ArrayList<>();

    @OneToMany(mappedBy = "drive", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DriveRequiredSkill> requiredSkills = new ArrayList<>();

    public PlacementDrive() {}

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (status == null) status = "Upcoming";
        if (minCgpa == null) minCgpa = new BigDecimal("6.00");
        if (maxBacklogs == null) maxBacklogs = 0;
        if (passingYear == null) passingYear = 2026;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Company getCompany() { return company; }
    public void setCompany(Company company) { this.company = company; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getJobRole() { return jobRole; }
    public void setJobRole(String jobRole) { this.jobRole = jobRole; }

    public String getJobDescription() { return jobDescription; }
    public void setJobDescription(String jobDescription) { this.jobDescription = jobDescription; }

    public String getPackageCtc() { return packageCtc; }
    public void setPackageCtc(String packageCtc) { this.packageCtc = packageCtc; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public BigDecimal getMinCgpa() { return minCgpa; }
    public void setMinCgpa(BigDecimal minCgpa) { this.minCgpa = minCgpa; }

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

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public List<DriveAllowedBranch> getAllowedBranches() { return allowedBranches; }
    public void setAllowedBranches(List<DriveAllowedBranch> allowedBranches) { this.allowedBranches = allowedBranches; }

    public List<DriveRound> getRounds() { return rounds; }
    public void setRounds(List<DriveRound> rounds) { this.rounds = rounds; }

    public List<DriveRequiredSkill> getRequiredSkills() { return requiredSkills; }
    public void setRequiredSkills(List<DriveRequiredSkill> requiredSkills) { this.requiredSkills = requiredSkills; }
}
