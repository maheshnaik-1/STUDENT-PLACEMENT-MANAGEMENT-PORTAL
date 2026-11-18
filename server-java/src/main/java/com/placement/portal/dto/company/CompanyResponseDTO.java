package com.placement.portal.dto.company;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.placement.portal.entity.Company;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class CompanyResponseDTO {

    private Long id;
    private String _id;
    private String name;
    private String industry;
    private String website;
    private String location;
    private String description;
    private String contactEmail;
    private String contactPerson;
    private String logoUrl;
    private Instant createdAt;
    private Instant updatedAt;
    private Long totalDrives;
    private Long activeDrives;

    public CompanyResponseDTO() {}

    public static CompanyResponseDTO fromEntity(Company company) {
        return fromEntity(company, null, null);
    }

    public static CompanyResponseDTO fromEntity(Company company, Long totalDrives, Long activeDrives) {
        if (company == null) return null;
        CompanyResponseDTO dto = new CompanyResponseDTO();
        dto.setId(company.getId());
        dto.set_id(company.getId() != null ? company.getId().toString() : null);
        dto.setName(company.getName());
        dto.setIndustry(company.getIndustry());
        dto.setWebsite(company.getWebsite() != null ? company.getWebsite() : "");
        dto.setLocation(company.getLocation());
        dto.setDescription(company.getDescription());
        dto.setContactEmail(company.getContactEmail() != null ? company.getContactEmail() : "");
        dto.setContactPerson(company.getContactPerson() != null ? company.getContactPerson() : "");
        dto.setLogoUrl(company.getLogoUrl() != null ? company.getLogoUrl() : "");
        dto.setCreatedAt(company.getCreatedAt());
        dto.setUpdatedAt(company.getUpdatedAt());
        dto.setTotalDrives(totalDrives);
        dto.setActiveDrives(activeDrives);
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String get_id() { return _id; }
    public void set_id(String _id) { this._id = _id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }

    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Long getTotalDrives() { return totalDrives; }
    public void setTotalDrives(Long totalDrives) { this.totalDrives = totalDrives; }

    public Long getActiveDrives() { return activeDrives; }
    public void setActiveDrives(Long activeDrives) { this.activeDrives = activeDrives; }
}
