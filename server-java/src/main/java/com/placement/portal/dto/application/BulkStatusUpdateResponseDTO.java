package com.placement.portal.dto.application;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class BulkStatusUpdateResponseDTO {

    private int updatedCount;
    private int skippedCount;
    private int terminalSkippedCount;
    private BulkDetails data;

    public BulkStatusUpdateResponseDTO() {
        this.data = new BulkDetails();
    }

    public BulkStatusUpdateResponseDTO(int updatedCount, int skippedCount, int terminalSkippedCount, List<Map<String, Object>> updated, List<Map<String, Object>> skipped) {
        this.updatedCount = updatedCount;
        this.skippedCount = skippedCount;
        this.terminalSkippedCount = terminalSkippedCount;
        this.data = new BulkDetails(updated, skipped);
    }

    public int getUpdatedCount() { return updatedCount; }
    public void setUpdatedCount(int updatedCount) { this.updatedCount = updatedCount; }

    public int getSkippedCount() { return skippedCount; }
    public void setSkippedCount(int skippedCount) { this.skippedCount = skippedCount; }

    public int getTerminalSkippedCount() { return terminalSkippedCount; }
    public void setTerminalSkippedCount(int terminalSkippedCount) { this.terminalSkippedCount = terminalSkippedCount; }

    public BulkDetails getData() { return data; }
    public void setData(BulkDetails data) { this.data = data; }

    public static class BulkDetails {
        private List<Map<String, Object>> updated = new ArrayList<>();
        private List<Map<String, Object>> skipped = new ArrayList<>();

        public BulkDetails() {}
        public BulkDetails(List<Map<String, Object>> updated, List<Map<String, Object>> skipped) {
            this.updated = updated != null ? updated : new ArrayList<>();
            this.skipped = skipped != null ? skipped : new ArrayList<>();
        }

        public List<Map<String, Object>> getUpdated() { return updated; }
        public void setUpdated(List<Map<String, Object>> updated) { this.updated = updated; }

        public List<Map<String, Object>> getSkipped() { return skipped; }
        public void setSkipped(List<Map<String, Object>> skipped) { this.skipped = skipped; }
    }
}
