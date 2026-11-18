package com.placement.portal.dto.auth;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.placement.portal.entity.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponseDTO {

    private Long id;

    @JsonProperty("_id")
    private String _id;

    private String name;
    private String email;
    private String role;
    private String rollNo;
    private String branch;
    private BigDecimal cgpa;
    private Integer activeBacklogs;
    private Integer passingYear;
    private String phone;
    private List<String> skills = new ArrayList<>();
    private String resumeUrl;
    private ResumeFileDTO resumeFile;
    private AcademicDetailsDTO academicDetails;
    private LinksDTO links;
    private List<ProjectDTO> projects = new ArrayList<>();
    private List<CertificationDTO> certifications = new ArrayList<>();
    private Instant createdAt;
    private Instant updatedAt;

    public UserResponseDTO() {}

    public static UserResponseDTO fromEntity(User user) {
        if (user == null) return null;
        UserResponseDTO dto = new UserResponseDTO();
        dto.setId(user.getId());
        dto.set_id(user.getId() != null ? String.valueOf(user.getId()) : null);
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setRollNo(user.getRollNo());
        dto.setBranch(user.getBranch() != null ? user.getBranch() : "CSE");
        dto.setCgpa(user.getCgpa());
        dto.setActiveBacklogs(user.getActiveBacklogs() != null ? user.getActiveBacklogs() : 0);
        dto.setPassingYear(user.getPassingYear() != null ? user.getPassingYear() : 2026);
        dto.setPhone(user.getPhone() != null ? user.getPhone() : "");
        dto.setResumeUrl(user.getResumeUrl() != null ? user.getResumeUrl() : "");

        // Skills (List of String)
        List<String> skillList = new ArrayList<>();
        if (user.getSkills() != null) {
            for (StudentSkill s : user.getSkills()) {
                if (s.getSkill() != null && !s.getSkill().isBlank()) {
                    skillList.add(s.getSkill());
                }
            }
        }
        dto.setSkills(skillList);

        // ResumeFile
        ResumeFileDTO rf = new ResumeFileDTO(
            user.getResumeFileName(),
            user.getResumeOriginalName(),
            user.getResumeMimeType(),
            user.getResumeSize(),
            user.getResumePath(),
            user.getResumeUploadedAt()
        );
        dto.setResumeFile(rf);

        // AcademicDetails
        AcademicDetailsDTO ad = new AcademicDetailsDTO();
        ad.setTenthPercentage(user.getTenthPercentage());
        ad.setTwelfthPercentage(user.getTwelfthPercentage());
        ad.setDiplomaPercentage(user.getDiplomaPercentage());
        ad.setCurrentSemester(user.getCurrentSemester());
        ad.setGapYears(user.getGapYears() != null ? user.getGapYears() : 0);
        dto.setAcademicDetails(ad);

        // Links
        LinksDTO links = new LinksDTO(
            user.getGithubLink() != null ? user.getGithubLink() : "",
            user.getLinkedinLink() != null ? user.getLinkedinLink() : "",
            user.getPortfolioLink() != null ? user.getPortfolioLink() : ""
        );
        dto.setLinks(links);

        // Projects
        List<ProjectDTO> projectDTOs = new ArrayList<>();
        if (user.getProjects() != null) {
            for (StudentProject p : user.getProjects()) {
                ProjectDTO pDto = new ProjectDTO();
                pDto.setId(p.getId());
                pDto.setTitle(p.getTitle() != null ? p.getTitle() : "");
                pDto.setDescription(p.getDescription() != null ? p.getDescription() : "");
                pDto.setLink(p.getLink() != null ? p.getLink() : "");
                List<String> stack = new ArrayList<>();
                if (p.getTechStacks() != null) {
                    for (StudentProjectTechStack ts : p.getTechStacks()) {
                        if (ts.getTech() != null && !ts.getTech().isBlank()) {
                            stack.add(ts.getTech());
                        }
                    }
                }
                pDto.setTechStack(stack);
                projectDTOs.add(pDto);
            }
        }
        dto.setProjects(projectDTOs);

        // Certifications
        List<CertificationDTO> certDTOs = new ArrayList<>();
        if (user.getCertifications() != null) {
            for (StudentCertification c : user.getCertifications()) {
                CertificationDTO cDto = new CertificationDTO();
                cDto.setId(c.getId());
                cDto.setName(c.getName() != null ? c.getName() : "");
                cDto.setIssuer(c.getIssuer() != null ? c.getIssuer() : "");
                cDto.setIssueDate(c.getIssueDate() != null ? c.getIssueDate() : "");
                cDto.setCertificateUrl(c.getCertificateUrl() != null ? c.getCertificateUrl() : "");
                certDTOs.add(cDto);
            }
        }
        dto.setCertifications(certDTOs);

        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) {
        this.id = id;
        if (id != null) {
            this._id = String.valueOf(id);
        }
    }

    public String get_id() { return _id; }
    public void set_id(String _id) { this._id = _id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

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

    public List<String> getSkills() { return skills; }
    public void setSkills(List<String> skills) { this.skills = skills; }

    public String getResumeUrl() { return resumeUrl; }
    public void setResumeUrl(String resumeUrl) { this.resumeUrl = resumeUrl; }

    public ResumeFileDTO getResumeFile() { return resumeFile; }
    public void setResumeFile(ResumeFileDTO resumeFile) { this.resumeFile = resumeFile; }

    public AcademicDetailsDTO getAcademicDetails() { return academicDetails; }
    public void setAcademicDetails(AcademicDetailsDTO academicDetails) { this.academicDetails = academicDetails; }

    public LinksDTO getLinks() { return links; }
    public void setLinks(LinksDTO links) { this.links = links; }

    public List<ProjectDTO> getProjects() { return projects; }
    public void setProjects(List<ProjectDTO> projects) { this.projects = projects; }

    public List<CertificationDTO> getCertifications() { return certifications; }
    public void setCertifications(List<CertificationDTO> certifications) { this.certifications = certifications; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
