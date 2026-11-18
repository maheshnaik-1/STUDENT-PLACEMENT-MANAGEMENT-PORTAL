package com.placement.portal.controller;

import com.placement.portal.PortalApplication;
import com.placement.portal.entity.*;
import com.placement.portal.repository.*;
import com.placement.portal.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = PortalApplication.class)
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration",
    "jwt.secret=test_secure_jwt_signing_key_for_unit_tests_at_least_32_chars!"
})
class StudentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private ApplicationRepository applicationRepository;

    @MockitoBean
    private CompanyRepository companyRepository;

    @MockitoBean
    private PlacementDriveRepository placementDriveRepository;

    @MockitoBean
    private ApplicationWithdrawalRepository applicationWithdrawalRepository;

    @MockitoBean
    private NotificationRepository notificationRepository;

    private User officerUser;
    private User studentUser;
    private String officerToken;
    private String studentToken;

    @BeforeEach
    void setUp() {
        officerUser = new User();
        officerUser.setId(10L);
        officerUser.setName("Placement Officer");
        officerUser.setEmail("officer@example.com");
        officerUser.setRole("officer");

        studentUser = new User();
        studentUser.setId(20L);
        studentUser.setName("Rahul Sharma");
        studentUser.setEmail("rahul@example.com");
        studentUser.setRole("student");
        studentUser.setRollNo("CSE2026-001");
        studentUser.setBranch("CSE");
        studentUser.setCgpa(new BigDecimal("8.50"));
        studentUser.setPassingYear(2026);
        studentUser.setActiveBacklogs(0);

        when(userRepository.findById(10L)).thenReturn(Optional.of(officerUser));
        when(userRepository.findById(20L)).thenReturn(Optional.of(studentUser));
        when(userRepository.findByEmail("officer@example.com")).thenReturn(Optional.of(officerUser));
        when(userRepository.findByEmail("rahul@example.com")).thenReturn(Optional.of(studentUser));

        officerToken = jwtTokenProvider.generateToken(10L, "officer@example.com", "officer");
        studentToken = jwtTokenProvider.generateToken(20L, "rahul@example.com", "student");
    }

    @Test
    @DisplayName("GET /api/students as officer returns 200 with student list and stats")
    void testGetAllStudents_AsOfficer_Success() throws Exception {
        when(userRepository.findStudentsFiltered(null, null, null)).thenReturn(List.of(studentUser));
        when(applicationRepository.findByStudentId(20L)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/students")
                .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.data[0].id").value(20))
                .andExpect(jsonPath("$.data[0]._id").value("20"))
                .andExpect(jsonPath("$.data[0].name").value("Rahul Sharma"))
                .andExpect(jsonPath("$.data[0].branch").value("CSE"))
                .andExpect(jsonPath("$.data[0].totalApplications").value(0))
                .andExpect(jsonPath("$.data[0].placementStatus").value("Not Applied"));
    }

    @Test
    @DisplayName("GET /api/students as student returns 403 Forbidden")
    void testGetAllStudents_AsStudent_Forbidden() throws Exception {
        mockMvc.perform(get("/api/students")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/students unauthenticated returns 401 Unauthorized")
    void testGetAllStudents_Unauthenticated_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/students"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/students with branch and search query parameters passes to repository")
    void testGetAllStudents_WithFilters_Success() throws Exception {
        when(userRepository.findStudentsFiltered(eq("CSE"), isNull(), eq("Rahul"))).thenReturn(List.of(studentUser));
        when(applicationRepository.findByStudentId(20L)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/students?branch=CSE&search=Rahul")
                .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.data[0].name").value("Rahul Sharma"));
    }

    @Test
    @DisplayName("GET /api/students with placed application reflects Placed placementStatus")
    void testGetAllStudents_PlacedStatus_Success() throws Exception {
        Company comp = new Company();
        comp.setId(100L);
        comp.setName("Google");

        PlacementDrive drive = new PlacementDrive();
        drive.setId(50L);
        drive.setCompany(comp);

        Application app = new Application();
        app.setId(1L);
        app.setStudent(studentUser);
        app.setDrive(drive);
        app.setStatus("Selected");
        app.setAppliedAt(Instant.now());

        when(userRepository.findStudentsFiltered(null, null, null)).thenReturn(List.of(studentUser));
        when(applicationRepository.findByStudentId(20L)).thenReturn(List.of(app));

        mockMvc.perform(get("/api/students")
                .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].totalApplications").value(1))
                .andExpect(jsonPath("$.data[0].placementStatus").value("Placed at Google"))
                .andExpect(jsonPath("$.data[0].selectedOffer.id").value(1));
    }

    @Test
    @DisplayName("GET /api/students/{id} as officer returns 200 with student profile and applications")
    void testGetStudentById_AsOfficer_Success() throws Exception {
        when(userRepository.findByIdAndRole(20L, "student")).thenReturn(Optional.of(studentUser));
        when(applicationRepository.findByStudentIdOrderByAppliedAtDesc(20L)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/students/20")
                .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(20))
                .andExpect(jsonPath("$.data._id").value("20"))
                .andExpect(jsonPath("$.data.name").value("Rahul Sharma"))
                .andExpect(jsonPath("$.data.applications").isArray());
    }

    @Test
    @DisplayName("GET /api/students/{id} for non-existent student returns 404 Not Found")
    void testGetStudentById_NotFound() throws Exception {
        when(userRepository.findByIdAndRole(999L, "student")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/students/999")
                .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/students/{id} as student returns 403 Forbidden")
    void testGetStudentById_AsStudent_Forbidden() throws Exception {
        mockMvc.perform(get("/api/students/20")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }
}

