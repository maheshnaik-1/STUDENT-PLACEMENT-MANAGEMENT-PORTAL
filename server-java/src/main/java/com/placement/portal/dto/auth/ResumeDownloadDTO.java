package com.placement.portal.dto.auth;

import org.springframework.core.io.Resource;

public class ResumeDownloadDTO {
    private final Resource resource;
    private final String originalName;
    private final String mimeType;

    public ResumeDownloadDTO(Resource resource, String originalName, String mimeType) {
        this.resource = resource;
        this.originalName = originalName;
        this.mimeType = mimeType;
    }

    public Resource getResource() { return resource; }
    public String getOriginalName() { return originalName; }
    public String getMimeType() { return mimeType; }
}
