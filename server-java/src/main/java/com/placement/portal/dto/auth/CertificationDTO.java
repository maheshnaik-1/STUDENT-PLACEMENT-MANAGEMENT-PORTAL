package com.placement.portal.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CertificationDTO {
    private Long id;

    @JsonProperty("_id")
    private String _id;

    private String name;
    private String issuer;
    private String issueDate;
    private String certificateUrl;

    public CertificationDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) {
        this.id = id;
        if (id != null) {
            this._id = String.valueOf(id);
        }
    }

    public String get_id() { return _id; }
    public void set_id(String _id) { this._id = _id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }

    public String getIssueDate() { return issueDate; }
    public void setIssueDate(String issueDate) { this.issueDate = issueDate; }

    public String getCertificateUrl() { return certificateUrl; }
    public void setCertificateUrl(String certificateUrl) { this.certificateUrl = certificateUrl; }
}
