package com.placement.portal.dto.application;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StatusHistoryDTO {

    private String status;
    private String remarks;
    private String changedBy;
    private Instant changedAt;

    public StatusHistoryDTO() {}

    public StatusHistoryDTO(String status, String remarks, String changedBy, Instant changedAt) {
        this.status = status;
        this.remarks = remarks;
        this.changedBy = changedBy;
        this.changedAt = changedAt;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }

    public Instant getChangedAt() { return changedAt; }
    public void setChangedAt(Instant changedAt) { this.changedAt = changedAt; }
}
