package com.placement.portal.dto.notification;

public class UnreadCountResponseDTO {

    private boolean success = true;
    private long count;

    public UnreadCountResponseDTO() {}

    public UnreadCountResponseDTO(long count) {
        this.success = true;
        this.count = count;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }
}
