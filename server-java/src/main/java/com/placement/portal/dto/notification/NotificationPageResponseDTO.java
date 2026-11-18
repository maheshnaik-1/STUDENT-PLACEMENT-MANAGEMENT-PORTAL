package com.placement.portal.dto.notification;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class NotificationPageResponseDTO {

    private boolean success = true;
    private int count;
    private long total;
    private long unreadCount;
    private int page;
    private int pages;
    private List<NotificationResponseDTO> data = new ArrayList<>();

    public NotificationPageResponseDTO() {}

    public NotificationPageResponseDTO(List<NotificationResponseDTO> data, long total, long unreadCount, int page, int limit) {
        this.success = true;
        this.data = data != null ? data : new ArrayList<>();
        this.count = this.data.size();
        this.total = total;
        this.unreadCount = unreadCount;
        this.page = page;
        this.pages = limit > 0 ? (int) Math.ceil((double) total / limit) : 1;
        if (this.pages <= 0) this.pages = 1;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }

    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }

    public long getUnreadCount() { return unreadCount; }
    public void setUnreadCount(long unreadCount) { this.unreadCount = unreadCount; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public int getPages() { return pages; }
    public void setPages(int pages) { this.pages = pages; }

    public List<NotificationResponseDTO> getData() { return data; }
    public void setData(List<NotificationResponseDTO> data) {
        this.data = data != null ? data : new ArrayList<>();
        this.count = this.data.size();
    }
}
