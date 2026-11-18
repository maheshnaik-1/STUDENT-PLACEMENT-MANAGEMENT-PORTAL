package com.placement.portal.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "role", nullable = false, columnDefinition = "ENUM('student', 'officer')")
    private String role;

    @Column(name = "roll_no", unique = true)
    private String rollNo;

    @Column(name = "branch")
    private String branch;

    @Column(name = "cgpa", precision = 4, scale = 2)
    private BigDecimal cgpa;

    @Column(name = "active_backlogs")
    private Integer activeBacklogs;

    @Column(name = "passing_year")
    private Integer passingYear;

    @Column(name = "phone")
    private String phone;

    @Column(name = "resume_url", length = 1024)
    private String resumeUrl;

    @Column(name = "resume_file_name")
    private String resumeFileName;

    @Column(name = "resume_original_name")
    private String resumeOriginalName;

    @Column(name = "resume_mime_type")
    private String resumeMimeType;

    @Column(name = "resume_size")
    private Long resumeSize;

    @Column(name = "resume_path", length = 1024)
    private String resumePath;

    @Column(name = "resume_uploaded_at")
    private Instant resumeUploadedAt;

    @Column(name = "tenth_percentage", precision = 5, scale = 2)
    private BigDecimal tenthPercentage;

    @Column(name = "twelfth_percentage", precision = 5, scale = 2)
    private BigDecimal twelfthPercentage;

    @Column(name = "diploma_percentage", precision = 5, scale = 2)
    private BigDecimal diplomaPercentage;

    @Column(name = "current_semester")
    private Integer currentSemester;

    @Column(name = "gap_years")
    private Integer gapYears;

    @Column(name = "github_link", length = 500)
    private String githubLink;

    @Column(name = "linkedin_link", length = 500)
    private String linkedinLink;

    @Column(name = "portfolio_link", length = 500)
    private String portfolioLink;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StudentSkill> skills = new ArrayList<>();

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StudentProject> projects = new ArrayList<>();

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StudentCertification> certifications = new ArrayList<>();

    public User() {}

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (role == null) role = "student";
        if (branch == null) branch = "CSE";
        if (cgpa == null) cgpa = BigDecimal.ZERO;
        if (activeBacklogs == null) activeBacklogs = 0;
        if (passingYear == null) passingYear = 2026;
        if (gapYears == null) gapYears = 0;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getRollNo() { return rollNo; }
    public void setRollNo(String rollNo) { this.rollNo = rollNo; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public BigDecimal getCgpa() { return cgpa; }
    public void setCgpa(BigDecimal cgpa) { this.cgpa = cgpa; }

    public Integer getActiveBacklogs() { return activeBacklogs; }
    public void setActiveBacklogs(Integer activeBacklogs) { this.activeBacklogs = activeBacklogs; }

    public Integer getPassingYear() { return passingYear; }
    public void setPassingYear(Integer passingYear) { this.passingYear = passingYear; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getResumeUrl() { return resumeUrl; }
    public void setResumeUrl(String resumeUrl) { this.resumeUrl = resumeUrl; }

    public String getResumeFileName() { return resumeFileName; }
    public void setResumeFileName(String resumeFileName) { this.resumeFileName = resumeFileName; }

    public String getResumeOriginalName() { return resumeOriginalName; }
    public void setResumeOriginalName(String resumeOriginalName) { this.resumeOriginalName = resumeOriginalName; }

    public String getResumeMimeType() { return resumeMimeType; }
    public void setResumeMimeType(String resumeMimeType) { this.resumeMimeType = resumeMimeType; }

    public Long getResumeSize() { return resumeSize; }
    public void setResumeSize(Long resumeSize) { this.resumeSize = resumeSize; }

    public String getResumePath() { return resumePath; }
    public void setResumePath(String resumePath) { this.resumePath = resumePath; }

    public Instant getResumeUploadedAt() { return resumeUploadedAt; }
    public void setResumeUploadedAt(Instant resumeUploadedAt) { this.resumeUploadedAt = resumeUploadedAt; }

    public BigDecimal getTenthPercentage() { return tenthPercentage; }
    public void setTenthPercentage(BigDecimal tenthPercentage) { this.tenthPercentage = tenthPercentage; }

    public BigDecimal getTwelfthPercentage() { return twelfthPercentage; }
    public void setTwelfthPercentage(BigDecimal twelfthPercentage) { this.twelfthPercentage = twelfthPercentage; }

    public BigDecimal getDiplomaPercentage() { return diplomaPercentage; }
    public void setDiplomaPercentage(BigDecimal diplomaPercentage) { this.diplomaPercentage = diplomaPercentage; }

    public Integer getCurrentSemester() { return currentSemester; }
    public void setCurrentSemester(Integer currentSemester) { this.currentSemester = currentSemester; }

    public Integer getGapYears() { return gapYears; }
    public void setGapYears(Integer gapYears) { this.gapYears = gapYears; }

    public String getGithubLink() { return githubLink; }
    public void setGithubLink(String githubLink) { this.githubLink = githubLink; }

    public String getLinkedinLink() { return linkedinLink; }
    public void setLinkedinLink(String linkedinLink) { this.linkedinLink = linkedinLink; }

    public String getPortfolioLink() { return portfolioLink; }
    public void setPortfolioLink(String portfolioLink) { this.portfolioLink = portfolioLink; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public List<StudentSkill> getSkills() { return skills; }
    public void setSkills(List<StudentSkill> skills) { this.skills = skills; }

    public List<StudentProject> getProjects() { return projects; }
    public void setProjects(List<StudentProject> projects) { this.projects = projects; }

    public List<StudentCertification> getCertifications() { return certifications; }
    public void setCertifications(List<StudentCertification> certifications) { this.certifications = certifications; }
}
