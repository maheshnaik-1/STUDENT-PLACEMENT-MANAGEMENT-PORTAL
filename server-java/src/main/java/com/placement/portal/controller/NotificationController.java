package com.placement.portal.controller;

import com.placement.portal.dto.ApiResponse;
import com.placement.portal.dto.notification.NotificationPageResponseDTO;
import com.placement.portal.dto.notification.NotificationResponseDTO;
import com.placement.portal.dto.notification.UnreadCountResponseDTO;
import com.placement.portal.security.UserPrincipal;
import com.placement.portal.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<NotificationPageResponseDTO> getUserNotifications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(value = "limit", defaultValue = "50") int limit,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "isRead", required = false) Boolean isRead,
            @RequestParam(value = "type", required = false) String type) {
        NotificationPageResponseDTO response = notificationService.getUserNotifications(
                principal.getId(), limit, page, isRead, type);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponseDTO> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {
        UnreadCountResponseDTO response = notificationService.getUnreadCount(principal.getId());
        return ResponseEntity.ok(response);
    }

    @RequestMapping(value = "/{id}/read", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<ApiResponse<NotificationResponseDTO>> markNotificationAsRead(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        NotificationResponseDTO dto = notificationService.markAsRead(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Notification marked as read", dto));
    }

    @RequestMapping(value = "/read-all", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<Map<String, Object>> markAllNotificationsAsRead(
            @AuthenticationPrincipal UserPrincipal principal) {
        int modifiedCount = notificationService.markAllAsRead(principal.getId());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "All notifications marked as read");
        response.put("modifiedCount", modifiedCount);
        return ResponseEntity.ok(response);
    }
}
