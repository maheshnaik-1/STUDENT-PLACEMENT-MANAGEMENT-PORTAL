package com.placement.portal.dto.notification;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.placement.portal.entity.Notification;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class NotificationResponseDTO {

    private Long id;
    private String _id;
    private Object recipient;
    private String role;
    private String title;
    private String message;
    private String type;
    private Object relatedEntity;
    private String relatedEntityType;
    private String link;
    private Boolean isRead;
    private Instant readAt;
    private Map<String, Object> metadata = new HashMap<>();
    private Instant createdAt;
    private Instant updatedAt;

    public NotificationResponseDTO() {}

    @SuppressWarnings("unchecked")
    public static NotificationResponseDTO fromEntity(Notification entity, ObjectMapper objectMapper) {
        if (entity == null) return null;

        NotificationResponseDTO dto = new NotificationResponseDTO();
        dto.setId(entity.getId());
        dto.set_id(entity.getId() != null ? entity.getId().toString() : null);
        if (entity.getRecipient() != null) {
            dto.setRecipient(entity.getRecipient().getId());
        }
        dto.setRole(entity.getRole());
        dto.setTitle(entity.getTitle());
        dto.setMessage(entity.getMessage());
        dto.setType(entity.getType());
        dto.setRelatedEntity(entity.getRelatedEntityId());
        dto.setRelatedEntityType(entity.getRelatedEntityType());
        dto.setLink(entity.getLink());
        dto.setIsRead(entity.getIsRead());
        dto.setReadAt(entity.getReadAt());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());

        if (entity.getMetadataJson() != null && !entity.getMetadataJson().trim().isEmpty() && objectMapper != null) {
            try {
                dto.setMetadata(objectMapper.readValue(entity.getMetadataJson(), Map.class));
            } catch (JsonProcessingException ignored) {}
        }

        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String get_id() { return _id; }
    public void set_id(String _id) { this._id = _id; }

    public Object getRecipient() { return recipient; }
    public void setRecipient(Object recipient) { this.recipient = recipient; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Object getRelatedEntity() { return relatedEntity; }
    public void setRelatedEntity(Object relatedEntity) { this.relatedEntity = relatedEntity; }

    public String getRelatedEntityType() { return relatedEntityType; }
    public void setRelatedEntityType(String relatedEntityType) { this.relatedEntityType = relatedEntityType; }

    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }

    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }

    public Instant getReadAt() { return readAt; }
    public void setReadAt(Instant readAt) { this.readAt = readAt; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
