package com.placement.portal.dto.application;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class BulkStatusUpdateRequest {

    @NotNull(message = "Placement drive ID is required for bulk status updates")
    private Object driveId;

    @NotEmpty(message = "Please provide a non-empty list of application IDs to update")
    @Size(max = 100, message = "Bulk status update batch size cannot exceed 100 applications")
    private List<Object> applicationIds = new ArrayList<>();

    @NotBlank(message = "Status is required")
    private String status;

    private String remarks;

    public BulkStatusUpdateRequest() {}

    @JsonIgnore
    public Long getResolvedDriveId() {
        if (driveId == null) return null;
        if (driveId instanceof Number num) return num.longValue();
        if (driveId instanceof String str) {
            try {
                return Long.parseLong(str.trim());
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    @JsonIgnore
    public List<Long> getResolvedApplicationIds() {
        List<Long> result = new ArrayList<>();
        if (applicationIds == null) return result;
        for (Object item : applicationIds) {
            if (item instanceof Number num) {
                result.add(num.longValue());
            } else if (item instanceof String str) {
                try {
                    result.add(Long.parseLong(str.trim()));
                } catch (NumberFormatException ignored) {}
            }
        }
        return result;
    }

    public Object getDriveId() { return driveId; }
    public void setDriveId(Object driveId) { this.driveId = driveId; }

    public List<Object> getApplicationIds() { return applicationIds; }
    public void setApplicationIds(List<Object> applicationIds) { this.applicationIds = applicationIds; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
