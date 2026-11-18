package com.placement.portal.dto.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

@JsonInclude(JsonInclude.Include.ALWAYS)
public class ResumeFileDTO {
    private String filename;
    private String originalName;
    private String mimeType;
    private Long size;

    @JsonIgnore
    private String path;

    private Instant uploadedAt;

    public ResumeFileDTO() {}

    public ResumeFileDTO(String filename, String originalName, String mimeType, Long size, String path, Instant uploadedAt) {
        this.filename = filename;
        this.originalName = originalName;
        this.mimeType = mimeType;
        this.size = size;
        this.path = path;
        this.uploadedAt = uploadedAt;
    }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public Long getSize() { return size; }
    public void setSize(Long size) { this.size = size; }

    @JsonIgnore
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public Instant getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(Instant uploadedAt) { this.uploadedAt = uploadedAt; }
}
