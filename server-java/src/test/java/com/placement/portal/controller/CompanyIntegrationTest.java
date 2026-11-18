package com.placement.portal.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.placement.portal.PortalApplication;
import com.placement.portal.dto.company.CompanyRequest;
import com.placement.portal.entity.Company;
import com.placement.portal.entity.PlacementDrive;
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
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
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
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration",
    "jwt.secret=test_secure_jwt_signing_key_for_unit_tests_at_least_32_chars!"
})
class CompanyIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

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

    @MockitoBean
    private UserRepository userRepository;

    private User officerUser;
    private User studentUser;
    private String officerToken;
    private String studentToken;
    private Company mockCompany;

    @BeforeEach
    void setUp() {
        officerUser = new User();
        officerUser.setId(10L);
        officerUser.setName("Placement Officer");
        officerUser.setEmail("officer@example.com");
        officerUser.setRole("officer");

        studentUser = new User();
        studentUser.setId(20L);
        studentUser.setName("Test Student");
        studentUser.setEmail("student@example.com");
        studentUser.setRole("student");

        when(userRepository.findById(10L)).thenReturn(Optional.of(officerUser));
        when(userRepository.findById(20L)).thenReturn(Optional.of(studentUser));

        officerToken = jwtTokenProvider.generateToken(10L, "officer@example.com", "officer");
        studentToken = jwtTokenProvider.generateToken(20L, "student@example.com", "student");

        mockCompany = new Company();
        mockCompany.setId(1L);
        mockCompany.setName("Acme Corporation");
        mockCompany.setIndustry("Software");
        mockCompany.setLocation("Bangalore");
        mockCompany.setDescription("Leading global software solutions provider");
        mockCompany.setWebsite("https://acme.example.com");
        mockCompany.setContactEmail("hr@acme.example.com");
        mockCompany.setContactPerson("Jane Doe");
        mockCompany.setCreatedAt(Instant.now());
        mockCompany.setUpdatedAt(Instant.now());
    }

    @Test
    @DisplayName("GET /api/companies is public and returns company list with drive counts")
    void testGetAllCompanies_Public_Success() throws Exception {
        when(companyRepository.searchCompanies(null, null)).thenReturn(List.of(mockCompany));
        when(placementDriveRepository.countByCompanyId(1L)).thenReturn(3L);
        when(placementDriveRepository.countByCompanyIdAndStatusIn(eq(1L), anyList())).thenReturn(2L);

        mockMvc.perform(get("/api/companies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0]._id").value("1"))
                .andExpect(jsonPath("$.data[0].name").value("Acme Corporation"))
                .andExpect(jsonPath("$.data[0].totalDrives").value(3))
                .andExpect(jsonPath("$.data[0].activeDrives").value(2));
    }

    @Test
    @DisplayName("GET /api/companies with search and industry query filters")
    void testGetAllCompanies_WithFilters() throws Exception {
        when(companyRepository.searchCompanies("Acme", "Software")).thenReturn(List.of(mockCompany));
        when(placementDriveRepository.countByCompanyId(1L)).thenReturn(1L);
        when(placementDriveRepository.countByCompanyIdAndStatusIn(eq(1L), anyList())).thenReturn(1L);

        mockMvc.perform(get("/api/companies")
                        .param("search", "Acme")
                        .param("industry", "Software"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.data[0].name").value("Acme Corporation"));
    }

    @Test
    @DisplayName("GET /api/companies/:id returns company details with conducted drives")
    void testGetCompanyById_Success() throws Exception {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(mockCompany));

        PlacementDrive drive = new PlacementDrive();
        drive.setId(101L);
        drive.setCompany(mockCompany);
        drive.setTitle("Software Engineer 2026");
        drive.setJobRole("Software Engineer");
        drive.setJobDescription("Full-stack role");
        drive.setPackageCtc("12 LPA");
        drive.setLocation("Bangalore");
        drive.setMinCgpa(new BigDecimal("7.00"));
        drive.setMaxBacklogs(0);
        drive.setPassingYear(2026);
        drive.setDriveDate(Instant.now());
        drive.setDeadline(Instant.now().plusSeconds(86400));
        drive.setStatus("Upcoming");

        when(placementDriveRepository.findByCompanyIdOrderByDriveDateDesc(1L)).thenReturn(List.of(drive));
        when(applicationRepository.countByDriveId(101L)).thenReturn(5L);

        mockMvc.perform(get("/api/companies/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data._id").value("1"))
                .andExpect(jsonPath("$.data.name").value("Acme Corporation"))
                .andExpect(jsonPath("$.data.drives").isArray())
                .andExpect(jsonPath("$.data.drives[0].id").value(101))
                .andExpect(jsonPath("$.data.drives[0]._id").value("101"))
                .andExpect(jsonPath("$.data.drives[0].totalApplicants").value(5));
    }

    @Test
    @DisplayName("GET /api/companies/:id returns 404 when company does not exist")
    void testGetCompanyById_NotFound() throws Exception {
        when(companyRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/companies/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Company not found"));
    }

    @Test
    @DisplayName("POST /api/companies allows Officer to create company and returns 201 Created")
    void testCreateCompany_AsOfficer_Success() throws Exception {
        CompanyRequest request = new CompanyRequest();
        request.setName("Globex Corporation");
        request.setIndustry("Finance");
        request.setLocation("Mumbai");
        request.setDescription("Global financial technology firm");
        request.setWebsite("https://globex.example.com");

        when(companyRepository.existsByNameIgnoreCase("Globex Corporation")).thenReturn(false);
        when(companyRepository.save(any(Company.class))).thenAnswer(invocation -> {
            Company c = invocation.getArgument(0);
            c.setId(2L);
            return c;
        });

        mockMvc.perform(post("/api/companies")
                        .header("Authorization", "Bearer " + officerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Company 'Globex Corporation' added successfully!"))
                .andExpect(jsonPath("$.data.id").value(2))
                .andExpect(jsonPath("$.data._id").value("2"))
                .andExpect(jsonPath("$.data.name").value("Globex Corporation"));
    }

    @Test
    @DisplayName("POST /api/companies rejects Student role with 403 Forbidden")
    void testCreateCompany_AsStudent_Forbidden() throws Exception {
        CompanyRequest request = new CompanyRequest();
        request.setName("Globex Corporation");
        request.setIndustry("Finance");
        request.setLocation("Mumbai");
        request.setDescription("Global financial technology firm");

        mockMvc.perform(post("/api/companies")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/companies rejects unauthenticated caller with 401 Unauthorized")
    void testCreateCompany_Unauthenticated_Unauthorized() throws Exception {
        CompanyRequest request = new CompanyRequest();
        request.setName("Globex Corporation");
        request.setIndustry("Finance");
        request.setLocation("Mumbai");
        request.setDescription("Global financial technology firm");

        mockMvc.perform(post("/api/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/companies returns 400 Bad Request on duplicate company name")
    void testCreateCompany_DuplicateName_BadRequest() throws Exception {
        CompanyRequest request = new CompanyRequest();
        request.setName("Acme Corporation");
        request.setIndustry("Software");
        request.setLocation("Bangalore");
        request.setDescription("Duplicate test");

        when(companyRepository.existsByNameIgnoreCase("Acme Corporation")).thenReturn(true);

        mockMvc.perform(post("/api/companies")
                        .header("Authorization", "Bearer " + officerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Company 'Acme Corporation' is already registered in the system"));
    }

    @Test
    @DisplayName("PUT /api/companies/:id allows Officer to update company")
    void testUpdateCompany_AsOfficer_Success() throws Exception {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(mockCompany));
        when(companyRepository.save(any(Company.class))).thenReturn(mockCompany);

        CompanyRequest updateReq = new CompanyRequest();
        updateReq.setName("Acme International");
        updateReq.setIndustry("Software & Cloud");
        updateReq.setLocation("Bangalore, India");

        mockMvc.perform(put("/api/companies/1")
                        .header("Authorization", "Bearer " + officerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Company updated successfully!"))
                .andExpect(jsonPath("$.data.name").value("Acme International"));
    }

    @Test
    @DisplayName("PUT /api/companies/:id rejects Student role with 403 Forbidden")
    void testUpdateCompany_AsStudent_Forbidden() throws Exception {
        CompanyRequest updateReq = new CompanyRequest();
        updateReq.setName("Acme International");

        mockMvc.perform(put("/api/companies/1")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("DELETE /api/companies/:id allows Officer to delete company and cascades cleanly")
    void testDeleteCompany_AsOfficer_Success() throws Exception {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(mockCompany));
        PlacementDrive drive = new PlacementDrive();
        drive.setId(101L);
        when(placementDriveRepository.findByCompanyId(1L)).thenReturn(List.of(drive));

        mockMvc.perform(delete("/api/companies/1")
                        .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Company 'Acme Corporation' and all associated drives deleted successfully."));

        verify(applicationWithdrawalRepository, times(1)).deleteByDriveIdIn(List.of(101L));
        verify(applicationRepository, times(1)).deleteByDriveIdIn(List.of(101L));
        verify(placementDriveRepository, times(1)).deleteAll(anyList());
        verify(companyRepository, times(1)).delete(mockCompany);
    }

    @Test
    @DisplayName("DELETE /api/companies/:id rejects Student role with 403 Forbidden")
    void testDeleteCompany_AsStudent_Forbidden() throws Exception {
        mockMvc.perform(delete("/api/companies/1")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());

        verify(companyRepository, never()).delete(any());
    }
}
