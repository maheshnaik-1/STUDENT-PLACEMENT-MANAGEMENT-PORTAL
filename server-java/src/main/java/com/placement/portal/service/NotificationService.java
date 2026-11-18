package com.placement.portal.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.placement.portal.dto.notification.NotificationPageResponseDTO;
import com.placement.portal.dto.notification.NotificationResponseDTO;
import com.placement.portal.dto.notification.UnreadCountResponseDTO;
import com.placement.portal.entity.Notification;
import com.placement.portal.entity.User;
import com.placement.portal.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    public NotificationService(NotificationRepository notificationRepository, ObjectMapper objectMapper) {
        this.notificationRepository = notificationRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Notification createNotification(User recipient, String role, String title, String message,
                                           String type, Long relatedEntityId, String relatedEntityType,
                                           String link, Map<String, Object> metadata) {
        if (recipient == null || title == null || title.trim().isEmpty() || message == null || message.trim().isEmpty()) {
            log.warn("[Notification] Missing required fields for notification creation");
            return null;
        }

        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setRole(role != null ? role : "student");
        notification.setTitle(title.trim());
        notification.setMessage(message.trim());
        notification.setType(type != null ? type : "SYSTEM");
        notification.setRelatedEntityId(relatedEntityId);
        notification.setRelatedEntityType(relatedEntityType);
        notification.setLink(link);
        notification.setIsRead(false);

        if (metadata != null && !metadata.isEmpty()) {
            try {
                notification.setMetadataJson(objectMapper.writeValueAsString(metadata));
            } catch (JsonProcessingException e) {
                log.warn("[Notification] Failed to serialize metadata: {}", e.getMessage());
            }
        }

        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public NotificationPageResponseDTO getUserNotifications(Long userId, int limit, int page, Boolean isRead, String type) {
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        int safePage = Math.max(page, 1);
        Pageable pageable = PageRequest.of(safePage - 1, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Notification> pageResult;
        long totalCount;
        boolean hasType = (type != null && !type.trim().isEmpty() && !type.equalsIgnoreCase("ALL"));

        if (isRead != null && hasType) {
            pageResult = notificationRepository.findByRecipientIdAndIsReadAndType(userId, isRead, type.trim(), pageable);
            totalCount = notificationRepository.countByRecipientIdAndIsReadAndType(userId, isRead, type.trim());
        } else if (isRead != null) {
            pageResult = notificationRepository.findByRecipientIdAndIsRead(userId, isRead, pageable);
            totalCount = notificationRepository.countByRecipientIdAndIsRead(userId, isRead);
        } else if (hasType) {
            pageResult = notificationRepository.findByRecipientIdAndType(userId, type.trim(), pageable);
            totalCount = notificationRepository.countByRecipientIdAndType(userId, type.trim());
        } else {
            pageResult = notificationRepository.findByRecipientId(userId, pageable);
            totalCount = notificationRepository.countByRecipientId(userId);
        }

        long unreadCount = notificationRepository.countByRecipientIdAndIsReadFalse(userId);

        List<NotificationResponseDTO> dtoList = new ArrayList<>();
        for (Notification n : pageResult.getContent()) {
            dtoList.add(NotificationResponseDTO.fromEntity(n, objectMapper));
        }

        return new NotificationPageResponseDTO(dtoList, totalCount, unreadCount, safePage, safeLimit);
    }

    @Transactional(readOnly = true)
    public UnreadCountResponseDTO getUnreadCount(Long userId) {
        long count = notificationRepository.countByRecipientIdAndIsReadFalse(userId);
        return new UnreadCountResponseDTO(count);
    }

    @Transactional
    public NotificationResponseDTO markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findByIdAndRecipientId(notificationId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found or access denied"));

        if (!Boolean.TRUE.equals(notification.getIsRead())) {
            notification.setIsRead(true);
            notification.setReadAt(Instant.now());
            notification = notificationRepository.save(notification);
        }

        return NotificationResponseDTO.fromEntity(notification, objectMapper);
    }

    @Transactional
    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllAsReadByRecipientId(userId, Instant.now());
    }
}
