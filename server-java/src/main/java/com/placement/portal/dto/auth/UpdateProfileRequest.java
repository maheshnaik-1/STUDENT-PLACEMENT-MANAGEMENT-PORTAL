package com.placement.portal.dto.auth;

import java.util.List;

public class UpdateProfileRequest {

    private String name;
    private String phone;
    private String resumeUrl;
    private String branch;
    private Object cgpa;
    private Object activeBacklogs;
    private Object passingYear;
    private Object skills;
    private AcademicDetailsDTO academicDetails;
    private LinksDTO links;
    private List<ProjectDTO> projects;
    private List<CertificationDTO> certifications;
    private String password;

    public UpdateProfileRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getResumeUrl() { return resumeUrl; }
    public void setResumeUrl(String resumeUrl) { this.resumeUrl = resumeUrl; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public Object getCgpa() { return cgpa; }
    public void setCgpa(Object cgpa) { this.cgpa = cgpa; }

    public Object getActiveBacklogs() { return activeBacklogs; }
    public void setActiveBacklogs(Object activeBacklogs) { this.activeBacklogs = activeBacklogs; }

    public Object getPassingYear() { return passingYear; }
    public void setPassingYear(Object passingYear) { this.passingYear = passingYear; }

    public Object getSkills() { return skills; }
    public void setSkills(Object skills) { this.skills = skills; }

    public AcademicDetailsDTO getAcademicDetails() { return academicDetails; }
    public void setAcademicDetails(AcademicDetailsDTO academicDetails) { this.academicDetails = academicDetails; }

    public LinksDTO getLinks() { return links; }
    public void setLinks(LinksDTO links) { this.links = links; }

    public List<ProjectDTO> getProjects() { return projects; }
    public void setProjects(List<ProjectDTO> projects) { this.projects = projects; }

    public List<CertificationDTO> getCertifications() { return certifications; }
    public void setCertifications(List<CertificationDTO> certifications) { this.certifications = certifications; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
