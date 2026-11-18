package com.placement.portal.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.placement.portal.PortalApplication;
import com.placement.portal.dto.drive.EligibilityDTO;
import com.placement.portal.dto.drive.DriveRequest;
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
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = PortalApplication.class)
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration",
    "jwt.secret=test_secure_jwt_signing_key_for_unit_tests_at_least_32_chars!"
})
class PlacementDriveIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private PlacementDriveRepository placementDriveRepository;

    @MockitoBean
    private CompanyRepository companyRepository;

    @MockitoBean
    private ApplicationRepository applicationRepository;

    @MockitoBean
    private ApplicationWithdrawalRepository applicationWithdrawalRepository;

    @MockitoBean
    private NotificationRepository notificationRepository;

    @MockitoBean
    private UserRepository userRepository;

    private User officerUser;
    private User studentUser;
    private String officerToken;
    private String studentToken;
    private Company mockCompany;
    private PlacementDrive mockDrive;

    @BeforeEach
    void setUp() {
        officerUser = new User();
        officerUser.setId(10L);
        officerUser.setName("Placement Officer");
        officerUser.setEmail("officer@example.com");
        officerUser.setRole("officer");

        studentUser = new User();
        studentUser.setId(20L);
        studentUser.setName("Alice Student");
        studentUser.setEmail("student@example.com");
        studentUser.setRole("student");
        studentUser.setBranch("CSE");
        studentUser.setCgpa(new BigDecimal("8.50"));
        studentUser.setActiveBacklogs(0);
        studentUser.setPassingYear(2026);

        StudentSkill skill1 = new StudentSkill(studentUser, "Java");
        StudentSkill skill2 = new StudentSkill(studentUser, "Spring Boot");
        StudentSkill skill3 = new StudentSkill(studentUser, "MySQL");
        studentUser.setSkills(List.of(skill1, skill2, skill3));

        when(userRepository.findById(10L)).thenReturn(Optional.of(officerUser));
        when(userRepository.findById(20L)).thenReturn(Optional.of(studentUser));

        officerToken = jwtTokenProvider.generateToken(10L, "officer@example.com", "officer");
        studentToken = jwtTokenProvider.generateToken(20L, "student@example.com", "student");

        mockCompany = new Company();
        mockCompany.setId(1L);
        mockCompany.setName("Acme Corporation");
        mockCompany.setIndustry("Software");
        mockCompany.setLocation("Bangalore");

        mockDrive = new PlacementDrive();
        mockDrive.setId(101L);
        mockDrive.setCompany(mockCompany);
        mockDrive.setTitle("Graduate Software Engineer");
        mockDrive.setJobRole("Software Engineer");
        mockDrive.setJobDescription("Develop robust backend systems");
        mockDrive.setPackageCtc("14 LPA");
        mockDrive.setLocation("Bangalore");
        mockDrive.setMinCgpa(new BigDecimal("7.50"));
        mockDrive.setMaxBacklogs(0);
        mockDrive.setPassingYear(2026);
        mockDrive.setDriveDate(Instant.now().plusSeconds(86400 * 5));
        mockDrive.setDeadline(Instant.now().plusSeconds(86400 * 2));
        mockDrive.setStatus("Upcoming");
        mockDrive.setCreatedAt(Instant.now());
        mockDrive.setUpdatedAt(Instant.now());

        mockDrive.getAllowedBranches().add(new DriveAllowedBranch(mockDrive, "CSE"));
        mockDrive.getAllowedBranches().add(new DriveAllowedBranch(mockDrive, "IT"));

        mockDrive.getRounds().add(new DriveRound(mockDrive, 0, "Online Assessment"));
        mockDrive.getRounds().add(new DriveRound(mockDrive, 1, "Technical Interview"));

        mockDrive.getRequiredSkills().add(new DriveRequiredSkill(mockDrive, "Java"));
        mockDrive.getRequiredSkills().add(new DriveRequiredSkill(mockDrive, "Spring Boot"));
        mockDrive.getRequiredSkills().add(new DriveRequiredSkill(mockDrive, "MySQL"));
    }

    @Test
    @DisplayName("GET /api/drives is public and returns drive list with child branches, rounds, and skills")
    void testGetAllDrives_Public_Success() throws Exception {
        when(placementDriveRepository.searchDrives(null, null, null)).thenReturn(List.of(mockDrive));
        when(applicationRepository.countByDriveId(101L)).thenReturn(4L);

        mockMvc.perform(get("/api/drives"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.data[0].id").value(101))
                .andExpect(jsonPath("$.data[0]._id").value("101"))
                .andExpect(jsonPath("$.data[0].title").value("Graduate Software Engineer"))
                .andExpect(jsonPath("$.data[0].company.name").value("Acme Corporation"))
                .andExpect(jsonPath("$.data[0].rounds[0]").value("Online Assessment"))
                .andExpect(jsonPath("$.data[0].eligibility.allowedBranches[0]").value("CSE"))
                .andExpect(jsonPath("$.data[0].requiredSkills[0]").value("Java"))
                .andExpect(jsonPath("$.data[0].totalApplicants").value(4));
    }

    @Test
    @DisplayName("GET /api/drives as authenticated Student augments drives with eligibility and applied status")
    void testGetAllDrives_AsStudent_AugmentsEligibility() throws Exception {
        when(placementDriveRepository.searchDrives(null, null, null)).thenReturn(List.of(mockDrive));
        when(applicationRepository.countByDriveId(101L)).thenReturn(1L);

        Application app = new Application();
        app.setId(501L);
        app.setDrive(mockDrive);
        app.setStudent(studentUser);
        app.setStatus("Shortlisted");
        when(applicationRepository.findByStudentId(20L)).thenReturn(List.of(app));

        mockMvc.perform(get("/api/drives")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].isEligible").value(true))
                .andExpect(jsonPath("$.data[0].hasApplied").value(true))
                .andExpect(jsonPath("$.data[0].myApplicationStatus").value("Shortlisted"))
                .andExpect(jsonPath("$.data[0].myApplicationId").value("501"));
    }

    @Test
    @DisplayName("GET /api/drives/:id returns single drive with all populated fields")
    void testGetDriveById_Success() throws Exception {
        when(placementDriveRepository.findById(101L)).thenReturn(Optional.of(mockDrive));
        when(applicationRepository.countByDriveId(101L)).thenReturn(3L);

        mockMvc.perform(get("/api/drives/101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(101))
                .andExpect(jsonPath("$.data._id").value("101"))
                .andExpect(jsonPath("$.data.packageCTC").value("14 LPA"))
                .andExpect(jsonPath("$.data.totalApplicants").value(3));
    }

    @Test
    @DisplayName("GET /api/drives/:id returns 404 when drive not found")
    void testGetDriveById_NotFound() throws Exception {
        when(placementDriveRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/drives/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Placement drive not found"));
    }

    @Test
    @DisplayName("GET /api/drives/:id for authenticated Student who has already applied serializes cleanly without cyclic entity errors")
    void testGetDriveById_AsStudent_AlreadyApplied_Success() throws Exception {
        when(placementDriveRepository.findById(101L)).thenReturn(Optional.of(mockDrive));
        when(applicationRepository.countByDriveId(101L)).thenReturn(4L);

        // Intentionally create bidirectional relationship that previously caused Jackson cyclic nesting overflow
        Application app = new Application();
        app.setId(501L);
        app.setDrive(mockDrive);
        app.setStudent(studentUser);
        app.setStatus("Interview");
        app.setRemarks("Selected for round 2");
        app.setAppliedAt(Instant.now().minusSeconds(3600));
        mockCompany.getDrives().add(mockDrive);

        when(applicationRepository.findByDriveIdAndStudentId(101L, 20L)).thenReturn(Optional.of(app));

        mockMvc.perform(get("/api/drives/101")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(101))
                .andExpect(jsonPath("$.data.hasApplied").value(true))
                .andExpect(jsonPath("$.data.myApplicationStatus").value("Interview"))
                .andExpect(jsonPath("$.data.myApplicationId").value("501"))
                .andExpect(jsonPath("$.data.myApplication.id").value(501))
                .andExpect(jsonPath("$.data.myApplication.status").value("Interview"))
                .andExpect(jsonPath("$.data.myApplication.remarks").value("Selected for round 2"));
    }

    @Test
    @DisplayName("GET /api/drives/:id for authenticated Student on expired but unapplied drive returns successfully with hasApplied=false")
    void testGetDriveById_AsStudent_ExpiredUnappliedDrive_Success() throws Exception {
        mockDrive.setDeadline(Instant.now().minusSeconds(86400 * 5));
        when(placementDriveRepository.findById(101L)).thenReturn(Optional.of(mockDrive));
        when(applicationRepository.countByDriveId(101L)).thenReturn(2L);
        when(applicationRepository.findByDriveIdAndStudentId(101L, 20L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/drives/101")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(101))
                .andExpect(jsonPath("$.data.hasApplied").value(false))
                .andExpect(jsonPath("$.data.myApplicationStatus").doesNotExist())
                .andExpect(jsonPath("$.data.isEligible").value(true));
    }

    @Test
    @DisplayName("POST /api/drives allows Officer to create drive and returns 201 Created")
    void testCreateDrive_AsOfficer_Success() throws Exception {
        DriveRequest req = new DriveRequest();
        req.setCompany(1L);
        req.setTitle("Associate Software Engineer");
        req.setJobRole("Software Engineer");
        req.setJobDescription("Full-stack development");
        req.setPackageCTC("10 LPA");
        req.setLocation("Hyderabad");
        req.setDriveDate(Instant.now().plusSeconds(86400 * 3));
        req.setDeadline(Instant.now().plusSeconds(86400));
        req.setEligibility(new EligibilityDTO(new BigDecimal("7.00"), List.of("CSE", "IT"), 0, 2026));
        req.setRounds(List.of("Round 1", "Round 2"));
        req.setRequiredSkills(List.of("Java", "React"));

        when(companyRepository.findById(1L)).thenReturn(Optional.of(mockCompany));
        when(placementDriveRepository.save(any(PlacementDrive.class))).thenAnswer(invocation -> {
            PlacementDrive d = invocation.getArgument(0);
            d.setId(102L);
            return d;
        });

        mockMvc.perform(post("/api/drives")
                        .header("Authorization", "Bearer " + officerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Placement drive created successfully!"))
                .andExpect(jsonPath("$.data.id").value(102))
                .andExpect(jsonPath("$.data._id").value("102"))
                .andExpect(jsonPath("$.data.title").value("Associate Software Engineer"));
    }

    @Test
    @DisplayName("POST /api/drives rejects Student role with 403 Forbidden")
    void testCreateDrive_AsStudent_Forbidden() throws Exception {
        DriveRequest req = new DriveRequest();
        req.setCompany(1L);
        req.setTitle("Unauthorized Drive");
        req.setJobRole("Role");
        req.setJobDescription("Desc");
        req.setPackageCTC("10 LPA");
        req.setLocation("City");

        mockMvc.perform(post("/api/drives")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/drives rejects unauthenticated caller with 401 Unauthorized")
    void testCreateDrive_Unauthenticated_Unauthorized() throws Exception {
        DriveRequest req = new DriveRequest();
        req.setCompany(1L);
        req.setTitle("Unauthorized Drive");

        mockMvc.perform(post("/api/drives")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PUT /api/drives/:id allows Officer to update drive")
    void testUpdateDrive_AsOfficer_Success() throws Exception {
        when(placementDriveRepository.findById(101L)).thenReturn(Optional.of(mockDrive));
        when(placementDriveRepository.save(any(PlacementDrive.class))).thenReturn(mockDrive);

        DriveRequest updateReq = new DriveRequest();
        updateReq.setTitle("Senior Software Engineer");
        updateReq.setPackageCTC("18 LPA");

        mockMvc.perform(put("/api/drives/101")
                        .header("Authorization", "Bearer " + officerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Placement drive updated successfully!"))
                .andExpect(jsonPath("$.data.title").value("Senior Software Engineer"))
                .andExpect(jsonPath("$.data.packageCTC").value("18 LPA"));
    }

    @Test
    @DisplayName("PUT /api/drives/:id preserves existing allowed branches and skills in-place when changing commencement date")
    void testUpdateDrive_CommencementDateChangePreservesAllowedBranchesAndSkillsWithoutDuplicates() throws Exception {
        // Arrange drive with CSE, IT, ECE, AI&DS (exact live scenario)
        mockDrive.getAllowedBranches().clear();
        DriveAllowedBranch bCse = new DriveAllowedBranch(mockDrive, "CSE");
        DriveAllowedBranch bIt = new DriveAllowedBranch(mockDrive, "IT");
        DriveAllowedBranch bEce = new DriveAllowedBranch(mockDrive, "ECE");
        DriveAllowedBranch bAids = new DriveAllowedBranch(mockDrive, "AI&DS");
        mockDrive.getAllowedBranches().addAll(List.of(bCse, bIt, bEce, bAids));

        mockDrive.getRequiredSkills().clear();
        DriveRequiredSkill sJava = new DriveRequiredSkill(mockDrive, "Java");
        DriveRequiredSkill sSpring = new DriveRequiredSkill(mockDrive, "Spring Boot");
        DriveRequiredSkill sSql = new DriveRequiredSkill(mockDrive, "MySQL");
        mockDrive.getRequiredSkills().addAll(List.of(sJava, sSpring, sSql));

        when(placementDriveRepository.findById(101L)).thenReturn(Optional.of(mockDrive));
        when(placementDriveRepository.save(any(PlacementDrive.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act: Update commencement date to 06-11-2026, keeping same branches and skills
        DriveRequest updateReq = new DriveRequest();
        updateReq.setDriveDate(Instant.parse("2026-11-06T00:00:00Z"));
        EligibilityDTO eligibility = new EligibilityDTO();
        eligibility.setAllowedBranches(List.of("CSE", "IT", "ECE", "AI&DS"));
        updateReq.setEligibility(eligibility);
        updateReq.setRequiredSkills(List.of("Java", "Spring Boot", "MySQL"));

        mockMvc.perform(put("/api/drives/101")
                        .header("Authorization", "Bearer " + officerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Placement drive updated successfully!"))
                .andExpect(jsonPath("$.data.driveDate").value("2026-11-06T00:00:00Z"))
                .andExpect(jsonPath("$.data.eligibility.allowedBranches", org.hamcrest.Matchers.hasSize(4)))
                .andExpect(jsonPath("$.data.eligibility.allowedBranches", org.hamcrest.Matchers.containsInAnyOrder("CSE", "IT", "ECE", "AI&DS")))
                .andExpect(jsonPath("$.data.requiredSkills", org.hamcrest.Matchers.hasSize(3)));

        // Verify in-place entity preservation: original instance references were NOT cleared or duplicated
        assertEquals(4, mockDrive.getAllowedBranches().size(), "Allowed branches list must contain exactly 4 entries");
        assertTrue(mockDrive.getAllowedBranches().contains(bCse), "Original CSE instance must be preserved in-place");
        assertTrue(mockDrive.getAllowedBranches().contains(bIt), "Original IT instance must be preserved in-place");
        assertTrue(mockDrive.getAllowedBranches().contains(bEce), "Original ECE instance must be preserved in-place");
        assertTrue(mockDrive.getAllowedBranches().contains(bAids), "Original AI&DS instance must be preserved in-place");

        assertEquals(3, mockDrive.getRequiredSkills().size(), "Required skills list must contain exactly 3 entries");
        assertTrue(mockDrive.getRequiredSkills().contains(sJava), "Original Java instance must be preserved in-place");
        assertTrue(mockDrive.getRequiredSkills().contains(sSpring), "Original Spring Boot instance must be preserved in-place");
        assertTrue(mockDrive.getRequiredSkills().contains(sSql), "Original MySQL instance must be preserved in-place");
    }

    @Test
    @DisplayName("PUT /api/drives/:id in-place reconciliation adds new branch and removes obsolete branch cleanly")
    void testUpdateDrive_ReconciliationAddsAndRemovesBranchesCleanly() throws Exception {
        mockDrive.getAllowedBranches().clear();
        DriveAllowedBranch bCse = new DriveAllowedBranch(mockDrive, "CSE");
        DriveAllowedBranch bIt = new DriveAllowedBranch(mockDrive, "IT");
        DriveAllowedBranch bEce = new DriveAllowedBranch(mockDrive, "ECE");
        DriveAllowedBranch bAids = new DriveAllowedBranch(mockDrive, "AI&DS");
        mockDrive.getAllowedBranches().addAll(List.of(bCse, bIt, bEce, bAids));

        when(placementDriveRepository.findById(101L)).thenReturn(Optional.of(mockDrive));
        when(placementDriveRepository.save(any(PlacementDrive.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Request: remove ECE, add MECH
        DriveRequest updateReq = new DriveRequest();
        EligibilityDTO eligibility = new EligibilityDTO();
        eligibility.setAllowedBranches(List.of("CSE", "IT", "AI&DS", "MECH"));
        updateReq.setEligibility(eligibility);

        mockMvc.perform(put("/api/drives/101")
                        .header("Authorization", "Bearer " + officerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eligibility.allowedBranches", org.hamcrest.Matchers.hasSize(4)))
                .andExpect(jsonPath("$.data.eligibility.allowedBranches", org.hamcrest.Matchers.containsInAnyOrder("CSE", "IT", "AI&DS", "MECH")));

        // CSE, IT, AI&DS preserved; ECE removed; MECH added
        assertTrue(mockDrive.getAllowedBranches().contains(bCse));
        assertTrue(mockDrive.getAllowedBranches().contains(bIt));
        assertTrue(mockDrive.getAllowedBranches().contains(bAids));
        assertFalse(mockDrive.getAllowedBranches().contains(bEce));
        assertTrue(mockDrive.getAllowedBranches().stream().anyMatch(ab -> "MECH".equals(ab.getBranch())));
    }

    @Test
    @DisplayName("PUT /api/drives/:id rejects Student role with 403 Forbidden")
    void testUpdateDrive_AsStudent_Forbidden() throws Exception {
        DriveRequest updateReq = new DriveRequest();
        updateReq.setTitle("Senior Software Engineer");

        mockMvc.perform(put("/api/drives/101")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("DELETE /api/drives/:id allows Officer to delete drive and cascades applications")
    void testDeleteDrive_AsOfficer_Success() throws Exception {
        when(placementDriveRepository.findById(101L)).thenReturn(Optional.of(mockDrive));

        mockMvc.perform(delete("/api/drives/101")
                        .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Placement drive and all related applications deleted successfully"));

        verify(applicationWithdrawalRepository, times(1)).deleteByDriveId(101L);
        verify(applicationRepository, times(1)).deleteByDriveId(101L);
        verify(placementDriveRepository, times(1)).delete(mockDrive);
    }

    @Test
    @DisplayName("DELETE /api/drives/:id rejects Student role with 403 Forbidden")
    void testDeleteDrive_AsStudent_Forbidden() throws Exception {
        mockMvc.perform(delete("/api/drives/101")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());

        verify(placementDriveRepository, never()).delete(any());
    }

    @Test
    @DisplayName("GET /api/drives/recommendations returns sorted recommendations for student")
    void testGetDriveRecommendations_AsStudent_Success() throws Exception {
        when(placementDriveRepository.findByStatusNotOrderByDriveDateAscCreatedAtDesc("Cancelled"))
                .thenReturn(List.of(mockDrive));
        when(applicationRepository.findByStudentId(20L)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/drives/recommendations")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.data[0].id").value(101))
                .andExpect(jsonPath("$.data[0]._id").value("101"))
                .andExpect(jsonPath("$.data[0].recommendationTier").value("High Match"))
                .andExpect(jsonPath("$.data[0].academicEligibility.isEligible").value(true))
                .andExpect(jsonPath("$.data[0].skillMatch.score").value(100));
    }

    @Test
    @DisplayName("GET /api/drives/recommendations rejects Officer role with 403 Forbidden")
    void testGetDriveRecommendations_AsOfficer_Forbidden() throws Exception {
        mockMvc.perform(get("/api/drives/recommendations")
                        .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/drives/:id/match-score returns skill match and eligibility breakdown")
    void testGetDriveMatchScore_AsStudent_Success() throws Exception {
        when(placementDriveRepository.findById(101L)).thenReturn(Optional.of(mockDrive));
        when(applicationRepository.findByDriveIdAndStudentId(101L, 20L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/drives/101/match-score")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.driveId").value("101"))
                .andExpect(jsonPath("$.data.driveTitle").value("Graduate Software Engineer"))
                .andExpect(jsonPath("$.data.skillMatch.score").value(100))
                .andExpect(jsonPath("$.data.academicEligibility.isEligible").value(true))
                .andExpect(jsonPath("$.data.hasApplied").value(false));
    }
}
