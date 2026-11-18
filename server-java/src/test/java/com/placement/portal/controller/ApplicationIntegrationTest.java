package com.placement.portal.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.placement.portal.PortalApplication;
import com.placement.portal.dto.application.BulkStatusUpdateRequest;
import com.placement.portal.dto.application.StatusUpdateRequest;
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
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
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
class ApplicationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private ApplicationRepository applicationRepository;

    @MockitoBean
    private ApplicationWithdrawalRepository applicationWithdrawalRepository;

    @MockitoBean
    private PlacementDriveRepository placementDriveRepository;

    @MockitoBean
    private CompanyRepository companyRepository;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private NotificationRepository notificationRepository;

    private User studentUser;
    private User otherStudentUser;
    private User officerUser;
    private String studentToken;
    private String otherStudentToken;
    private String officerToken;

    private Company mockCompany;
    private PlacementDrive mockDrive;
    private Application mockApplication;

    @BeforeEach
    void setUp() {
        studentUser = new User();
        studentUser.setId(10L);
        studentUser.setName("Alice Student");
        studentUser.setEmail("alice@example.com");
        studentUser.setRole("student");
        studentUser.setBranch("CSE");
        studentUser.setCgpa(new BigDecimal("8.50"));
        studentUser.setActiveBacklogs(0);
        studentUser.setPassingYear(2026);
        studentUser.setSkills(List.of(
                new StudentSkill(studentUser, "Java"),
                new StudentSkill(studentUser, "Spring Boot"),
                new StudentSkill(studentUser, "MySQL")
        ));

        otherStudentUser = new User();
        otherStudentUser.setId(20L);
        otherStudentUser.setName("Bob Student");
        otherStudentUser.setEmail("bob@example.com");
        otherStudentUser.setRole("student");
        otherStudentUser.setBranch("MECH");
        otherStudentUser.setCgpa(new BigDecimal("5.50"));
        otherStudentUser.setActiveBacklogs(2);
        otherStudentUser.setPassingYear(2025);

        officerUser = new User();
        officerUser.setId(30L);
        officerUser.setName("Officer Sharma");
        officerUser.setEmail("officer@example.com");
        officerUser.setRole("officer");

        when(userRepository.findById(10L)).thenReturn(Optional.of(studentUser));
        when(userRepository.findById(20L)).thenReturn(Optional.of(otherStudentUser));
        when(userRepository.findById(30L)).thenReturn(Optional.of(officerUser));
        when(userRepository.findByRole("officer")).thenReturn(List.of(officerUser));

        studentToken = jwtTokenProvider.generateToken(10L, "alice@example.com", "student");
        otherStudentToken = jwtTokenProvider.generateToken(20L, "bob@example.com", "student");
        officerToken = jwtTokenProvider.generateToken(30L, "officer@example.com", "officer");

        mockCompany = new Company();
        mockCompany.setId(1L);
        mockCompany.setName("Google");
        mockCompany.setIndustry("Technology");
        mockCompany.setLocation("Bangalore");

        mockDrive = new PlacementDrive();
        mockDrive.setId(100L);
        mockDrive.setCompany(mockCompany);
        mockDrive.setTitle("Software Engineer");
        mockDrive.setJobRole("Backend Developer");
        mockDrive.setPackageCtc("24 LPA");
        mockDrive.setLocation("Bangalore");
        mockDrive.setMinCgpa(new BigDecimal("7.00"));
        mockDrive.setMaxBacklogs(0);
        mockDrive.setPassingYear(2026);
        mockDrive.setDeadline(Instant.now().plusSeconds(86400 * 5));
        mockDrive.setDriveDate(Instant.now().plusSeconds(86400 * 10));
        mockDrive.setStatus("Upcoming");
        mockDrive.getAllowedBranches().add(new DriveAllowedBranch(mockDrive, "CSE"));
        mockDrive.getAllowedBranches().add(new DriveAllowedBranch(mockDrive, "IT"));
        mockDrive.getRequiredSkills().add(new DriveRequiredSkill(mockDrive, "Java"));
        mockDrive.getRequiredSkills().add(new DriveRequiredSkill(mockDrive, "Spring Boot"));

        mockApplication = new Application();
        mockApplication.setId(500L);
        mockApplication.setDrive(mockDrive);
        mockApplication.setStudent(studentUser);
        mockApplication.setAppliedAt(Instant.now());
        mockApplication.setStatus("Applied");
        mockApplication.setRemarks("Application submitted successfully. Under review.");
        mockApplication.setCreatedAt(Instant.now());
        mockApplication.setUpdatedAt(Instant.now());
    }

    // --- 1. POST /api/applications/apply/:driveId ---

    @Test
    @DisplayName("POST /api/applications/apply/:driveId allows eligible student to apply successfully")
    void testApplyForDrive_Success() throws Exception {
        when(placementDriveRepository.findById(100L)).thenReturn(Optional.of(mockDrive));
        when(applicationRepository.findByDriveIdAndStudentId(100L, 10L)).thenReturn(Optional.empty());
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> {
            Application a = inv.getArgument(0);
            a.setId(500L);
            return a;
        });

        mockMvc.perform(post("/api/applications/apply/100")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Successfully applied to Google - Software Engineer!"))
                .andExpect(jsonPath("$.data.id").value(500))
                .andExpect(jsonPath("$.data._id").value("500"))
                .andExpect(jsonPath("$.data.status").value("Applied"));

        verify(applicationRepository).save(any(Application.class));
    }

    @Test
    @DisplayName("POST /api/applications/apply/:driveId rejects duplicate applications with 400")
    void testApplyForDrive_Duplicate_BadRequest() throws Exception {
        when(placementDriveRepository.findById(100L)).thenReturn(Optional.of(mockDrive));
        when(applicationRepository.findByDriveIdAndStudentId(100L, 10L)).thenReturn(Optional.of(mockApplication));

        mockMvc.perform(post("/api/applications/apply/100")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("You have already applied")));
    }

    @Test
    @DisplayName("POST /api/applications/apply/:driveId rejects application to closed drive with 400")
    void testApplyForDrive_ClosedDrive_BadRequest() throws Exception {
        mockDrive.setStatus("Completed");
        when(placementDriveRepository.findById(100L)).thenReturn(Optional.of(mockDrive));

        mockMvc.perform(post("/api/applications/apply/100")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Applications are closed. Drive status is 'Completed'."));
    }

    @Test
    @DisplayName("POST /api/applications/apply/:driveId rejects application after deadline with 400")
    void testApplyForDrive_DeadlinePassed_BadRequest() throws Exception {
        mockDrive.setDeadline(Instant.now().minusSeconds(3600));
        when(placementDriveRepository.findById(100L)).thenReturn(Optional.of(mockDrive));
        when(applicationRepository.findByDriveIdAndStudentId(100L, 10L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/applications/apply/100")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Submissions are closed.")));
    }

    @Test
    @DisplayName("POST /api/applications/apply/:driveId rejects academically ineligible student with 400 and reasons")
    void testApplyForDrive_IneligibleStudent_BadRequest() throws Exception {
        when(placementDriveRepository.findById(100L)).thenReturn(Optional.of(mockDrive));
        when(applicationRepository.findByDriveIdAndStudentId(100L, 20L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/applications/apply/100")
                        .header("Authorization", "Bearer " + otherStudentToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You are not eligible for this placement drive."))
                .andExpect(jsonPath("$.reasons").isArray());
    }

    @Test
    @DisplayName("POST /api/applications/apply/:driveId rejects Officer role with 403 Forbidden")
    void testApplyForDrive_OfficerRole_Forbidden() throws Exception {
        mockMvc.perform(post("/api/applications/apply/100")
                        .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isForbidden());
    }

    // --- 2. GET /api/applications/my-applications ---

    @Test
    @DisplayName("GET /api/applications/my-applications returns student's applications")
    void testGetMyApplications_Success() throws Exception {
        when(applicationRepository.findByStudentIdOrderByAppliedAtDesc(10L))
                .thenReturn(List.of(mockApplication));

        mockMvc.perform(get("/api/applications/my-applications")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.data[0].id").value(500))
                .andExpect(jsonPath("$.data[0].status").value("Applied"))
                .andExpect(jsonPath("$.data[0].drive.title").value("Software Engineer"));
    }

    // --- 3. DELETE /api/applications/:id/withdraw ---

    @Test
    @DisplayName("DELETE /api/applications/:id/withdraw allows student to withdraw own application in 'Applied' status")
    void testWithdrawApplication_Success() throws Exception {
        when(applicationRepository.findById(500L)).thenReturn(Optional.of(mockApplication));

        mockMvc.perform(delete("/api/applications/500/withdraw")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("successfully withdrawn")))
                .andExpect(jsonPath("$.data.applicationId").value(500));

        verify(applicationWithdrawalRepository).save(any(ApplicationWithdrawal.class));
        verify(applicationRepository).delete(mockApplication);
    }

    @Test
    @DisplayName("DELETE /api/applications/:id/withdraw rejects non-owner with 403 Forbidden")
    void testWithdrawApplication_NonOwner_Forbidden() throws Exception {
        when(applicationRepository.findById(500L)).thenReturn(Optional.of(mockApplication));

        mockMvc.perform(delete("/api/applications/500/withdraw")
                        .header("Authorization", "Bearer " + otherStudentToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Access denied. You can only withdraw your own applications."));
    }

    @Test
    @DisplayName("DELETE /api/applications/:id/withdraw rejects application already progressed past 'Applied' with 400")
    void testWithdrawApplication_AlreadyProgressed_BadRequest() throws Exception {
        mockApplication.setStatus("Shortlisted");
        when(applicationRepository.findById(500L)).thenReturn(Optional.of(mockApplication));

        mockMvc.perform(delete("/api/applications/500/withdraw")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Cannot withdraw application. Application has already progressed to 'Shortlisted' stage."));
    }

    // --- 4. Officer: GET /api/applications/drive/:driveId ---

    @Test
    @DisplayName("GET /api/applications/drive/:driveId allows Officer to review applicants")
    void testGetDriveApplicants_AsOfficer_Success() throws Exception {
        when(placementDriveRepository.findById(100L)).thenReturn(Optional.of(mockDrive));
        when(applicationRepository.findByDriveIdOrderByAppliedAtDesc(100L))
                .thenReturn(List.of(mockApplication));

        mockMvc.perform(get("/api/applications/drive/100")
                        .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.drive.id").value(100))
                .andExpect(jsonPath("$.data[0].id").value(500))
                .andExpect(jsonPath("$.data[0].student.name").value("Alice Student"));
    }

    @Test
    @DisplayName("GET /api/applications/drive/:driveId rejects Student with 403 Forbidden")
    void testGetDriveApplicants_AsStudent_Forbidden() throws Exception {
        mockMvc.perform(get("/api/applications/drive/100")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    // --- 5. Officer: GET /api/applications/drive/:driveId/match-scores ---

    @Test
    @DisplayName("GET /api/applications/drive/:driveId/match-scores returns skill match scores for applicants")
    void testGetDriveApplicantMatchScores_AsOfficer_Success() throws Exception {
        when(placementDriveRepository.findById(100L)).thenReturn(Optional.of(mockDrive));
        when(applicationRepository.findByDriveIdOrderByAppliedAtDesc(100L))
                .thenReturn(List.of(mockApplication));

        mockMvc.perform(get("/api/applications/drive/100/match-scores")
                        .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.driveId").value(100))
                .andExpect(jsonPath("$.data.totalApplicants").value(1))
                .andExpect(jsonPath("$.data.applicants[0].skillMatch.score").value(100))
                .andExpect(jsonPath("$.data.applicants[0].academicEligibility.isEligible").value(true));
    }

    // --- 6. Officer: PUT /api/applications/:id/status ---

    @Test
    @DisplayName("PUT /api/applications/:id/status updates status and records history")
    void testUpdateApplicationStatus_AsOfficer_Success() throws Exception {
        when(applicationRepository.findById(500L)).thenReturn(Optional.of(mockApplication));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        StatusUpdateRequest req = new StatusUpdateRequest("Shortlisted", "Cleared coding round");

        mockMvc.perform(put("/api/applications/500/status")
                        .header("Authorization", "Bearer " + officerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Applicant status updated to 'Shortlisted'"))
                .andExpect(jsonPath("$.data.status").value("Shortlisted"));
    }

    @Test
    @DisplayName("PUT /api/applications/:id/status rejects invalid status with 400")
    void testUpdateApplicationStatus_InvalidStatus_BadRequest() throws Exception {
        StatusUpdateRequest req = new StatusUpdateRequest("InvalidStatusName", "Remarks");

        mockMvc.perform(put("/api/applications/500/status")
                        .header("Authorization", "Bearer " + officerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // --- 7. Officer: PUT /api/applications/bulk-status ---

    @Test
    @DisplayName("PUT /api/applications/bulk-status skips terminal-state applications and updates eligible ones")
    void testBulkUpdateApplicationStatus_TerminalStateProtection() throws Exception {
        Application app1 = new Application();
        app1.setId(501L);
        app1.setDrive(mockDrive);
        app1.setStudent(studentUser);
        app1.setStatus("Applied");

        Application app2 = new Application();
        app2.setId(502L);
        app2.setDrive(mockDrive);
        app2.setStudent(otherStudentUser);
        app2.setStatus("Selected"); // Terminal state!

        when(placementDriveRepository.findById(100L)).thenReturn(Optional.of(mockDrive));
        when(applicationRepository.findByIdInAndDriveId(anyList(), eq(100L))).thenReturn(List.of(app1, app2));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        BulkStatusUpdateRequest req = new BulkStatusUpdateRequest();
        req.setDriveId(100L);
        req.setApplicationIds(List.of(501L, 502L));
        req.setStatus("Interview");
        req.setRemarks("Batch moving to Interview");

        mockMvc.perform(put("/api/applications/bulk-status")
                        .header("Authorization", "Bearer " + officerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.updatedCount").value(1))
                .andExpect(jsonPath("$.data.skippedCount").value(1))
                .andExpect(jsonPath("$.data.terminalSkippedCount").value(1));
    }

    // --- 8. Public / Summary Stats ---

    @Test
    @DisplayName("GET /api/applications/stats is public and returns complete stats without student application records")
    void testGetPlacementStats_Public_Success() throws Exception {
        when(companyRepository.count()).thenReturn(15L);
        when(placementDriveRepository.count()).thenReturn(25L);
        when(placementDriveRepository.countByStatusIn(List.of("Upcoming", "Ongoing"))).thenReturn(8L);
        when(userRepository.countByRole("student")).thenReturn(200L);
        when(applicationRepository.count()).thenReturn(450L);
        when(applicationRepository.countByStatus("Selected")).thenReturn(60L);

        mockMvc.perform(get("/api/applications/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalCompanies").value(15))
                .andExpect(jsonPath("$.data.totalDrives").value(25))
                .andExpect(jsonPath("$.data.activeDrives").value(8))
                .andExpect(jsonPath("$.data.totalStudents").value(200))
                .andExpect(jsonPath("$.data.totalApplications").value(450))
                .andExpect(jsonPath("$.data.totalSelected").value(60))
                .andExpect(jsonPath("$.data.recentApplications").isEmpty());
    }

    @Test
    @DisplayName("GET /api/applications/stats counts active drives across multiple companies without null company ID")
    void testGetPlacementStats_ActiveDrives_MultipleCompanies() throws Exception {
        when(placementDriveRepository.countByStatusIn(List.of("Upcoming", "Ongoing"))).thenReturn(7L);

        mockMvc.perform(get("/api/applications/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activeDrives").value(7));

        verify(placementDriveRepository).countByStatusIn(List.of("Upcoming", "Ongoing"));
        verify(placementDriveRepository, never()).countByCompanyIdAndStatusIn(isNull(), any());
    }

    @Test
    @DisplayName("GET /api/applications/stats populates companyHires grouped by company, sorted by hires descending with accurate package info")
    void testGetPlacementStats_CompanyHires_MultipleCompaniesAndPackages() throws Exception {
        Company google = new Company();
        google.setId(1L);
        google.setName("Google");

        Company microsoft = new Company();
        microsoft.setId(2L);
        microsoft.setName("Microsoft");

        Company amazon = new Company();
        amazon.setId(3L);
        amazon.setName("Amazon");

        PlacementDrive driveG1 = new PlacementDrive();
        driveG1.setId(101L);
        driveG1.setCompany(google);
        driveG1.setPackageCtc("20 LPA");

        PlacementDrive driveG2 = new PlacementDrive();
        driveG2.setId(102L);
        driveG2.setCompany(google);
        driveG2.setPackageCtc("25 LPA");

        PlacementDrive driveM1 = new PlacementDrive();
        driveM1.setId(201L);
        driveM1.setCompany(microsoft);
        driveM1.setPackageCtc("18 LPA");

        PlacementDrive driveA1 = new PlacementDrive();
        driveA1.setId(301L);
        driveA1.setCompany(amazon);
        driveA1.setPackageCtc("16 LPA");

        // Microsoft: 3 hires at 18 LPA
        Application mApp1 = new Application();
        mApp1.setId(1L);
        mApp1.setStatus("Selected");
        mApp1.setDrive(driveM1);

        Application mApp2 = new Application();
        mApp2.setId(2L);
        mApp2.setStatus("Selected");
        mApp2.setDrive(driveM1);

        Application mApp3 = new Application();
        mApp3.setId(3L);
        mApp3.setStatus("Selected");
        mApp3.setDrive(driveM1);

        // Google: 2 hires with different packages (20 LPA, 25 LPA)
        Application gApp1 = new Application();
        gApp1.setId(4L);
        gApp1.setStatus("Selected");
        gApp1.setDrive(driveG1);

        Application gApp2 = new Application();
        gApp2.setId(5L);
        gApp2.setStatus("Selected");
        gApp2.setDrive(driveG2);

        // Amazon: 1 hire at 16 LPA
        Application aApp1 = new Application();
        aApp1.setId(6L);
        aApp1.setStatus("Selected");
        aApp1.setDrive(driveA1);

        when(applicationRepository.findByStatus("Selected"))
                .thenReturn(List.of(gApp1, mApp1, gApp2, mApp2, aApp1, mApp3));

        mockMvc.perform(get("/api/applications/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.companyHires", hasSize(3)))
                // 1st: Microsoft with 3 hires
                .andExpect(jsonPath("$.data.companyHires[0]._id").value("Microsoft"))
                .andExpect(jsonPath("$.data.companyHires[0].hires").value(3))
                .andExpect(jsonPath("$.data.companyHires[0].package").value("18 LPA"))
                // 2nd: Google with 2 hires and multiple packages accurately represented
                .andExpect(jsonPath("$.data.companyHires[1]._id").value("Google"))
                .andExpect(jsonPath("$.data.companyHires[1].hires").value(2))
                .andExpect(jsonPath("$.data.companyHires[1].package").value("20 LPA, 25 LPA"))
                // 3rd: Amazon with 1 hire
                .andExpect(jsonPath("$.data.companyHires[2]._id").value("Amazon"))
                .andExpect(jsonPath("$.data.companyHires[2].hires").value(1))
                .andExpect(jsonPath("$.data.companyHires[2].package").value("16 LPA"));
    }

    @Test
    @DisplayName("GET /api/applications/stats limits companyHires to at most 10 companies")
    void testGetPlacementStats_CompanyHires_LimitTen() throws Exception {
        List<Application> selectedList = new ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            Company comp = new Company();
            comp.setId((long) i);
            comp.setName("Company " + String.format("%02d", i));

            PlacementDrive d = new PlacementDrive();
            d.setId((long) (1000 + i));
            d.setCompany(comp);
            d.setPackageCtc(i + " LPA");

            Application app = new Application();
            app.setId((long) (5000 + i));
            app.setStatus("Selected");
            app.setDrive(d);

            selectedList.add(app);
        }

        when(applicationRepository.findByStatus("Selected")).thenReturn(selectedList);

        mockMvc.perform(get("/api/applications/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.companyHires", hasSize(10)));
    }

    // --- 9. Officer Analytics ---

    @Test
    @DisplayName("GET /api/applications/analytics allows Officer and returns comprehensive analytics with funnel pipelineHealth and dual recentApplications schema")
    void testGetOfficerAnalytics_AsOfficer_Success() throws Exception {
        studentUser.setRollNo("CSE-001");
        when(placementDriveRepository.findAll()).thenReturn(List.of(mockDrive));
        when(userRepository.findByRole("student")).thenReturn(List.of(studentUser));
        when(applicationRepository.findAllByOrderByAppliedAtDesc()).thenReturn(List.of(mockApplication));

        mockMvc.perform(get("/api/applications/analytics")
                        .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.summary.totalApplications").value(1))
                .andExpect(jsonPath("$.data.availableFilters.branches").isArray())
                .andExpect(jsonPath("$.data.recentApplications", hasSize(1)))
                // Dual schema check for recentApplications
                .andExpect(jsonPath("$.data.recentApplications[0].student.name").value("Alice Student"))
                .andExpect(jsonPath("$.data.recentApplications[0].student.rollNo").value("CSE-001"))
                .andExpect(jsonPath("$.data.recentApplications[0].student.branch").value("CSE"))
                .andExpect(jsonPath("$.data.recentApplications[0].drive.company.name").value("Google"))
                .andExpect(jsonPath("$.data.recentApplications[0].studentName").value("Alice Student"))
                .andExpect(jsonPath("$.data.recentApplications[0].rollNo").value("CSE-001"))
                .andExpect(jsonPath("$.data.recentApplications[0].branch").value("CSE"))
                .andExpect(jsonPath("$.data.recentApplications[0].companyName").value("Google"))
                // Recruitment funnel stages and pipelineHealth check
                .andExpect(jsonPath("$.data.recruitmentFunnel.stages", hasSize(5)))
                .andExpect(jsonPath("$.data.recruitmentFunnel.pipelineHealth.totalApplications").value(1))
                .andExpect(jsonPath("$.data.recruitmentFunnel.pipelineHealth.activeInReview").value(1))
                .andExpect(jsonPath("$.data.recruitmentFunnel.pipelineHealth.offersExtended").value(0))
                .andExpect(jsonPath("$.data.recruitmentFunnel.pipelineHealth.rejected").value(0))
                .andExpect(jsonPath("$.data.recruitmentFunnel.pipelineHealth.overallConversionRate").value(0.0));
    }

    @Test
    @DisplayName("GET /api/applications/analytics limits recentApplications to at most six records")
    void testGetOfficerAnalytics_RecentApplications_MaxSix() throws Exception {
        List<Application> eightApps = new ArrayList<>();
        for (int i = 1; i <= 8; i++) {
            Application a = new Application();
            a.setId((long) i);
            a.setDrive(mockDrive);
            a.setStudent(studentUser);
            a.setStatus("Applied");
            a.setAppliedAt(Instant.now());
            eightApps.add(a);
        }

        when(placementDriveRepository.findAll()).thenReturn(List.of(mockDrive));
        when(userRepository.findByRole("student")).thenReturn(List.of(studentUser));
        when(applicationRepository.findAllByOrderByAppliedAtDesc()).thenReturn(eightApps);

        mockMvc.perform(get("/api/applications/analytics")
                        .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.recentApplications", hasSize(6)))
                .andExpect(jsonPath("$.data.recentApplications[0].student.name").value("Alice Student"))
                .andExpect(jsonPath("$.data.recentApplications[0].drive.title").value("Software Engineer"));
    }

    @Test
    @DisplayName("GET /api/applications/analytics rejects Student with 403 Forbidden")
    void testGetOfficerAnalytics_AsStudent_Forbidden() throws Exception {
        mockMvc.perform(get("/api/applications/analytics")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/applications/analytics populates driveAnalytics with per-drive application and selection metrics")
    void testGetOfficerAnalytics_PopulatesDriveAnalytics_Success() throws Exception {
        Application selectedApp = new Application();
        selectedApp.setId(501L);
        selectedApp.setDrive(mockDrive);
        selectedApp.setStudent(otherStudentUser);
        selectedApp.setStatus("Selected");
        selectedApp.setAppliedAt(Instant.now());

        when(placementDriveRepository.findAll()).thenReturn(List.of(mockDrive));
        when(userRepository.findByRole("student")).thenReturn(List.of(studentUser, otherStudentUser));
        when(applicationRepository.findAllByOrderByAppliedAtDesc()).thenReturn(List.of(selectedApp, mockApplication));

        mockMvc.perform(get("/api/applications/analytics")
                        .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.driveAnalytics", hasSize(1)))
                .andExpect(jsonPath("$.data.driveAnalytics[0].driveTitle").value("Software Engineer"))
                .andExpect(jsonPath("$.data.driveAnalytics[0].companyName").value("Google"))
                .andExpect(jsonPath("$.data.driveAnalytics[0].packageCTC").value("24 LPA"))
                .andExpect(jsonPath("$.data.driveAnalytics[0].driveStatus").value("Upcoming"))
                .andExpect(jsonPath("$.data.driveAnalytics[0].applicationsCount").value(2))
                .andExpect(jsonPath("$.data.driveAnalytics[0].selectedCount").value(1))
                .andExpect(jsonPath("$.data.driveAnalytics[0].appliedCount").value(1))
                .andExpect(jsonPath("$.data.driveAnalytics[0].selectionRate").value(50.0));
    }

    @Test
    @DisplayName("GET /api/applications/analytics with non-numeric driveId=ALL is rejected with error because backend expects Long")
    void testGetOfficerAnalytics_WithDriveIdAll_RejectsNonNumericParameter() throws Exception {
        mockMvc.perform(get("/api/applications/analytics?driveId=ALL")
                        .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("For input string: \"ALL\"")));
    }

    @Test
    @DisplayName("GET /api/applications/analytics with omitted driveId returns HTTP 200 and aggregates across all drives")
    void testGetOfficerAnalytics_OmittedDriveId_AggregatesAllDrives_Success() throws Exception {
        when(placementDriveRepository.findAll()).thenReturn(List.of(mockDrive));
        when(userRepository.findByRole("student")).thenReturn(List.of(studentUser));
        when(applicationRepository.findAllByOrderByAppliedAtDesc()).thenReturn(List.of(mockApplication));

        mockMvc.perform(get("/api/applications/analytics?branch=ALL&status=ALL")
                        .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.summary.totalApplications").value(1))
                .andExpect(jsonPath("$.data.summary.totalDrives").value(1));
    }
}
