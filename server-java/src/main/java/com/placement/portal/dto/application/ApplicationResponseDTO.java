package com.placement.portal.dto.application;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.placement.portal.dto.auth.UserResponseDTO;
import com.placement.portal.dto.drive.DriveResponseDTO;
import com.placement.portal.entity.Application;
import com.placement.portal.entity.ApplicationStatusHistory;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApplicationResponseDTO {

    private Long id;
    private String _id;
    private DriveResponseDTO drive;
    private UserResponseDTO student;
    private Instant appliedAt;
    private String status;
    private String remarks;
    private Instant createdAt;
    private Instant updatedAt;
    private List<StatusHistoryDTO> statusHistory = new ArrayList<>();

    public ApplicationResponseDTO() {}

    public static ApplicationResponseDTO fromEntity(Application entity) {
        if (entity == null) return null;

        ApplicationResponseDTO dto = new ApplicationResponseDTO();
        dto.setId(entity.getId());
        dto.set_id(entity.getId() != null ? entity.getId().toString() : null);
        dto.setAppliedAt(entity.getAppliedAt());
        dto.setStatus(entity.getStatus());
        dto.setRemarks(entity.getRemarks());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());

        if (entity.getDrive() != null) {
            dto.setDrive(DriveResponseDTO.fromEntity(entity.getDrive()));
        }

        if (entity.getStudent() != null) {
            dto.setStudent(UserResponseDTO.fromEntity(entity.getStudent()));
        }

        if (entity.getStatusHistory() != null) {
            List<StatusHistoryDTO> history = new ArrayList<>();
            for (ApplicationStatusHistory h : entity.getStatusHistory()) {
                String changedByName = h.getChangedBy() != null ? h.getChangedBy().getName() : "System";
                history.add(new StatusHistoryDTO(h.getStatus(), h.getRemarks(), changedByName, h.getChangedAt()));
            }
            dto.setStatusHistory(history);
        }

        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String get_id() { return _id; }
    public void set_id(String _id) { this._id = _id; }

    public DriveResponseDTO getDrive() { return drive; }
    public void setDrive(DriveResponseDTO drive) { this.drive = drive; }

    public UserResponseDTO getStudent() { return student; }
    public void setStudent(UserResponseDTO student) { this.student = student; }

    public Instant getAppliedAt() { return appliedAt; }
    public void setAppliedAt(Instant appliedAt) { this.appliedAt = appliedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public List<StatusHistoryDTO> getStatusHistory() { return statusHistory; }
    public void setStatusHistory(List<StatusHistoryDTO> statusHistory) { this.statusHistory = statusHistory; }
}
