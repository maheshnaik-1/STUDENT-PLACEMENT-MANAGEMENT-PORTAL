package com.placement.portal.security;

import com.placement.portal.PortalApplication;
import com.placement.portal.entity.User;
import com.placement.portal.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = PortalApplication.class)
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.autoconfigure.exclude=" +
        "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration," +
        "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration," +
        "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration",
    "jwt.secret=college_placement_portal_super_secret_key_2026",
    "jwt.expiration=604800000"
})
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private CompanyRepository companyRepository;

    @MockitoBean
    private PlacementDriveRepository placementDriveRepository;

    @MockitoBean
    private ApplicationRepository applicationRepository;

    @MockitoBean
    private ApplicationWithdrawalRepository applicationWithdrawalRepository;

    @MockitoBean
    private NotificationRepository notificationRepository;

    private String validStudentToken;
    private String validOfficerToken;

    @BeforeEach
    void setUp() {
        // Mock Student User (ID: 10)
        User studentUser = new User();
        studentUser.setId(10L);
        studentUser.setName("Arjun Kumar");
        studentUser.setEmail("arjun@college.edu");
        studentUser.setPassword("$2b$10$ep5.2Y60lX23/Dk1U881oODX1M6a7C0b11Z9.fH0b67e7Ea7E206G");
        studentUser.setRole("student");

        // Mock Officer User (ID: 20)
        User officerUser = new User();
        officerUser.setId(20L);
        officerUser.setName("Dr. Sharma");
        officerUser.setEmail("sharma@college.edu");
        officerUser.setPassword("$2b$10$ep5.2Y60lX23/Dk1U881oODX1M6a7C0b11Z9.fH0b67e7Ea7E206G");
        officerUser.setRole("officer");

        when(userRepository.findById(10L)).thenReturn(Optional.of(studentUser));
        when(userRepository.findByEmail("arjun@college.edu")).thenReturn(Optional.of(studentUser));

        when(userRepository.findById(20L)).thenReturn(Optional.of(officerUser));
        when(userRepository.findByEmail("sharma@college.edu")).thenReturn(Optional.of(officerUser));

        validStudentToken = tokenProvider.generateToken(10L, "arjun@college.edu", "student");
        validOfficerToken = tokenProvider.generateToken(20L, "sharma@college.edu", "officer");
    }

    @Test
    @DisplayName("1. Public endpoint /api/health allows unauthenticated access")
    void testPublicHealthEndpoint() throws Exception {
        mockMvc.perform(get("/api/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("online"))
            .andExpect(jsonPath("$.message").value("Placement Management Portal API is running smoothly"));
    }

    @Test
    @DisplayName("2. Public test endpoint /api/test/public allows unauthenticated access")
    void testPublicEndpoint() throws Exception {
        mockMvc.perform(get("/api/test/public"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").value("Public content accessible to everyone"));
    }

    @Test
    @DisplayName("3. Protected endpoint without token returns 401 Unauthorized with standardized JSON")
    void testProtectedEndpoint_WithoutToken() throws Exception {
        mockMvc.perform(get("/api/test/student"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Not authorized, token failed or expired"));
    }

    @Test
    @DisplayName("4. Protected endpoint with invalid token returns 401 Unauthorized with standardized JSON")
    void testProtectedEndpoint_WithInvalidToken() throws Exception {
        mockMvc.perform(get("/api/test/student")
                .header("Authorization", "Bearer invalid.tampered.token"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Not authorized, token failed or expired"));
    }

    @Test
    @DisplayName("5. Protected endpoint with expired token returns 401 Unauthorized with standardized JSON")
    void testProtectedEndpoint_WithExpiredToken() throws Exception {
        String expiredToken = tokenProvider.generateTokenWithExpiry(10L, "arjun@college.edu", "student", -10000);

        mockMvc.perform(get("/api/test/student")
                .header("Authorization", "Bearer " + expiredToken))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Not authorized, token failed or expired"));
    }

    @Test
    @DisplayName("6. Student protected endpoint with valid student token returns 200 OK")
    void testStudentEndpoint_WithValidStudentToken() throws Exception {
        mockMvc.perform(get("/api/test/student")
                .header("Authorization", "Bearer " + validStudentToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").value("Student protected content"));
    }

    @Test
    @DisplayName("7. Officer protected endpoint with student token returns 403 Forbidden with standardized JSON")
    void testOfficerEndpoint_WithStudentToken_Forbidden() throws Exception {
        mockMvc.perform(get("/api/test/officer")
                .header("Authorization", "Bearer " + validStudentToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Access denied. You are not authorized to access this resource."));
    }

    @Test
    @DisplayName("8. Officer protected endpoint with valid officer token returns 200 OK")
    void testOfficerEndpoint_WithValidOfficerToken() throws Exception {
        mockMvc.perform(get("/api/test/officer")
                .header("Authorization", "Bearer " + validOfficerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").value("Officer protected content"));
    }

    @Test
    @DisplayName("9. Global exception handler formats validation errors into standardized ApiResponse")
    void testGlobalExceptionHandler_ValidationErrors() throws Exception {
        mockMvc.perform(post("/api/test/validation")
                .header("Authorization", "Bearer " + validStudentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Field 'name' is required"));
    }

    @Test
    @DisplayName("10. Global exception handler formats internal errors into standardized ApiResponse")
    void testGlobalExceptionHandler_InternalErrors() throws Exception {
        mockMvc.perform(get("/api/test/error")
                .header("Authorization", "Bearer " + validStudentToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Test error thrown from controller"));
    }
}
