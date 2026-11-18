package com.placement.portal.service;

import com.placement.portal.dto.ai.ContactInfoDTO;
import com.placement.portal.dto.ai.ResumeSuggestionDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ResumeParserServiceTest {

    private ResumeParserService service;

    @BeforeEach
    void setUp() {
        service = new ResumeParserService();
    }

    @Test
    @DisplayName("extractSkillsFromText detects programming languages, frameworks, databases, and DevOps keywords")
    void testExtractSkillsFromText() {
        String sampleText = """
                Technical Competencies:
                Proficient in Java, Python, C++, TypeScript, and SQL.
                Experience with React, Next.js, Node.js, Spring Boot, and Express.js.
                Databases: PostgreSQL, MongoDB, Redis, and MySQL.
                Tools & Platforms: Docker, Kubernetes, Git, GitHub, AWS, and CI/CD pipelines.
                Concepts: Data Structures & Algorithms, REST APIs, Microservices, and Agile methodologies.
                """;

        List<String> skills = service.extractSkillsFromText(sampleText);

        assertThat(skills).contains(
                "Java", "Python", "C++", "TypeScript", "SQL",
                "React", "Next.js", "Node.js", "Spring Boot", "Express.js",
                "PostgreSQL", "MongoDB", "Redis", "MySQL",
                "Docker", "Kubernetes", "Git", "GitHub", "AWS", "CI/CD",
                "Data Structures & Algorithms", "REST APIs", "Microservices", "Agile"
        );
    }

    @Test
    @DisplayName("extractContactInfo extracts valid email, phone number, GitHub and LinkedIn links")
    void testExtractContactInfo() {
        String sampleText = """
                Jane Smith
                Contact: jane.smith@example.org | Phone: +91 9876543210
                Portfolio & Profiles: github.com/janesmith and linkedin.com/in/janesmith-developer
                """;

        ContactInfoDTO contact = service.extractContactInfo(sampleText);

        assertThat(contact.getEmail()).isEqualTo("jane.smith@example.org");
        assertThat(contact.getPhone()).contains("9876543210");
        assertThat(contact.getLinks()).containsExactlyInAnyOrder(
                "https://github.com/janesmith",
                "https://linkedin.com/in/janesmith-developer"
        );
    }

    @Test
    @DisplayName("findNewSkills filters out existing student profile skills accurately (case-insensitive)")
    void testFindNewSkills() {
        List<String> extracted = List.of("Java", "Spring Boot", "React", "Docker", "PostgreSQL");
        List<String> current = List.of("java", "react");

        List<String> newSkills = service.findNewSkills(extracted, current);

        assertThat(newSkills).containsExactlyInAnyOrder("Spring Boot", "Docker", "PostgreSQL");
    }

    @Test
    @DisplayName("generateResumeSuggestions identifies empty document")
    void testGenerateResumeSuggestionsEmptyText() {
        List<ResumeSuggestionDTO> suggestions = service.generateResumeSuggestions(
                "", List.of(), null, 0, List.of()
        );

        assertThat(suggestions).hasSize(1);
        assertThat(suggestions.get(0).getId()).isEqualTo("doc-empty");
        assertThat(suggestions.get(0).isPositive()).isFalse();
        assertThat(suggestions.get(0).getSeverity()).isEqualTo("warning");
    }

    @Test
    @DisplayName("generateResumeSuggestions audits sections, word count, and drive skill gaps")
    void testGenerateResumeSuggestionsFull() {
        String resumeText = """
                Education
                B.Tech in Computer Science and Engineering, 2026. CGPA: 9.0
                
                Technical Skills
                Java, Spring Boot, MySQL
                
                Projects
                Campus Recruitment Management System using Java and React.
                
                Experience
                Software Engineering Intern at Startup ABC.
                
                Email: student@college.edu Phone: 9988776655
                """;

        List<String> skills = List.of("Java", "Spring Boot", "MySQL", "React");
        ContactInfoDTO contact = new ContactInfoDTO("student@college.edu", "9988776655", List.of());
        List<String> driveSkills = List.of("Java", "Docker", "AWS");

        List<ResumeSuggestionDTO> suggestions = service.generateResumeSuggestions(
                resumeText, skills, contact, 50, driveSkills
        );

        // Sections: Education, Skills, Projects, Experience should all be present
        assertThat(suggestions).anyMatch(s -> "section-education".equals(s.getId()) && s.isPositive());
        assertThat(suggestions).anyMatch(s -> "section-skills".equals(s.getId()) && s.isPositive());
        assertThat(suggestions).anyMatch(s -> "section-projects".equals(s.getId()) && s.isPositive());
        assertThat(suggestions).anyMatch(s -> "section-experience".equals(s.getId()) && s.isPositive());

        // Length: 50 words is < 150 words -> length-short warning
        assertThat(suggestions).anyMatch(s -> "length-short".equals(s.getId()) && !s.isPositive());

        // Contact info: email and phone present -> contact-complete
        assertThat(suggestions).anyMatch(s -> "contact-complete".equals(s.getId()) && s.isPositive());

        // Contact links: missing links -> contact-links-missing
        assertThat(suggestions).anyMatch(s -> "contact-links-missing".equals(s.getId()) && !s.isPositive());

        // Skills gap: Docker and AWS missing from resume -> skills-drive-gap
        assertThat(suggestions).anyMatch(s -> "skills-drive-gap".equals(s.getId()) && !s.isPositive());
    }
}

