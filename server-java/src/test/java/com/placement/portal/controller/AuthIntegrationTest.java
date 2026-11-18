package com.placement.portal.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.placement.portal.PortalApplication;
import com.placement.portal.dto.auth.AcademicDetailsDTO;
import com.placement.portal.dto.auth.LinksDTO;
import com.placement.portal.dto.auth.LoginRequest;
import com.placement.portal.dto.auth.ProjectDTO;
import com.placement.portal.dto.auth.RegisterRequest;
import com.placement.portal.dto.auth.UpdateProfileRequest;
import com.placement.portal.entity.StudentSkill;
import com.placement.portal.entity.User;
import com.placement.portal.repository.*;
import com.placement.portal.security.JwtTokenProvider;
import com.placement.portal.service.ResumeStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
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
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ResumeStorageService resumeStorageService;

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

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User studentUser;
    private User officerUser;
    private String studentToken;
    private String officerToken;

    @BeforeEach
    void setUp() {
        studentUser = new User();
        studentUser.setId(101L);
        studentUser.setName("Rahul Sharma");
        studentUser.setEmail("rahul@college.edu");
        studentUser.setPassword(passwordEncoder.encode("Password@123"));
        studentUser.setRole("student");
        studentUser.setRollNo("CS2026-001");
        studentUser.setBranch("CSE");
        studentUser.setCgpa(new BigDecimal("8.50"));
        studentUser.setActiveBacklogs(0);
        studentUser.setPassingYear(2026);
        studentUser.setPhone("9876543210");
        studentUser.setSkills(new ArrayList<>());
        studentUser.setProjects(new ArrayList<>());
        studentUser.setCertifications(new ArrayList<>());

        officerUser = new User();
        officerUser.setId(102L);
        officerUser.setName("Prof. Mehta");
        officerUser.setEmail("mehta@college.edu");
        officerUser.setPassword(passwordEncoder.encode("OfficerPass123"));
        officerUser.setRole("officer");

        when(userRepository.findById(101L)).thenReturn(Optional.of(studentUser));
        when(userRepository.findByEmail("rahul@college.edu")).thenReturn(Optional.of(studentUser));

        when(userRepository.findById(102L)).thenReturn(Optional.of(officerUser));
        when(userRepository.findByEmail("mehta@college.edu")).thenReturn(Optional.of(officerUser));

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        studentToken = tokenProvider.generateToken(101L, "rahul@college.edu", "student");
        officerToken = tokenProvider.generateToken(102L, "mehta@college.edu", "officer");
    }

    // -------------------------------------------------------------
    // 1. REGISTRATION TESTS
    // -------------------------------------------------------------

    @Test
    @DisplayName("Register: Successfully create new student with hashed password and JWT")
    void testRegister_Success() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Ananya Roy");
        req.setEmail("ananya@college.edu");
        req.setPassword("SecurePass123");
        req.setRollNo("CS2026-042");
        req.setBranch("IT");
        req.setCgpa(9.10);
        req.setPassingYear(2026);
        req.setSkills(List.of("Java", "Spring Boot", "React"));

        when(userRepository.existsByEmail("ananya@college.edu")).thenReturn(false);
        when(userRepository.findByRollNo("CS2026-042")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("Student registration successful!"))
            .andExpect(jsonPath("$.token").isString())
            .andExpect(jsonPath("$.user.name").value("Ananya Roy"))
            .andExpect(jsonPath("$.user.email").value("ananya@college.edu"))
            .andExpect(jsonPath("$.user.role").value("student"))
            .andExpect(jsonPath("$.user.rollNo").value("CS2026-042"));
    }

    @Test
    @DisplayName("Register: Duplicate email is rejected with 400 Bad Request")
    void testRegister_DuplicateEmail_Fails() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Duplicate User");
        req.setEmail("rahul@college.edu");
        req.setPassword("ValidPassword123");

        when(userRepository.existsByEmail("rahul@college.edu")).thenReturn(true);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("A user with this email address already exists"));
    }

    @Test
    @DisplayName("Register: Duplicate roll number is rejected with 400 Bad Request")
    void testRegister_DuplicateRollNo_Fails() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("New Student");
        req.setEmail("newstudent@college.edu");
        req.setPassword("ValidPassword123");
        req.setRollNo("CS2026-001");

        when(userRepository.existsByEmail("newstudent@college.edu")).thenReturn(false);
        when(userRepository.findByRollNo("CS2026-001")).thenReturn(Optional.of(studentUser));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("A student with this Roll Number is already registered"));
    }

    @Test
    @DisplayName("Register: Short password (< 6 chars) fails validation")
    void testRegister_ShortPassword_Fails() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Test Student");
        req.setEmail("test@college.edu");
        req.setPassword("12345"); // 5 chars

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false));
    }

    // -------------------------------------------------------------
    // 2. LOGIN TESTS
    // -------------------------------------------------------------

    @Test
    @DisplayName("Login: Valid credentials authenticate student and return JWT token")
    void testLogin_Success() throws Exception {
        LoginRequest req = new LoginRequest("rahul@college.edu", "Password@123", "student");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("Welcome back, Rahul Sharma!"))
            .andExpect(jsonPath("$.token").isString())
            .andExpect(jsonPath("$.user.id").value(101))
            .andExpect(jsonPath("$.user._id").value("101"))
            .andExpect(jsonPath("$.user.email").value("rahul@college.edu"));
    }

    @Test
    @DisplayName("Login: Incorrect password returns 401 Unauthorized")
    void testLogin_WrongPassword_Fails() throws Exception {
        LoginRequest req = new LoginRequest("rahul@college.edu", "WrongPassword999");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    @DisplayName("Login: Non-existent user returns 401 Unauthorized")
    void testLogin_UserNotFound_Fails() throws Exception {
        LoginRequest req = new LoginRequest("unknown@college.edu", "Password@123");

        when(userRepository.findByEmail("unknown@college.edu")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Invalid credentials. User not found."));
    }

    @Test
    @DisplayName("Login: Role mismatch returns 401 Unauthorized")
    void testLogin_RoleMismatch_Fails() throws Exception {
        // Rahul is a student, but trying to log into the officer portal
        LoginRequest req = new LoginRequest("rahul@college.edu", "Password@123", "officer");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Invalid credentials for Placement Officer portal."));
    }

    // -------------------------------------------------------------
    // 3. GET /api/auth/me TESTS
    // -------------------------------------------------------------

    @Test
    @DisplayName("GetMe: Authenticated user retrieves full profile with reconstituted collections and dual IDs")
    void testGetMe_Success() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.user.id").value(101))
            .andExpect(jsonPath("$.user._id").value("101"))
            .andExpect(jsonPath("$.user.name").value("Rahul Sharma"))
            .andExpect(jsonPath("$.user.academicDetails").isMap())
            .andExpect(jsonPath("$.user.links").isMap())
            .andExpect(jsonPath("$.user.projects").isArray())
            .andExpect(jsonPath("$.user.certifications").isArray());
    }

    @Test
    @DisplayName("GetMe: Unauthenticated request returns 401 Unauthorized")
    void testGetMe_Unauthenticated_Fails() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false));
    }

    // -------------------------------------------------------------
    // 4. PUT /api/auth/profile TESTS
    // -------------------------------------------------------------

    @Test
    @DisplayName("UpdateProfile: Student updates academic details, links, and projects")
    void testUpdateProfile_Success() throws Exception {
        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setName("Rahul S. Sharma");
        req.setPhone("9123456780");

        AcademicDetailsDTO ad = new AcademicDetailsDTO();
        ad.setTenthPercentage(new BigDecimal("88.50"));
        ad.setTwelfthPercentage(new BigDecimal("91.20"));
        ad.setCurrentSemester(6);
        ad.setGapYears(0);
        req.setAcademicDetails(ad);

        LinksDTO links = new LinksDTO("https://github.com/rahul", "https://linkedin.com/in/rahul", "");
        req.setLinks(links);

        ProjectDTO proj = new ProjectDTO();
        proj.setTitle("Placement Portal Mobile App");
        proj.setDescription("React Native placement portal frontend");
        proj.setLink("https://github.com/rahul/placement-app");
        proj.setTechStack(List.of("React Native", "TypeScript"));
        req.setProjects(List.of(proj));

        mockMvc.perform(put("/api/auth/profile")
                .header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("Profile updated successfully!"))
            .andExpect(jsonPath("$.user.name").value("Rahul S. Sharma"))
            .andExpect(jsonPath("$.user.academicDetails.tenthPercentage").value(88.50))
            .andExpect(jsonPath("$.user.links.github").value("https://github.com/rahul"))
            .andExpect(jsonPath("$.user.projects[0].title").value("Placement Portal Mobile App"));
    }

    @Test
    @DisplayName("UpdateProfile: Invalid academic percentage (> 100) returns 400 Bad Request")
    void testUpdateProfile_InvalidPercentage_Fails() throws Exception {
        UpdateProfileRequest req = new UpdateProfileRequest();
        AcademicDetailsDTO ad = new AcademicDetailsDTO();
        ad.setTenthPercentage(new BigDecimal("105.00")); // Invalid > 100
        req.setAcademicDetails(ad);

        mockMvc.perform(put("/api/auth/profile")
                .header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("10th percentage must be a number between 0 and 100"));
    }

    @Test
    @DisplayName("UpdateProfile: Invalid URL format in links returns 400 Bad Request")
    void testUpdateProfile_InvalidUrl_Fails() throws Exception {
        UpdateProfileRequest req = new UpdateProfileRequest();
        LinksDTO links = new LinksDTO("javascript:alert(1)", "", ""); // Invalid scheme
        req.setLinks(links);

        mockMvc.perform(put("/api/auth/profile")
                .header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("GitHub link must be a valid URL format (e.g. https://github.com/...)"));
    }

    @Test
    @DisplayName("UpdateProfile A: Saving only phone number when student has AWS and other skills preserves existing relationships without duplicate insert")
    void testUpdateProfile_SaveOnlyPhoneNumber_PreservesExistingSkillsInPlace() throws Exception {
        StudentSkill s1 = new StudentSkill(studentUser, "AWS");
        s1.setId(1L);
        StudentSkill s2 = new StudentSkill(studentUser, "Java");
        s2.setId(2L);
        studentUser.getSkills().clear();
        studentUser.getSkills().add(s1);
        studentUser.getSkills().add(s2);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setPhone("9876543219");
        req.setSkills("AWS, Java"); // Form sends existing skills as string

        mockMvc.perform(put("/api/auth/profile")
                .header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.user.phone").value("9876543219"))
            .andExpect(jsonPath("$.user.skills", hasItems("AWS", "Java")));

        assertEquals("9876543219", studentUser.getPhone());
        assertEquals(2, studentUser.getSkills().size());
        // Verify in-place reconciliation: exact instances preserved
        assertSame(s1, studentUser.getSkills().get(0));
        assertSame(s2, studentUser.getSkills().get(1));
    }

    @Test
    @DisplayName("UpdateProfile B: Saving the same existing skills without changes maintains entities without recreating them")
    void testUpdateProfile_SaveSameExistingSkills_PreservesExistingEntitiesWithoutChanges() throws Exception {
        StudentSkill s1 = new StudentSkill(studentUser, "AWS");
        s1.setId(10L);
        StudentSkill s2 = new StudentSkill(studentUser, "React");
        s2.setId(11L);
        studentUser.getSkills().clear();
        studentUser.getSkills().add(s1);
        studentUser.getSkills().add(s2);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setSkills("AWS, React");

        mockMvc.perform(put("/api/auth/profile")
                .header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.skills", hasSize(2)));

        assertEquals(2, studentUser.getSkills().size());
        assertSame(s1, studentUser.getSkills().get(0));
        assertSame(s2, studentUser.getSkills().get(1));
    }

    @Test
    @DisplayName("UpdateProfile C: Saving with one newly added skill keeps existing skills in-place and appends only new skill")
    void testUpdateProfile_AddNewSkill_AppendsOnlyNewSkillEntity() throws Exception {
        StudentSkill s1 = new StudentSkill(studentUser, "AWS");
        s1.setId(20L);
        StudentSkill s2 = new StudentSkill(studentUser, "Java");
        s2.setId(21L);
        studentUser.getSkills().clear();
        studentUser.getSkills().add(s1);
        studentUser.getSkills().add(s2);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setSkills("AWS, Java, Docker");

        mockMvc.perform(put("/api/auth/profile")
                .header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.skills", hasSize(3)))
            .andExpect(jsonPath("$.user.skills", hasItems("AWS", "Java", "Docker")));

        assertEquals(3, studentUser.getSkills().size());
        assertSame(s1, studentUser.getSkills().get(0));
        assertSame(s2, studentUser.getSkills().get(1));
        assertEquals("Docker", studentUser.getSkills().get(2).getSkill());
    }

    @Test
    @DisplayName("UpdateProfile D: Removing an existing skill reconciles in-place and leaves remaining skills intact")
    void testUpdateProfile_RemoveExistingSkill_DeletesOnlyOrphanedSkill() throws Exception {
        StudentSkill s1 = new StudentSkill(studentUser, "AWS");
        s1.setId(30L);
        StudentSkill s2 = new StudentSkill(studentUser, "Java");
        s2.setId(31L);
        StudentSkill s3 = new StudentSkill(studentUser, "Python");
        s3.setId(32L);
        studentUser.getSkills().clear();
        studentUser.getSkills().add(s1);
        studentUser.getSkills().add(s2);
        studentUser.getSkills().add(s3);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setSkills("Java, Python"); // AWS removed

        mockMvc.perform(put("/api/auth/profile")
                .header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.skills", hasSize(2)))
            .andExpect(jsonPath("$.user.skills", hasItems("Java", "Python")));

        assertEquals(2, studentUser.getSkills().size());
        assertSame(s2, studentUser.getSkills().get(0));
        assertSame(s3, studentUser.getSkills().get(1));
    }

    @Test
    @DisplayName("UpdateProfile E: Sending duplicate skill names (including case variations) is normalized and deduplicated")
    void testUpdateProfile_DuplicateSkillNamesInRequest_NormalizedAndDeduplicated() throws Exception {
        studentUser.getSkills().clear();

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setSkills("Java, React, java, Java, Python, REACT, Python,   java  ");

        mockMvc.perform(put("/api/auth/profile")
                .header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.skills", hasSize(3)))
            .andExpect(jsonPath("$.user.skills", hasItems("Java", "React", "Python")));

        assertEquals(3, studentUser.getSkills().size());
        List<String> skillNames = studentUser.getSkills().stream().map(StudentSkill::getSkill).toList();
        assertTrue(skillNames.contains("Java"));
        assertTrue(skillNames.contains("React"));
        assertTrue(skillNames.contains("Python"));
    }

    @Test
    @DisplayName("UpdateProfile F: Confirming there is never more than one student_skill relationship for the same student and skill")
    void testUpdateProfile_NeverMoreThanOneStudentSkillRelationshipPerSkill() throws Exception {
        StudentSkill s1 = new StudentSkill(studentUser, "AWS");
        s1.setId(40L);
        studentUser.getSkills().clear();
        studentUser.getSkills().add(s1);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setPhone("9988776655");
        req.setSkills("AWS, aws, Aws, AWS, Docker, docker, DOCKER");

        mockMvc.perform(put("/api/auth/profile")
                .header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk());

        // Check uniqueness across student skills
        Set<String> uniqueLowerSkills = new HashSet<>();
        for (StudentSkill ss : studentUser.getSkills()) {
            boolean added = uniqueLowerSkills.add(ss.getSkill().toLowerCase(Locale.ROOT));
            assertTrue(added, "Duplicate skill found: " + ss.getSkill());
        }
        assertEquals(2, studentUser.getSkills().size());
        assertSame(s1, studentUser.getSkills().get(0));
    }

    // -------------------------------------------------------------
    // 5. RESUME MANAGEMENT & SECURITY TESTS
    // -------------------------------------------------------------

    @Test
    @DisplayName("Resume: Upload valid PDF passes magic byte inspection and updates metadata")
    void testResumeUpload_ValidPdf_Success() throws Exception {
        byte[] validPdfBytes = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF".getBytes(StandardCharsets.ISO_8859_1);
        MockMultipartFile file = new MockMultipartFile("resume", "my_resume.pdf", "application/pdf", validPdfBytes);

        mockMvc.perform(multipart("/api/auth/resume-upload")
                .file(file)
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("Resume uploaded successfully!"))
            .andExpect(jsonPath("$.resumeFile.originalName").value("my_resume.pdf"))
            .andExpect(jsonPath("$.resumeFile.mimeType").value("application/pdf"));
    }

    @Test
    @DisplayName("Resume: Upload file with fake PDF extension and invalid magic bytes returns 400 Bad Request")
    void testResumeUpload_FakePdf_Fails() throws Exception {
        byte[] fakeBytes = "This is not a real PDF file despite the extension".getBytes(StandardCharsets.ISO_8859_1);
        MockMultipartFile file = new MockMultipartFile("resume", "fake.pdf", "application/pdf", fakeBytes);

        mockMvc.perform(multipart("/api/auth/resume-upload")
                .file(file)
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Invalid PDF file. The file content does not contain a valid PDF signature (%PDF-)."));
    }

    @Test
    @DisplayName("Resume: Upload file with forbidden extension (.exe) returns 400 Bad Request")
    void testResumeUpload_ForbiddenExtension_Fails() throws Exception {
        byte[] bytes = "echo malicious".getBytes(StandardCharsets.ISO_8859_1);
        MockMultipartFile file = new MockMultipartFile("resume", "script.exe", "application/octet-stream", bytes);

        mockMvc.perform(multipart("/api/auth/resume-upload")
                .file(file)
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Invalid file type. Only PDF (.pdf), DOC (.doc), and DOCX (.docx) documents are supported."));
    }

    @Test
    @DisplayName("Resume: Delete uploaded resume clears metadata without deleting other files")
    void testResumeDelete_Success() throws Exception {
        studentUser.setResumeFileName("resume-101-sample.pdf");
        studentUser.setResumeOriginalName("sample.pdf");
        studentUser.setResumeMimeType("application/pdf");

        mockMvc.perform(delete("/api/auth/resume")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("Uploaded resume removed successfully"))
            .andExpect(jsonPath("$.resumeFile.filename").doesNotExist());
    }

    @Test
    @DisplayName("Resume: Student attempting to download another student's resume returns 403 Forbidden")
    void testResumeDownload_StudentAccessingOtherStudent_Forbidden() throws Exception {
        // Rahul (ID 101) attempts to download student 999's resume
        mockMvc.perform(get("/api/auth/resume-download/999")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("You are not authorized to access this resume"));
    }

    @Test
    @DisplayName("Resume: Officer can download an existing student's resume successfully with correct headers")
    void testResumeDownload_OfficerCanDownloadExistingStudentResume_Success() throws Exception {
        String testFilename = "resume-test-officer-download.pdf";
        Path testFilePath = resumeStorageService.getUploadDir().resolve(testFilename);
        Files.createDirectories(testFilePath.getParent());
        byte[] pdfContent = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF".getBytes(StandardCharsets.ISO_8859_1);
        Files.write(testFilePath, pdfContent);

        try {
            studentUser.setResumeFileName(testFilename);
            studentUser.setResumeOriginalName("test_student_resume.pdf");
            studentUser.setResumeMimeType("application/pdf");

            mockMvc.perform(get("/api/auth/resume-download/101")
                    .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("inline")))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("test_student_resume.pdf")))
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, containsString(MediaType.APPLICATION_PDF_VALUE)))
                .andExpect(content().bytes(pdfContent));
        } finally {
            Files.deleteIfExists(testFilePath);
        }
    }

    @Test
    @DisplayName("Resume: Officer download returns 404 when student has no uploaded resume")
    void testResumeDownload_OfficerDownload_NoResumeUploaded_Returns404() throws Exception {
        studentUser.setResumeFileName(null);
        studentUser.setResumeOriginalName(null);

        mockMvc.perform(get("/api/auth/resume-download/101")
                .header("Authorization", "Bearer " + officerToken))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("No uploaded resume found for this student"));
    }

    @Test
    @DisplayName("Resume: Officer download returns 404 when resume file is missing from disk")
    void testResumeDownload_OfficerDownload_PhysicalFileNotFoundOnDisk_Returns404() throws Exception {
        studentUser.setResumeFileName("nonexistent-file-on-disk.pdf");
        studentUser.setResumeOriginalName("sample.pdf");
        studentUser.setResumeMimeType("application/pdf");

        Path testFilePath = resumeStorageService.getUploadDir().resolve("nonexistent-file-on-disk.pdf");
        Files.deleteIfExists(testFilePath);

        mockMvc.perform(get("/api/auth/resume-download/101")
                .header("Authorization", "Bearer " + officerToken))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Resume file not found on server disk"));
    }

    @Test
    @DisplayName("Resume: Officer download returns 404 when requested student ID does not exist")
    void testResumeDownload_OfficerDownload_StudentNotFound_Returns404() throws Exception {
        when(userRepository.findById(9999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/auth/resume-download/9999")
                .header("Authorization", "Bearer " + officerToken))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Student not found"));
    }

    @Test
    @DisplayName("Resume: Student can download their own resume successfully via /api/auth/resume")
    void testResumeDownload_StudentCanDownloadOwnResume_Success() throws Exception {
        String testFilename = "resume-test-student-self.pdf";
        Path testFilePath = resumeStorageService.getUploadDir().resolve(testFilename);
        Files.createDirectories(testFilePath.getParent());
        byte[] pdfContent = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF".getBytes(StandardCharsets.ISO_8859_1);
        Files.write(testFilePath, pdfContent);

        try {
            studentUser.setResumeFileName(testFilename);
            studentUser.setResumeOriginalName("my_own_resume.pdf");
            studentUser.setResumeMimeType("application/pdf");

            // Direct self endpoint
            mockMvc.perform(get("/api/auth/resume")
                    .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("inline")))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("my_own_resume.pdf")))
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, containsString(MediaType.APPLICATION_PDF_VALUE)))
                .andExpect(content().bytes(pdfContent));

            // Own studentId endpoint
            mockMvc.perform(get("/api/auth/resume-download/101")
                    .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("my_own_resume.pdf")))
                .andExpect(content().bytes(pdfContent));
        } finally {
            Files.deleteIfExists(testFilePath);
        }
    }

    @Test
    @DisplayName("Resume: Student self download returns 404 when no resume has been uploaded")
    void testResumeDownload_StudentCanDownloadOwnResume_NoResumeUploaded_Returns404() throws Exception {
        studentUser.setResumeFileName(null);
        studentUser.setResumeOriginalName(null);

        mockMvc.perform(get("/api/auth/resume")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("No uploaded resume found for this student"));
    }

    @Test
    @DisplayName("Resume: Unauthenticated requests cannot access protected resume endpoints")
    void testResumeEndpoints_Unauthenticated_Returns401Unauthorized() throws Exception {
        // 1. GET /api/auth/resume without token
        mockMvc.perform(get("/api/auth/resume"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Not authorized, token failed or expired"));

        // 2. GET /api/auth/resume-download/101 without token
        mockMvc.perform(get("/api/auth/resume-download/101"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Not authorized, token failed or expired"));

        // 3. POST /api/auth/resume-upload without token
        byte[] pdfContent = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF".getBytes(StandardCharsets.ISO_8859_1);
        MockMultipartFile file = new MockMultipartFile("resume", "test.pdf", "application/pdf", pdfContent);
        mockMvc.perform(multipart("/api/auth/resume-upload").file(file))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Not authorized, token failed or expired"));

        // 4. DELETE /api/auth/resume without token
        mockMvc.perform(delete("/api/auth/resume"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Not authorized, token failed or expired"));
    }
}
