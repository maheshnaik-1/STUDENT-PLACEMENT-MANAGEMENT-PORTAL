package com.placement.portal.dto.student;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.placement.portal.dto.application.ApplicationResponseDTO;
import com.placement.portal.dto.auth.UserResponseDTO;
import com.placement.portal.entity.User;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudentSummaryDTO extends UserResponseDTO {

    private Integer totalApplications;
    private String placementStatus;
    private ApplicationResponseDTO selectedOffer;
    private List<ApplicationResponseDTO> applications;

    public StudentSummaryDTO() {
        super();
    }

    public static StudentSummaryDTO fromUser(User user, int totalApplications, String placementStatus, ApplicationResponseDTO selectedOffer) {
        UserResponseDTO base = UserResponseDTO.fromEntity(user);
        if (base == null) return null;
        StudentSummaryDTO dto = new StudentSummaryDTO();
        dto.copyFrom(base);
        dto.setTotalApplications(totalApplications);
        dto.setPlacementStatus(placementStatus);
        dto.setSelectedOffer(selectedOffer);
        return dto;
    }

    public static StudentSummaryDTO fromUserWithApplications(User user, List<ApplicationResponseDTO> applications) {
        UserResponseDTO base = UserResponseDTO.fromEntity(user);
        if (base == null) return null;
        StudentSummaryDTO dto = new StudentSummaryDTO();
        dto.copyFrom(base);
        dto.setApplications(applications);
        dto.setTotalApplications(applications != null ? applications.size() : 0);
        return dto;
    }

    private void copyFrom(UserResponseDTO base) {
        this.setId(base.getId());
        this.set_id(base.get_id());
        this.setName(base.getName());
        this.setEmail(base.getEmail());
        this.setRole(base.getRole());
        this.setRollNo(base.getRollNo());
        this.setBranch(base.getBranch());
        this.setCgpa(base.getCgpa());
        this.setActiveBacklogs(base.getActiveBacklogs());
        this.setPassingYear(base.getPassingYear());
        this.setPhone(base.getPhone());
        this.setResumeUrl(base.getResumeUrl());
        this.setSkills(base.getSkills());
        this.setResumeFile(base.getResumeFile());
        this.setAcademicDetails(base.getAcademicDetails());
        this.setLinks(base.getLinks());
        this.setProjects(base.getProjects());
        this.setCertifications(base.getCertifications());
        this.setCreatedAt(base.getCreatedAt());
        this.setUpdatedAt(base.getUpdatedAt());
    }

    public Integer getTotalApplications() {
        return totalApplications;
    }

    public void setTotalApplications(Integer totalApplications) {
        this.totalApplications = totalApplications;
    }

    public String getPlacementStatus() {
        return placementStatus;
    }

    public void setPlacementStatus(String placementStatus) {
        this.placementStatus = placementStatus;
    }

    public ApplicationResponseDTO getSelectedOffer() {
        return selectedOffer;
    }

    public void setSelectedOffer(ApplicationResponseDTO selectedOffer) {
        this.selectedOffer = selectedOffer;
    }

    public List<ApplicationResponseDTO> getApplications() {
        return applications;
    }

    public void setApplications(List<ApplicationResponseDTO> applications) {
        this.applications = applications;
    }
}

