package com.placement.portal;

import com.placement.portal.condition.DatabaseCredentialsCondition;
import com.placement.portal.dto.ApiResponse;
import com.placement.portal.dto.drive.DriveRequest;
import com.placement.portal.dto.drive.DriveResponseDTO;
import com.placement.portal.dto.drive.EligibilityDTO;
import com.placement.portal.entity.*;
import com.placement.portal.repository.CompanyRepository;
import com.placement.portal.repository.PlacementDriveRepository;
import com.placement.portal.service.PlacementDriveService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(DatabaseCredentialsCondition.class)
@SpringBootTest(classes = PortalApplication.class)
@TestPropertySource(locations = "classpath:application-test.properties")
@Transactional
public class PlacementDriveDatabaseIntegrationTest {

    @Autowired(required = false)
    private PlacementDriveService placementDriveService;

    @Autowired(required = false)
    private PlacementDriveRepository placementDriveRepository;

    @Autowired(required = false)
    private CompanyRepository companyRepository;

    @Test
    @DisplayName("Database-backed regression: updating commencement date with existing branches (CSE, IT, ECE, AI&DS) does not violate uk_drive_branch")
    void testUpdateDrive_CommencementDateChangeWithSameBranches_DoesNotViolateUniqueConstraint() {
        assertNotNull(placementDriveService, "PlacementDriveService must be injected");
        assertNotNull(placementDriveRepository, "PlacementDriveRepository must be injected");
        assertNotNull(companyRepository, "CompanyRepository must be injected");

        // Use existing company from test database or create fallback
        Company company = companyRepository.findAll().stream().findFirst()
                .orElseGet(() -> {
                    Company c = new Company();
                    c.setName("Test Recruiter Ltd");
                    c.setIndustry("Technology");
                    c.setLocation("Bangalore");
                    c.setContactEmail("recruiter@test.com");
                    return companyRepository.saveAndFlush(c);
                });

        // 1. Create a drive in the real test database with the 4 branches from the live bug report
        PlacementDrive drive = new PlacementDrive();
        drive.setCompany(company);
        drive.setTitle("Software Engineer 2026");
        drive.setJobRole("Full Stack Developer");
        drive.setJobDescription("Full-stack development role");
        drive.setPackageCtc("12 LPA");
        drive.setLocation("Bangalore");
        drive.setMinCgpa(new BigDecimal("6.50"));
        drive.setMaxBacklogs(0);
        drive.setPassingYear(2026);
        drive.setDriveDate(Instant.parse("2026-11-01T00:00:00Z"));
        drive.setDeadline(Instant.parse("2026-10-31T00:00:00Z"));
        drive.setStatus("Upcoming");

        drive.getAllowedBranches().add(new DriveAllowedBranch(drive, "CSE"));
        drive.getAllowedBranches().add(new DriveAllowedBranch(drive, "IT"));
        drive.getAllowedBranches().add(new DriveAllowedBranch(drive, "ECE"));
        drive.getAllowedBranches().add(new DriveAllowedBranch(drive, "AI&DS"));

        drive.getRequiredSkills().add(new DriveRequiredSkill(drive, "Java"));
        drive.getRequiredSkills().add(new DriveRequiredSkill(drive, "Spring Boot"));
        drive.getRequiredSkills().add(new DriveRequiredSkill(drive, "MySQL"));

        drive = placementDriveRepository.saveAndFlush(drive);
        Long driveId = drive.getId();

        // 2. Prepare update request that changes ONLY commencement date to 06-11-2026,
        // while resending the exact same branches: CSE, IT, ECE, AI&DS
        DriveRequest request = new DriveRequest();
        request.setCompany(company.getId());
        request.setTitle(drive.getTitle());
        request.setJobRole(drive.getJobRole());
        request.setJobDescription(drive.getJobDescription());
        request.setPackageCTC(drive.getPackageCtc());
        request.setLocation(drive.getLocation());
        request.setDriveDate(Instant.parse("2026-11-06T00:00:00Z"));
        request.setDeadline(drive.getDeadline());
        request.setStatus(drive.getStatus());

        EligibilityDTO eligibility = new EligibilityDTO();
        eligibility.setMinCGPA(new BigDecimal("6.50"));
        eligibility.setAllowedBranches(List.of("CSE", "IT", "ECE", "AI&DS"));
        eligibility.setMaxBacklogs(0);
        eligibility.setPassingYear(2026);
        request.setEligibility(eligibility);

        request.setRequiredSkills(List.of("Java", "Spring Boot", "MySQL"));

        // 3. Execute updateDrive through the service layer
        ApiResponse<DriveResponseDTO> response = placementDriveService.updateDrive(driveId, request);
        assertTrue(response.isSuccess(), "updateDrive must succeed");

        // 4. Force Hibernate to flush all actions to MySQL
        // If the bug were present, this flush would immediately fail with:
        // Duplicate entry 'X-AI&DS' for key 'drive_allowed_branches.uk_drive_branch'
        assertDoesNotThrow(() -> placementDriveRepository.flush(),
                "Flushing to database must not throw unique constraint violation for (drive_id, branch)");

        // 5. Verify the persisted entity in the database
        PlacementDrive persisted = placementDriveRepository.findById(driveId).orElseThrow();
        assertEquals(Instant.parse("2026-11-06T00:00:00Z"), persisted.getDriveDate(),
                "Commencement date must be persisted as 06-11-2026");
        assertEquals(4, persisted.getAllowedBranches().size(),
                "Allowed branches must contain exactly 4 rows");

        List<String> branches = persisted.getAllowedBranches().stream()
                .map(DriveAllowedBranch::getBranch)
                .toList();
        assertTrue(branches.containsAll(List.of("CSE", "IT", "ECE", "AI&DS")),
                "All 4 branches must be present without duplicates");

        assertEquals(3, persisted.getRequiredSkills().size(),
                "Required skills must contain exactly 3 rows");
    }
}

