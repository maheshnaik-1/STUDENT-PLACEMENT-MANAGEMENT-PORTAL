package com.placement.portal.controller;

import com.placement.portal.PortalApplication;
import com.placement.portal.entity.DriveRequiredSkill;
import com.placement.portal.entity.PlacementDrive;
import com.placement.portal.entity.StudentSkill;
import com.placement.portal.entity.User;
import com.placement.portal.repository.*;
import com.placement.portal.security.JwtTokenProvider;
import com.placement.portal.service.ResumeStorageService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = PortalApplication.class)
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration",
    "jwt.secret=test_secure_jwt_signing_key_for_unit_tests_at_least_32_chars!",
    "placement.resume.upload-dir=target/test-resumes-ai",
    "resume.storage.path=target/test-resumes-ai",
    "resume.legacy.storage.path=target/test-legacy-ai"
})
class AiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ResumeStorageService resumeStorageService;

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

    private User studentUser;
    private User officerUser;
    private String studentToken;
    private String officerToken;

    @BeforeEach
    void setUp() throws IOException {
        Path uploadDir = resumeStorageService.getUploadDir();
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }

        Files.write(uploadDir.resolve("resume-1-123456789.pdf"), createSamplePdfBytes());
        Files.write(uploadDir.resolve("resume-1-987654321.docx"), createSampleDocxBytes());
        Files.write(uploadDir.resolve("resume-1-old.doc"), new byte[]{1, 2, 3});

        studentUser = new User();
        studentUser.setId(1L);
        studentUser.setName("Alex Student");
        studentUser.setEmail("alex@example.com");
        studentUser.setRole("student");
        studentUser.setBranch("CSE");
        studentUser.setCgpa(new BigDecimal("8.50"));
        studentUser.setResumeFileName("resume-1-123456789.pdf");
        studentUser.setResumeOriginalName("Alex_Resume.pdf");

        List<StudentSkill> existingSkills = new ArrayList<>();
        existingSkills.add(new StudentSkill(studentUser, "Java"));
        existingSkills.add(new StudentSkill(studentUser, "SQL"));
        studentUser.setSkills(existingSkills);

        officerUser = new User();
        officerUser.setId(2L);
        officerUser.setName("Placement Officer");
        officerUser.setEmail("officer@example.com");
        officerUser.setRole("officer");

        studentToken = jwtTokenProvider.generateToken(studentUser.getId(), studentUser.getEmail(), studentUser.getRole());
        officerToken = jwtTokenProvider.generateToken(officerUser.getId(), officerUser.getEmail(), officerUser.getRole());

        when(userRepository.findById(1L)).thenReturn(Optional.of(studentUser));
        when(userRepository.findById(2L)).thenReturn(Optional.of(officerUser));

        // Active placement drives mock
        PlacementDrive drive = new PlacementDrive();
        drive.setId(100L);
        drive.setStatus("Upcoming");
        List<DriveRequiredSkill> reqSkills = new ArrayList<>();
        reqSkills.add(new DriveRequiredSkill(drive, "React"));
        reqSkills.add(new DriveRequiredSkill(drive, "Docker"));
        reqSkills.add(new DriveRequiredSkill(drive, "Kubernetes"));
        drive.setRequiredSkills(reqSkills);

        when(placementDriveRepository.findByStatus("Upcoming")).thenReturn(List.of(drive));
        when(placementDriveRepository.findByStatus("Ongoing")).thenReturn(List.of());
    }

    private byte[] createSamplePdfBytes() throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cos = new PDPageContentStream(doc, page)) {
                cos.beginText();
                cos.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                cos.newLineAtOffset(50, 700);
                cos.showText("Alex Student - Software Engineer");
                cos.newLineAtOffset(0, -20);
                cos.showText("Email: alex@example.com Phone: 9876543210");
                cos.newLineAtOffset(0, -20);
                cos.showText("GitHub: github.com/alexstudent LinkedIn: linkedin.com/in/alexstudent");
                cos.newLineAtOffset(0, -20);
                cos.showText("Education: Bachelor of Technology in Computer Science and Engineering");
                cos.newLineAtOffset(0, -20);
                cos.showText("Technical Skills: Java, Spring Boot, React, Docker, MySQL, Git");
                cos.newLineAtOffset(0, -20);
                cos.showText("Projects: Built full stack campus placement management portal");
                cos.newLineAtOffset(0, -20);
                cos.showText("Experience: Software Development Intern at Cloud Tech Solutions");
                cos.endText();
            }
            doc.save(baos);
        }
        return baos.toByteArray();
    }

    private byte[] createSampleDocxBytes() throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (XWPFDocument doc = new XWPFDocument()) {
            XWPFParagraph p1 = doc.createParagraph();
            p1.createRun().setText("Alex Student - Full Stack Developer");

            XWPFParagraph p2 = doc.createParagraph();
            p2.createRun().setText("Email: alex@example.com Phone: +91 9876543210");

            XWPFParagraph p3 = doc.createParagraph();
            p3.createRun().setText("GitHub: github.com/alexstudent LinkedIn: linkedin.com/in/alexstudent");

            XWPFParagraph p4 = doc.createParagraph();
            p4.createRun().setText("Education: B.Tech Computer Science");

            XWPFParagraph p5 = doc.createParagraph();
            p5.createRun().setText("Technical Skills: Python, Django, PostgreSQL, Docker, AWS, React");

            XWPFParagraph p6 = doc.createParagraph();
            p6.createRun().setText("Projects: Real-time Distributed Job Processing Engine");

            XWPFParagraph p7 = doc.createParagraph();
            p7.createRun().setText("Work Experience: Junior Software Engineer Intern");

            doc.write(baos);
        }
        return baos.toByteArray();
    }

    @Test
    @DisplayName("POST /api/ai/parse-resume - Successfully parses PDF resume and discovers skills")
    void testParseResumePdfSuccess() throws Exception {
        mockMvc.perform(post("/api/ai/parse-resume")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.originalName").value("Alex_Resume.pdf"))
                .andExpect(jsonPath("$.data.fileType").value("PDF"))
                .andExpect(jsonPath("$.data.characterCount", greaterThan(0)))
                .andExpect(jsonPath("$.data.wordCount", greaterThan(0)))
                .andExpect(jsonPath("$.data.extractedSkills", hasItems("Java", "Spring Boot", "React", "Docker", "MySQL", "Git")))
                .andExpect(jsonPath("$.data.currentProfileSkills", hasItems("Java", "SQL")))
                .andExpect(jsonPath("$.data.newSkillsFound", hasItems("Spring Boot", "React", "Docker", "MySQL", "Git")))
                .andExpect(jsonPath("$.data.newSkillsFound", not(hasItem("Java"))))
                .andExpect(jsonPath("$.data.contactInfo.email").value("alex@example.com"))
                .andExpect(jsonPath("$.data.contactInfo.phone").value("9876543210"))
                .andExpect(jsonPath("$.data.contactInfo.links", hasItems("https://github.com/alexstudent", "https://linkedin.com/in/alexstudent")))
                .andExpect(jsonPath("$.data.suggestions", not(empty())))
                .andExpect(jsonPath("$.data.suggestions[?(@.id == 'section-education')].isPositive").value(hasItem(true)))
                .andExpect(jsonPath("$.data.suggestions[?(@.id == 'section-projects')].isPositive").value(hasItem(true)))
                .andExpect(jsonPath("$.data.suggestions[?(@.id == 'section-experience')].isPositive").value(hasItem(true)))
                .andExpect(jsonPath("$.data.suggestions[?(@.id == 'section-skills')].isPositive").value(hasItem(true)));
    }

    @Test
    @DisplayName("POST /api/ai/parse-resume - Successfully parses DOCX resume")
    void testParseResumeDocxSuccess() throws Exception {
        studentUser.setResumeFileName("resume-1-987654321.docx");
        studentUser.setResumeOriginalName("Alex_Resume.docx");

        mockMvc.perform(post("/api/ai/parse-resume")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.originalName").value("Alex_Resume.docx"))
                .andExpect(jsonPath("$.data.fileType").value("DOCX"))
                .andExpect(jsonPath("$.data.extractedSkills", hasItems("Python", "Django", "PostgreSQL", "Docker", "AWS", "React")))
                .andExpect(jsonPath("$.data.contactInfo.email").value("alex@example.com"));
    }

    @Test
    @DisplayName("POST /api/ai/parse-resume - 400 Bad Request when student has no resume uploaded")
    void testParseResumeMissingResumeOnProfile() throws Exception {
        studentUser.setResumeFileName(null);

        mockMvc.perform(post("/api/ai/parse-resume")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("No resume file found on your profile")));
    }

    @Test
    @DisplayName("POST /api/ai/parse-resume - 404 Not Found when resume file is missing on disk")
    void testParseResumeFileMissingOnDisk() throws Exception {
        studentUser.setResumeFileName("non-existent-resume.pdf");

        mockMvc.perform(post("/api/ai/parse-resume")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/ai/parse-resume - 400 Bad Request for unsupported legacy .doc file")
    void testParseResumeUnsupportedDocFormat() throws Exception {
        studentUser.setResumeFileName("resume-1-old.doc");

        mockMvc.perform(post("/api/ai/parse-resume")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Text extraction is not supported for legacy binary .doc files")));
    }

    @Test
    @DisplayName("POST /api/ai/parse-resume - 403 Forbidden when non-student (officer) calls endpoint")
    void testParseResumeForbiddenForOfficer() throws Exception {
        mockMvc.perform(post("/api/ai/parse-resume")
                .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/ai/parse-resume - 401 Unauthorized when unauthenticated")
    void testParseResumeUnauthorized() throws Exception {
        mockMvc.perform(post("/api/ai/parse-resume"))
                .andExpect(status().isUnauthorized());
    }
}
