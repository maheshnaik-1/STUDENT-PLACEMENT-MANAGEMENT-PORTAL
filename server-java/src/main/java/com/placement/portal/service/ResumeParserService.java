package com.placement.portal.service;

import com.placement.portal.dto.ai.ContactInfoDTO;
import com.placement.portal.dto.ai.ResumeAnalysisResponseDTO;
import com.placement.portal.dto.ai.ResumeSuggestionDTO;
import com.placement.portal.entity.DriveRequiredSkill;
import com.placement.portal.entity.PlacementDrive;
import com.placement.portal.entity.StudentSkill;
import com.placement.portal.entity.User;
import com.placement.portal.repository.PlacementDriveRepository;
import com.placement.portal.repository.UserRepository;
import com.placement.portal.util.SkillMatcherUtil;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.InputStream;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ResumeParserService {

    private static final Logger log = LoggerFactory.getLogger(ResumeParserService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlacementDriveRepository placementDriveRepository;

    @Autowired
    private ResumeStorageService resumeStorageService;

    private static class KeywordPattern {
        final String name;
        final Pattern pattern;

        KeywordPattern(String name, String regex) {
            this.name = name;
            this.pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
        }
    }

    private static final List<KeywordPattern> TECHNICAL_KEYWORDS = List.of(
            // Programming Languages
            new KeywordPattern("JavaScript", "\\b(?:javascript|js|ecmascript)\\b"),
            new KeywordPattern("TypeScript", "\\b(?:typescript|ts)\\b"),
            new KeywordPattern("Python", "\\b(?:python|python3)\\b"),
            new KeywordPattern("Java", "\\bjava\\b(?!\\s*script)"),
            new KeywordPattern("C++", "(?:\\bc\\+\\+|\\bcpp\\b)"),
            new KeywordPattern("C#", "(?:\\bc#|\\bcsharp\\b)"),
            new KeywordPattern("C", "(?:languages?:[^.\\n]*\\bc\\b|\\bc\\s*,\\s*|\\bprogramming\\s+in\\s+c\\b)"),
            new KeywordPattern("Go", "\\b(?:golang|go\\s+language)\\b"),
            new KeywordPattern("Rust", "\\brust\\b"),
            new KeywordPattern("Ruby", "\\bruby\\b"),
            new KeywordPattern("PHP", "\\bphp\\b"),
            new KeywordPattern("Swift", "\\bswift\\b"),
            new KeywordPattern("Kotlin", "\\bkotlin\\b"),
            new KeywordPattern("Dart", "\\bdart\\b"),
            new KeywordPattern("SQL", "\\bsql\\b"),
            new KeywordPattern("HTML", "\\b(?:html|html5)\\b"),
            new KeywordPattern("CSS", "\\b(?:css|css3)\\b"),

            // Frontend
            new KeywordPattern("React", "\\b(?:react|react\\.?js|reactjs)\\b"),
            new KeywordPattern("Angular", "\\b(?:angular|angular\\.?js|angularjs)\\b"),
            new KeywordPattern("Vue.js", "\\b(?:vue|vue\\.?js|vuejs)\\b"),
            new KeywordPattern("Next.js", "\\b(?:next\\.?js|nextjs)\\b"),
            new KeywordPattern("Redux", "\\bredux\\b"),
            new KeywordPattern("Tailwind CSS", "\\b(?:tailwind|tailwindcss|tailwind\\s+css)\\b"),
            new KeywordPattern("Bootstrap", "\\bbootstrap\\b"),
            new KeywordPattern("Sass", "\\bsass\\b"),
            new KeywordPattern("jQuery", "\\bjquery\\b"),

            // Backend
            new KeywordPattern("Node.js", "\\b(?:node\\.?js|nodejs|node)\\b"),
            new KeywordPattern("Express.js", "\\b(?:express\\.?js|expressjs|express)\\b"),
            new KeywordPattern("Spring Boot", "\\b(?:spring\\s+boot|springboot|spring\\s+framework)\\b"),
            new KeywordPattern("Django", "\\bdjango\\b"),
            new KeywordPattern("Flask", "\\bflask\\b"),
            new KeywordPattern("FastAPI", "\\bfastapi\\b"),
            new KeywordPattern("NestJS", "\\b(?:nest\\.?js|nestjs)\\b"),
            new KeywordPattern(".NET", "(?:\\.net|dotnet|asp\\.net)\\b"),
            new KeywordPattern("Laravel", "\\blaravel\\b"),

            // Mobile
            new KeywordPattern("Flutter", "\\bflutter\\b"),
            new KeywordPattern("React Native", "\\breact[\\s-]native\\b"),

            // Databases
            new KeywordPattern("MongoDB", "\\b(?:mongodb|mongo)\\b"),
            new KeywordPattern("PostgreSQL", "\\b(?:postgresql|postgres)\\b"),
            new KeywordPattern("MySQL", "\\bmysql\\b"),
            new KeywordPattern("SQLite", "\\bsqlite\\b"),
            new KeywordPattern("Redis", "\\bredis\\b"),
            new KeywordPattern("Oracle DB", "\\boracle(?:\\s+db)?\\b"),
            new KeywordPattern("Firebase", "\\bfirebase\\b"),

            // Cloud & DevOps
            new KeywordPattern("AWS", "\\b(?:aws|amazon\\s+web\\s+services)\\b"),
            new KeywordPattern("Azure", "\\b(?:azure|microsoft\\s+azure)\\b"),
            new KeywordPattern("GCP", "\\b(?:gcp|google\\s+cloud(?:\\s+platform)?)\\b"),
            new KeywordPattern("Docker", "\\bdocker\\b"),
            new KeywordPattern("Kubernetes", "\\b(?:kubernetes|k8s)\\b"),
            new KeywordPattern("Jenkins", "\\bjenkins\\b"),
            new KeywordPattern("Git", "\\bgit\\b"),
            new KeywordPattern("GitHub", "\\bgithub\\b"),
            new KeywordPattern("GitLab", "\\bgitlab\\b"),
            new KeywordPattern("CI/CD", "\\bci[/-]?cd\\b"),
            new KeywordPattern("Linux", "\\blinux\\b"),

            // Data Science, AI & ML
            new KeywordPattern("Machine Learning", "\\bmachine\\s+learning\\b"),
            new KeywordPattern("Deep Learning", "\\bdeep\\s+learning\\b"),
            new KeywordPattern("Artificial Intelligence", "\\bartificial\\s+intelligence\\b"),
            new KeywordPattern("NLP", "\\b(?:nlp|natural\\s+language\\s+processing)\\b"),
            new KeywordPattern("TensorFlow", "\\btensorflow\\b"),
            new KeywordPattern("PyTorch", "\\bpytorch\\b"),
            new KeywordPattern("Pandas", "\\bpandas\\b"),
            new KeywordPattern("NumPy", "\\bnumpy\\b"),
            new KeywordPattern("Tableau", "\\btableau\\b"),
            new KeywordPattern("Power BI", "\\bpower\\s*bi\\b"),

            // CS Fundamentals & Methodologies
            new KeywordPattern("Data Structures", "\\bdata\\s+structures\\b"),
            new KeywordPattern("Algorithms", "\\balgorithms\\b"),
            new KeywordPattern("Data Structures & Algorithms", "\\b(?:dsa|data\\s+structures\\s+(?:and|&)\\s+algorithms)\\b"),
            new KeywordPattern("OOP", "\\b(?:oop|oops|object[\\s-]oriented(?:\\s+programming)?)\\b"),
            new KeywordPattern("REST APIs", "\\b(?:rest|restful)(?:\\s+apis?|\\s+web\\s+services)?\\b"),
            new KeywordPattern("GraphQL", "\\bgraphql\\b"),
            new KeywordPattern("Microservices", "\\bmicroservices\\b"),
            new KeywordPattern("DBMS", "\\bdbms\\b"),
            new KeywordPattern("Agile", "\\bagile\\b")
    );

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    private static final Pattern PHONE_PATTERN =
            Pattern.compile("(?:\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3,5}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{3,4}");
    private static final Pattern GITHUB_PATTERN =
            Pattern.compile("github\\.com/[a-zA-Z0-9_-]+", Pattern.CASE_INSENSITIVE);
    private static final Pattern LINKEDIN_PATTERN =
            Pattern.compile("linkedin\\.com/in/[a-zA-Z0-9_-]+", Pattern.CASE_INSENSITIVE);

    @Transactional(readOnly = true)
    public ResumeAnalysisResponseDTO parseMyResume(Long studentId) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student account not found"));

        if (student.getResumeFileName() == null || student.getResumeFileName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No resume file found on your profile. Please upload a resume first.");
        }

        Resource resource = resumeStorageService.loadFileAsResource(student.getResumeFileName());
        if (!resource.exists()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resume file not found on server disk");
        }

        String filename = student.getResumeFileName();
        String originalName = student.getResumeOriginalName() != null && !student.getResumeOriginalName().isBlank()
                ? student.getResumeOriginalName()
                : "Resume Document";

        String ext = "";
        int dotIdx = filename.lastIndexOf('.');
        if (dotIdx >= 0) {
            ext = filename.substring(dotIdx).toLowerCase();
        }

        if (ext.equals(".doc")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Text extraction is not supported for legacy binary .doc files. Please use modern PDF (.pdf) or Word (.docx) format.");
        }

        if (!ext.equals(".pdf") && !ext.equals(".docx")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported file type '" + ext + "'. Supported formats are PDF (.pdf) and DOCX (.docx).");
        }

        String extractedText;
        try {
            if (ext.equals(".pdf")) {
                extractedText = extractTextFromPdf(resource);
            } else {
                extractedText = extractTextFromDocx(resource);
            }
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception ex) {
            log.error("Failed to parse document content for student {}: {}", studentId, ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to parse document content: " + ex.getMessage());
        }

        // Query active placement drive skills safely
        List<String> activeDriveSkills = getActiveDriveSkills();

        List<String> extractedSkills = extractSkillsFromText(extractedText);
        ContactInfoDTO contactInfo = extractContactInfo(extractedText);
        int wordCount = extractedText.isBlank() ? 0 : extractedText.trim().split("\\s+").length;
        int characterCount = extractedText.length();

        List<ResumeSuggestionDTO> suggestions = generateResumeSuggestions(
                extractedText,
                extractedSkills,
                contactInfo,
                wordCount,
                activeDriveSkills
        );

        List<String> currentProfileSkills = student.getSkills() != null
                ? student.getSkills().stream().map(StudentSkill::getSkill).filter(Objects::nonNull).map(String::trim).filter(s -> !s.isEmpty()).distinct().collect(Collectors.toList())
                : Collections.emptyList();

        List<String> newSkillsFound = findNewSkills(extractedSkills, currentProfileSkills);

        ResumeAnalysisResponseDTO response = new ResumeAnalysisResponseDTO();
        response.setOriginalName(originalName);
        response.setFileType(ext.replace(".", "").toUpperCase());
        response.setCharacterCount(characterCount);
        response.setWordCount(wordCount);
        response.setExtractedSkills(extractedSkills);
        response.setNewSkillsFound(newSkillsFound);
        response.setCurrentProfileSkills(currentProfileSkills);
        response.setContactInfo(contactInfo);
        response.setSuggestions(suggestions);

        log.info("Successfully analyzed resume for student {} - Extracted {} skills, {} new skills, {} words",
                studentId, extractedSkills.size(), newSkillsFound.size(), wordCount);

        return response;
    }

    private String extractTextFromPdf(Resource resource) throws Exception {
        byte[] bytes = resource.getContentAsByteArray();
        try (PDDocument document = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            return text != null ? text.replace("\r\n", "\n").trim() : "";
        }
    }

    private String extractTextFromDocx(Resource resource) throws Exception {
        try (InputStream is = resource.getInputStream();
             XWPFDocument doc = new XWPFDocument(is);
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            String text = extractor.getText();
            return text != null ? text.replace("\r\n", "\n").trim() : "";
        }
    }

    public List<String> extractSkillsFromText(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }

        List<String> matched = new ArrayList<>();
        for (KeywordPattern kp : TECHNICAL_KEYWORDS) {
            if (kp.pattern.matcher(text).find()) {
                matched.add(kp.name);
            }
        }

        return SkillMatcherUtil.normalizeSkillList(matched);
    }

    public ContactInfoDTO extractContactInfo(String text) {
        if (text == null || text.isBlank()) {
            return new ContactInfoDTO(null, null, Collections.emptyList());
        }

        String email = null;
        Matcher emailMatcher = EMAIL_PATTERN.matcher(text);
        if (emailMatcher.find()) {
            email = emailMatcher.group().toLowerCase();
        }

        String phone = null;
        Matcher phoneMatcher = PHONE_PATTERN.matcher(text);
        if (phoneMatcher.find()) {
            phone = phoneMatcher.group().trim();
        }

        List<String> links = new ArrayList<>();
        Matcher githubMatcher = GITHUB_PATTERN.matcher(text);
        if (githubMatcher.find()) {
            links.add("https://" + githubMatcher.group());
        }

        Matcher linkedinMatcher = LINKEDIN_PATTERN.matcher(text);
        if (linkedinMatcher.find()) {
            links.add("https://" + linkedinMatcher.group());
        }

        return new ContactInfoDTO(email, phone, links);
    }

    public List<String> findNewSkills(List<String> extractedSkills, List<String> currentProfileSkills) {
        if (extractedSkills == null || extractedSkills.isEmpty()) {
            return Collections.emptyList();
        }

        Set<String> currentLowerSet = currentProfileSkills != null
                ? currentProfileSkills.stream().map(s -> s.trim().toLowerCase()).collect(Collectors.toSet())
                : Collections.emptySet();

        return extractedSkills.stream()
                .filter(s -> s != null && !s.trim().isEmpty() && !currentLowerSet.contains(s.trim().toLowerCase()))
                .collect(Collectors.toList());
    }

    private List<String> getActiveDriveSkills() {
        try {
            List<PlacementDrive> activeDrives = new ArrayList<>();
            activeDrives.addAll(placementDriveRepository.findByStatus("Upcoming"));
            activeDrives.addAll(placementDriveRepository.findByStatus("Ongoing"));

            Map<String, Integer> skillFreq = new HashMap<>();
            for (PlacementDrive drive : activeDrives) {
                if (drive.getRequiredSkills() != null) {
                    for (DriveRequiredSkill req : drive.getRequiredSkills()) {
                        String s = req.getSkill();
                        if (s != null && !s.trim().isEmpty()) {
                            String trimmed = s.trim();
                            skillFreq.put(trimmed, skillFreq.getOrDefault(trimmed, 0) + 1);
                        }
                    }
                }
            }

            return skillFreq.entrySet().stream()
                    .sorted((e1, e2) -> e2.getValue().compareTo(e1.getValue()))
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());
        } catch (Exception ex) {
            log.warn("Failed to query active drive skills context: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    public List<ResumeSuggestionDTO> generateResumeSuggestions(
            String text,
            List<String> extractedSkills,
            ContactInfoDTO contactInfo,
            int wordCount,
            List<String> activeDriveSkills
    ) {
        List<ResumeSuggestionDTO> suggestions = new ArrayList<>();
        String rawText = text != null ? text.trim() : "";
        int words = wordCount > 0 ? wordCount : (rawText.isEmpty() ? 0 : rawText.split("\\s+").length);

        // 1. Guard against empty or unextractable text
        if (rawText.isEmpty() || words == 0) {
            suggestions.add(new ResumeSuggestionDTO(
                    "doc-empty",
                    "content",
                    "empty_document",
                    "No Extractable Text Detected",
                    "The resume file appears to have no readable text layers. It may be a scanned image, blank page, or corrupted document.",
                    "Export your resume directly as a text-based PDF (from Microsoft Word, Google Docs, or LaTeX) rather than an image scan so applicant tracking systems can index it.",
                    false,
                    "warning"
            ));
            return suggestions;
        }

        // Section heading audit helper
        String[] lines = rawText.split("\\r?\\n");
        List<String> cleanLines = Arrays.stream(lines)
                .map(String::trim)
                .filter(l -> !l.isEmpty())
                .collect(Collectors.toList());

        // 2. Section Heading Audits
        // Education
        List<String> eduSynonyms = List.of(
                "education", "educational background", "academic background", "academics",
                "academic qualifications", "qualifications", "scholastic record", "scholastic achievements", "degrees"
        );
        if (hasSection(cleanLines, eduSynonyms)) {
            suggestions.add(new ResumeSuggestionDTO(
                    "section-education",
                    "structure",
                    "section_present",
                    "Education Section Present",
                    "An Education or Academic Qualifications section heading was identified.",
                    "Ensure your degree, institution name, major, CGPA/percentage, and expected graduation year are clearly visible.",
                    true,
                    "success"
            ));
        } else {
            suggestions.add(new ResumeSuggestionDTO(
                    "section-education",
                    "structure",
                    "section_missing",
                    "Missing Education Section",
                    "No distinct Education or Academic Background section heading was detected.",
                    "Add a dedicated Education section listing your current degree, college name, branch, graduation year, and CGPA.",
                    false,
                    "warning"
            ));
        }

        // Projects
        List<String> projectSynonyms = List.of(
                "projects", "academic projects", "technical projects", "personal projects",
                "coursework projects", "key projects", "selected projects", "capstone project", "major projects"
        );
        if (hasSection(cleanLines, projectSynonyms)) {
            suggestions.add(new ResumeSuggestionDTO(
                    "section-projects",
                    "structure",
                    "section_present",
                    "Projects Section Present",
                    "A dedicated Projects section was identified in your resume.",
                    "Highlight 2-3 key technical projects with bullet points detailing the problem, stack, and measurable impact.",
                    true,
                    "success"
            ));
        } else {
            suggestions.add(new ResumeSuggestionDTO(
                    "section-projects",
                    "structure",
                    "section_missing",
                    "Missing Projects Section",
                    "No dedicated Projects section heading was detected in the document.",
                    "Include a Projects section showcasing software, hardware, or research work with technologies used and GitHub links.",
                    false,
                    "warning"
            ));
        }

        // Experience
        List<String> expSynonyms = List.of(
                "experience", "work experience", "employment history", "internships",
                "internship experience", "professional experience", "work history",
                "practical training", "industrial training", "relevant experience", "apprenticeship"
        );
        if (hasSection(cleanLines, expSynonyms)) {
            suggestions.add(new ResumeSuggestionDTO(
                    "section-experience",
                    "structure",
                    "section_present",
                    "Experience / Internship Section Present",
                    "An Experience, Internship, or Industrial Training section was detected.",
                    "Use action verbs (e.g., Developed, Optimized, Integrated) and quantify results where possible.",
                    true,
                    "success"
            ));
        } else {
            suggestions.add(new ResumeSuggestionDTO(
                    "section-experience",
                    "structure",
                    "section_missing",
                    "No Experience / Internship Section Detected",
                    "No formal Experience or Internship section heading was detected in the document.",
                    "If you have completed internships, open-source work, or campus leadership roles, add an Experience section. If you are a fresher without prior internships, expand your Projects and Technical Skills sections.",
                    false,
                    "info"
            ));
        }

        // Skills
        List<String> skillsSynonyms = List.of(
                "skills", "technical skills", "technologies", "core competencies",
                "key skills", "skillset", "areas of expertise", "programming skills",
                "tools & technologies", "competencies"
        );
        if (hasSection(cleanLines, skillsSynonyms)) {
            suggestions.add(new ResumeSuggestionDTO(
                    "section-skills",
                    "structure",
                    "section_present",
                    "Technical Skills Section Present",
                    "A dedicated Skills or Technical Competencies section heading was identified.",
                    "Group skills by categories (e.g., Languages, Frameworks, Databases, Developer Tools) for fast recruiter scanning.",
                    true,
                    "success"
            ));
        } else {
            suggestions.add(new ResumeSuggestionDTO(
                    "section-skills",
                    "structure",
                    "section_missing",
                    "Missing Dedicated Skills Section",
                    "No distinct Technical Skills or Competencies section heading was detected.",
                    "Create a categorized Technical Skills section listing your programming languages, frameworks, and developer tools.",
                    false,
                    "warning"
            ));
        }

        // 3. Length / Word Count Feedback
        if (words < 150) {
            suggestions.add(new ResumeSuggestionDTO(
                    "length-short",
                    "length",
                    "length",
                    "Resume Content is Very Brief",
                    String.format("Extracted length is %d words. Resumes with fewer than 150 words often lack adequate detail on technical projects, coursework, or responsibilities.", words),
                    "Expand on your project architectures, tools utilized, and specific contributions to reach 200–500 words.",
                    false,
                    "warning"
            ));
        } else if (words <= 650) {
            suggestions.add(new ResumeSuggestionDTO(
                    "length-optimal",
                    "length",
                    "length",
                    "Optimal Resume Length",
                    String.format("Extracted length is %d words, which fits cleanly within the standard single-page target (150–650 words) for undergraduate placements.", words),
                    "Maintain crisp bullet points and consistent formatting to ensure effortless readability during campus screenings.",
                    true,
                    "success"
            ));
        } else if (words <= 850) {
            suggestions.add(new ResumeSuggestionDTO(
                    "length-dense",
                    "length",
                    "length",
                    "Dense Resume Content",
                    String.format("Extracted length is %d words. This is on the longer side for a fresher resume and may risk crowding the page or overflowing into a second sheet.", words),
                    "Ensure your margins, line spacing, and font size remain readable, or trim older high school details to keep it strictly 1 page.",
                    false,
                    "info"
            ));
        } else {
            suggestions.add(new ResumeSuggestionDTO(
                    "length-long",
                    "length",
                    "length",
                    "Resume is Unusually Long",
                    String.format("Extracted length is %d words. Campus placement recruiters typically spend 20–30 seconds skimming fresh graduate resumes and strongly favor a concise 1-page profile.", words),
                    "Condense older, duplicate, or secondary coursework details into high-impact bullet points to avoid multi-page sprawl.",
                    false,
                    "warning"
            ));
        }

        // 4. Contact Information Audits
        boolean hasEmail = contactInfo != null && contactInfo.getEmail() != null && !contactInfo.getEmail().isBlank();
        boolean hasPhone = contactInfo != null && contactInfo.getPhone() != null && !contactInfo.getPhone().isBlank();
        List<String> links = contactInfo != null && contactInfo.getLinks() != null ? contactInfo.getLinks() : Collections.emptyList();

        if (hasEmail && hasPhone) {
            suggestions.add(new ResumeSuggestionDTO(
                    "contact-complete",
                    "contact",
                    "contact_info",
                    "Essential Contact Details Detected",
                    String.format("Identified reachable contact email (%s) and phone number (%s).", contactInfo.getEmail(), contactInfo.getPhone()),
                    "Ensure contact details remain at the top header of the resume where recruiters expect them.",
                    true,
                    "success"
            ));
        } else {
            if (!hasEmail) {
                suggestions.add(new ResumeSuggestionDTO(
                        "contact-missing-email",
                        "contact",
                        "contact_info",
                        "Missing Contact Email",
                        "No valid email address was detected in the document text.",
                        "Add a professional email address (college institutional or personal) in the header.",
                        false,
                        "warning"
                ));
            }
            if (!hasPhone) {
                suggestions.add(new ResumeSuggestionDTO(
                        "contact-missing-phone",
                        "contact",
                        "contact_info",
                        "Missing Phone Number",
                        "No phone number was identified in the resume text.",
                        "Include an active 10-digit mobile number with country code in your header.",
                        false,
                        "warning"
                ));
            }
        }

        // Links
        if (!links.isEmpty()) {
            suggestions.add(new ResumeSuggestionDTO(
                    "contact-links-present",
                    "contact",
                    "contact_links",
                    "Professional Profiles Linked",
                    String.format("Identified %d portfolio link(s): %s.", links.size(), String.join(", ", links)),
                    "Verify that your linked profiles are active, have professional photos, and showcase clean project repositories.",
                    true,
                    "success"
            ));
        } else {
            suggestions.add(new ResumeSuggestionDTO(
                    "contact-links-missing",
                    "contact",
                    "contact_links",
                    "Consider Adding GitHub or LinkedIn Profiles",
                    "No GitHub or LinkedIn profile links were found in the resume.",
                    "Include hyperlinks to your LinkedIn profile and GitHub portfolio to allow recruiters to review your code and professional background.",
                    false,
                    "info"
            ));
        }

        // 5. Active Drive Skills Gap Feedback
        if (activeDriveSkills != null && !activeDriveSkills.isEmpty()) {
            Set<String> resumeSkillSet = extractedSkills != null
                    ? extractedSkills.stream().map(s -> s.trim().toLowerCase()).collect(Collectors.toSet())
                    : Collections.emptySet();

            List<String> missingDriveSkills = new ArrayList<>();
            for (String driveSkill : activeDriveSkills) {
                if (driveSkill != null && !driveSkill.trim().isEmpty()) {
                    String cleanSkill = driveSkill.trim();
                    if (!resumeSkillSet.contains(cleanSkill.toLowerCase())) {
                        missingDriveSkills.add(cleanSkill);
                    }
                }
            }

            if (!missingDriveSkills.isEmpty()) {
                List<String> topMissing = missingDriveSkills.stream().limit(4).collect(Collectors.toList());
                suggestions.add(new ResumeSuggestionDTO(
                        "skills-drive-gap",
                        "skills",
                        "skills_gap",
                        "In-Demand Campus Skills Gap",
                        String.format("Active campus placement drives frequently seek %s, which were not identified in your resume text.", String.join(", ", topMissing)),
                        String.format("If you have coursework, project, or certification experience with any of these (%s), incorporate them into your Skills or Projects sections to increase recruiter match scores.", String.join(", ", topMissing)),
                        false,
                        "info"
                ));
            } else {
                suggestions.add(new ResumeSuggestionDTO(
                        "skills-drive-match",
                        "skills",
                        "skills_gap",
                        "Strong Campus Drive Skill Alignment",
                        "Your resume features key technical skills actively sought by current campus placement opportunities.",
                        "Keep project descriptions updated with specific versions and tools to substantiate your proficiency.",
                        true,
                        "success"
                ));
            }
        }

        return suggestions;
    }

    private boolean hasSection(List<String> lines, List<String> synonyms) {
        for (String syn : synonyms) {
            Pattern exactHeading = Pattern.compile("^[#*\\-\\d.\\s]*" + Pattern.quote(syn) + "[:\\s*#\\-–—|]*$", Pattern.CASE_INSENSITIVE);
            Pattern inlineHeading = Pattern.compile("^[#*\\-\\d.\\s]*" + Pattern.quote(syn) + "\\s*[:\\-–—]", Pattern.CASE_INSENSITIVE);
            Pattern shortLinePattern = Pattern.compile("\\b" + Pattern.quote(syn) + "\\b", Pattern.CASE_INSENSITIVE);

            for (String line : lines) {
                if (exactHeading.matcher(line).find() || inlineHeading.matcher(line).find()) {
                    return true;
                }
                if (line.length() <= 40 && shortLinePattern.matcher(line).find()) {
                    String[] words = line.split("\\s+");
                    if (!line.endsWith(".") && words.length <= 5) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
