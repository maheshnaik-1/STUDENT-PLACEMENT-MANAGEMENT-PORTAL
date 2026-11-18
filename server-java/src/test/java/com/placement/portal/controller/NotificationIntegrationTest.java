package com.placement.portal.controller;

import com.placement.portal.PortalApplication;
import com.placement.portal.entity.Notification;
import com.placement.portal.entity.User;
import com.placement.portal.repository.*;
import com.placement.portal.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = PortalApplication.class)
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.autoconfigure.exclude=" +
        "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration," +
        "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration," +
        "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration",
    "jwt.secret=test_secure_jwt_signing_key_for_unit_tests_at_least_32_chars!",
    "jwt.expiration=604800000",
    "placement.resume.upload-dir=target/test-resumes-mock",
    "resume.storage.path=target/test-resumes-mock",
    "resume.legacy.storage.path=target/test-legacy-mock"
})
class NotificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private NotificationRepository notificationRepository;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private ApplicationRepository applicationRepository;

    @MockitoBean
    private ApplicationWithdrawalRepository applicationWithdrawalRepository;

    @MockitoBean
    private PlacementDriveRepository placementDriveRepository;

    @MockitoBean
    private CompanyRepository companyRepository;

    private User studentUser;
    private User otherUser;
    private String studentToken;
    private String otherToken;
    private Notification mockNotification;

    @BeforeEach
    void setUp() {
        studentUser = new User();
        studentUser.setId(10L);
        studentUser.setName("Alice Student");
        studentUser.setEmail("alice@example.com");
        studentUser.setRole("student");

        otherUser = new User();
        otherUser.setId(20L);
        otherUser.setName("Bob Student");
        otherUser.setEmail("bob@example.com");
        otherUser.setRole("student");

        when(userRepository.findById(10L)).thenReturn(Optional.of(studentUser));
        when(userRepository.findById(20L)).thenReturn(Optional.of(otherUser));

        studentToken = jwtTokenProvider.generateToken(10L, "alice@example.com", "student");
        otherToken = jwtTokenProvider.generateToken(20L, "bob@example.com", "student");

        mockNotification = new Notification();
        mockNotification.setId(101L);
        mockNotification.setRecipient(studentUser);
        mockNotification.setRole("student");
        mockNotification.setTitle("Application Shortlisted");
        mockNotification.setMessage("Your application for Google has been shortlisted.");
        mockNotification.setType("SHORTLISTED");
        mockNotification.setLink("/student/applications");
        mockNotification.setIsRead(false);
        mockNotification.setCreatedAt(Instant.now());
        mockNotification.setUpdatedAt(Instant.now());
    }

    @Test
    @DisplayName("GET /api/notifications returns user's paginated notifications with count and unreadCount")
    void testGetUserNotifications_Success() throws Exception {
        when(notificationRepository.findByRecipientId(eq(10L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(mockNotification)));
        when(notificationRepository.countByRecipientId(10L)).thenReturn(1L);
        when(notificationRepository.countByRecipientIdAndIsReadFalse(10L)).thenReturn(1L);

        mockMvc.perform(get("/api/notifications")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.unreadCount").value(1))
                .andExpect(jsonPath("$.data[0].id").value(101))
                .andExpect(jsonPath("$.data[0]._id").value("101"))
                .andExpect(jsonPath("$.data[0].title").value("Application Shortlisted"))
                .andExpect(jsonPath("$.data[0].type").value("SHORTLISTED"))
                .andExpect(jsonPath("$.data[0].isRead").value(false));
    }

    @Test
    @DisplayName("GET /api/notifications/unread-count returns unread count")
    void testGetUnreadCount_Success() throws Exception {
        when(notificationRepository.countByRecipientIdAndIsReadFalse(10L)).thenReturn(4L);

        mockMvc.perform(get("/api/notifications/unread-count")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(4));
    }

    @Test
    @DisplayName("PUT /api/notifications/:id/read marks notification as read")
    void testMarkNotificationAsRead_Success() throws Exception {
        when(notificationRepository.findByIdAndRecipientId(101L, 10L)).thenReturn(Optional.of(mockNotification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(put("/api/notifications/101/read")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Notification marked as read"))
                .andExpect(jsonPath("$.data.isRead").value(true));

        verify(notificationRepository).save(mockNotification);
    }

    @Test
    @DisplayName("PATCH /api/notifications/:id/read works as alias for PUT")
    void testPatchNotificationAsRead_Success() throws Exception {
        when(notificationRepository.findByIdAndRecipientId(101L, 10L)).thenReturn(Optional.of(mockNotification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(patch("/api/notifications/101/read")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Notification marked as read"));
    }

    @Test
    @DisplayName("PUT /api/notifications/:id/read rejects non-recipient caller with 404")
    void testMarkNotificationAsRead_RecipientIsolation_NotFound() throws Exception {
        when(notificationRepository.findByIdAndRecipientId(101L, 20L)).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/notifications/101/read")
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Notification not found or access denied"));
    }

    @Test
    @DisplayName("PUT /api/notifications/read-all marks all notifications as read")
    void testMarkAllNotificationsAsRead_Success() throws Exception {
        when(notificationRepository.markAllAsReadByRecipientId(eq(10L), any(Instant.class))).thenReturn(3);

        mockMvc.perform(put("/api/notifications/read-all")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("All notifications marked as read"))
                .andExpect(jsonPath("$.modifiedCount").value(3));
    }

    @Test
    @DisplayName("GET /api/notifications rejects unauthenticated caller with 401")
    void testNotifications_Unauthenticated_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isUnauthorized());
    }
}
