package com.placement.portal.service;

import com.placement.portal.dto.ApiResponse;
import com.placement.portal.dto.company.CompanyResponseDTO;
import com.placement.portal.dto.drive.*;
import com.placement.portal.entity.*;
import com.placement.portal.repository.*;
import com.placement.portal.security.UserPrincipal;
import com.placement.portal.util.SkillMatcherUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.*;

@Service
public class PlacementDriveService {

    @Autowired
    private PlacementDriveRepository placementDriveRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationWithdrawalRepository applicationWithdrawalRepository;

    @Autowired
    private UserRepository userRepository;

    public AcademicEligibilityDTO checkStudentEligibility(User student, PlacementDrive drive) {
        List<String> reasons = new ArrayList<>();
        boolean isEligible = true;

        if (student == null || !"student".equalsIgnoreCase(student.getRole())) {
            return new AcademicEligibilityDTO(true, Collections.emptyList());
        }

        BigDecimal minCgpa = drive.getMinCgpa();
        BigDecimal studentCgpa = student.getCgpa() != null ? student.getCgpa() : BigDecimal.ZERO;
        if (minCgpa != null && studentCgpa.compareTo(minCgpa) < 0) {
            isEligible = false;
            reasons.add("CGPA requirement not met (Your CGPA: " + studentCgpa + ", Required: " + minCgpa + ")");
        }

        List<String> allowedBranches = drive.getAllowedBranches() != null
                ? drive.getAllowedBranches().stream().map(DriveAllowedBranch::getBranch).toList()
                : Collections.emptyList();
        if (!allowedBranches.isEmpty() && (student.getBranch() == null || !allowedBranches.contains(student.getBranch()))) {
            isEligible = false;
            reasons.add("Branch '" + (student.getBranch() != null ? student.getBranch() : "None") +
                    "' is not eligible (Eligible: " + String.join(", ", allowedBranches) + ")");
        }

        Integer maxBacklogs = drive.getMaxBacklogs();
        int studentBacklogs = student.getActiveBacklogs() != null ? student.getActiveBacklogs() : 0;
        if (maxBacklogs != null && studentBacklogs > maxBacklogs) {
            isEligible = false;
            reasons.add("Active backlogs (" + studentBacklogs + ") exceeds limit (" + maxBacklogs + ")");
        }

        Integer targetYear = drive.getPassingYear();
        if (targetYear != null && student.getPassingYear() != null && !targetYear.equals(student.getPassingYear())) {
            isEligible = false;
            reasons.add("Batch mismatch (Your Batch: " + student.getPassingYear() + ", Target Batch: " + targetYear + ")");
        }

        return new AcademicEligibilityDTO(isEligible, reasons);
    }

    private int getRecommendationRankPriority(DriveRecommendationDTO rec) {
        boolean isEligible = rec.getAcademicEligibility() != null && rec.getAcademicEligibility().isEligible();
        if (!isEligible) return 4;
        int totalRequired = rec.getSkillMatch() != null ? rec.getSkillMatch().getTotalRequired() : 0;
        int score = rec.getSkillMatch() != null ? rec.getSkillMatch().getScore() : 0;
        if (totalRequired > 0 && score > 0) return 1;
        if (totalRequired == 0) return 2;
        return 3;
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<DriveResponseDTO>> getAllDrives(String search, String status, String branch,
                                                           String eligibleOnly, UserPrincipal principal) {
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        String cleanStatus = (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status.trim()))
                ? status.trim()
                : null;
        String cleanBranch = (branch != null && !branch.trim().isEmpty() && !"ALL".equalsIgnoreCase(branch.trim()))
                ? branch.trim()
                : null;

        List<PlacementDrive> drives = placementDriveRepository.searchDrives(cleanSearch, cleanStatus, cleanBranch);

        User studentUser = null;
        Map<Long, Application> applicationMap = new HashMap<>();
        if (principal != null && "student".equalsIgnoreCase(principal.getRole())) {
            studentUser = userRepository.findById(principal.getId()).orElse(null);
            if (studentUser != null) {
                List<Application> apps = applicationRepository.findByStudentId(studentUser.getId());
                for (Application a : apps) {
                    applicationMap.put(a.getDrive().getId(), a);
                }
            }
        }

        List<DriveResponseDTO> dtos = new ArrayList<>();
        boolean filterEligible = "true".equalsIgnoreCase(eligibleOnly);

        for (PlacementDrive drive : drives) {
            long applicantCount = applicationRepository.countByDriveId(drive.getId());
            DriveResponseDTO dto = DriveResponseDTO.fromEntity(drive, applicantCount);

            if (studentUser != null) {
                AcademicEligibilityDTO eligibility = checkStudentEligibility(studentUser, drive);
                dto.setIsEligible(eligibility.isEligible());
                dto.setEligibilityReasons(eligibility.getReasons());

                Application app = applicationMap.get(drive.getId());
                dto.setHasApplied(app != null);
                if (app != null) {
                    dto.setMyApplicationStatus(app.getStatus());
                    dto.setMyApplicationId(app.getId() != null ? app.getId().toString() : null);
                }

                if (filterEligible && !eligibility.isEligible()) {
                    continue;
                }
            }

            dtos.add(dto);
        }

        return ApiResponse.okWithCount(dtos, dtos.size());
    }

    @Transactional(readOnly = true)
    public ApiResponse<DriveResponseDTO> getDriveById(Long id, UserPrincipal principal) {
        PlacementDrive drive = placementDriveRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Placement drive not found"));

        long applicantCount = applicationRepository.countByDriveId(drive.getId());
        DriveResponseDTO dto = DriveResponseDTO.fromEntity(drive, applicantCount);

        if (principal != null && "student".equalsIgnoreCase(principal.getRole())) {
            User student = userRepository.findById(principal.getId()).orElse(null);
            if (student != null) {
                AcademicEligibilityDTO eligibility = checkStudentEligibility(student, drive);
                dto.setIsEligible(eligibility.isEligible());
                dto.setEligibilityReasons(eligibility.getReasons());

                Optional<Application> appOpt = applicationRepository.findByDriveIdAndStudentId(id, student.getId());
                dto.setHasApplied(appOpt.isPresent());
                appOpt.ifPresent(app -> {
                    dto.setMyApplicationStatus(app.getStatus());
                    dto.setMyApplicationId(app.getId() != null ? app.getId().toString() : null);
                    Map<String, Object> appSummary = new HashMap<>();
                    appSummary.put("id", app.getId());
                    appSummary.put("status", app.getStatus());
                    appSummary.put("appliedAt", app.getAppliedAt());
                    appSummary.put("remarks", app.getRemarks());
                    dto.setMyApplication(appSummary);
                });
            }
        }

        return ApiResponse.ok(dto);
    }

    @Transactional
    public ApiResponse<DriveResponseDTO> createDrive(DriveRequest request, Long createdByUserId) {
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }
        if (request.getJobRole() == null || request.getJobRole().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job role is required");
        }
        if (request.getJobDescription() == null || request.getJobDescription().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job description is required");
        }
        if (request.getPackageCTC() == null || request.getPackageCTC().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Package CTC is required");
        }
        if (request.getLocation() == null || request.getLocation().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Location is required");
        }
        if (request.getDriveDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Drive date is required");
        }
        if (request.getDeadline() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Application deadline is required");
        }

        Long companyId = request.getResolvedCompanyId();
        if (companyId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company is required");
        }
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));

        PlacementDrive drive = new PlacementDrive();
        drive.setCompany(company);
        drive.setTitle(request.getTitle().trim());
        drive.setJobRole(request.getJobRole().trim());
        drive.setJobDescription(request.getJobDescription().trim());
        drive.setPackageCtc(request.getPackageCTC().trim());
        drive.setLocation(request.getLocation().trim());
        drive.setMinCgpa(request.getEffectiveMinCGPA());
        drive.setMaxBacklogs(request.getEffectiveMaxBacklogs());
        drive.setPassingYear(request.getEffectivePassingYear());
        drive.setDriveDate(request.getDriveDate());
        drive.setDeadline(request.getDeadline());
        drive.setStatus(request.getStatus() != null && !request.getStatus().isBlank() ? request.getStatus().trim() : "Upcoming");

        if (createdByUserId != null) {
            userRepository.findById(createdByUserId).ifPresent(drive::setCreatedBy);
        }

        // Allowed branches
        for (String branch : request.getEffectiveAllowedBranches()) {
            if (branch != null && !branch.trim().isEmpty()) {
                drive.getAllowedBranches().add(new DriveAllowedBranch(drive, branch.trim()));
            }
        }

        // Rounds
        List<String> roundNames = (request.getRounds() != null && !request.getRounds().isEmpty())
                ? request.getRounds()
                : List.of("Online Assessment", "Technical Interview", "HR Interview");
        for (int i = 0; i < roundNames.size(); i++) {
            String r = roundNames.get(i);
            if (r != null && !r.trim().isEmpty()) {
                drive.getRounds().add(new DriveRound(drive, i, r.trim()));
            }
        }

        // Required skills
        List<String> normalizedSkills = SkillMatcherUtil.normalizeSkillList(request.getRequiredSkills());
        for (String skill : normalizedSkills) {
            drive.getRequiredSkills().add(new DriveRequiredSkill(drive, skill));
        }

        PlacementDrive saved = placementDriveRepository.save(drive);
        DriveResponseDTO dto = DriveResponseDTO.fromEntity(saved, 0L);

        return ApiResponse.ok("Placement drive created successfully!", dto);
    }

    @Transactional
    public ApiResponse<DriveResponseDTO> updateDrive(Long id, DriveRequest request) {
        PlacementDrive drive = placementDriveRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Placement drive not found"));

        if (request.getTitle() != null && !request.getTitle().trim().isEmpty()) {
            drive.setTitle(request.getTitle().trim());
        }
        if (request.getJobRole() != null && !request.getJobRole().trim().isEmpty()) {
            drive.setJobRole(request.getJobRole().trim());
        }
        if (request.getJobDescription() != null && !request.getJobDescription().trim().isEmpty()) {
            drive.setJobDescription(request.getJobDescription().trim());
        }
        if (request.getPackageCTC() != null && !request.getPackageCTC().trim().isEmpty()) {
            drive.setPackageCtc(request.getPackageCTC().trim());
        }
        if (request.getLocation() != null && !request.getLocation().trim().isEmpty()) {
            drive.setLocation(request.getLocation().trim());
        }
        if (request.getDriveDate() != null) {
            drive.setDriveDate(request.getDriveDate());
        }
        if (request.getDeadline() != null) {
            drive.setDeadline(request.getDeadline());
        }
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            drive.setStatus(request.getStatus().trim());
        }

        Long companyId = request.getResolvedCompanyId();
        if (companyId != null && !companyId.equals(drive.getCompany().getId())) {
            Company company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));
            drive.setCompany(company);
        }

        if (request.getEligibility() != null || request.getMinCGPA() != null) {
            drive.setMinCgpa(request.getEffectiveMinCGPA());
            drive.setMaxBacklogs(request.getEffectiveMaxBacklogs());
            drive.setPassingYear(request.getEffectivePassingYear());
        }

        List<String> incomingBranches = null;
        if (request.getEligibility() != null && request.getEligibility().getAllowedBranches() != null) {
            incomingBranches = request.getEligibility().getAllowedBranches();
        } else if (request.getAllowedBranches() != null) {
            incomingBranches = request.getAllowedBranches();
        }

        if (incomingBranches != null) {
            Set<String> requestedBranches = new LinkedHashSet<>();
            for (String b : incomingBranches) {
                if (b != null && !b.trim().isEmpty()) {
                    requestedBranches.add(b.trim());
                }
            }

            // In-place reconciliation: remove existing branches that are no longer requested
            drive.getAllowedBranches().removeIf(ab -> !requestedBranches.contains(ab.getBranch()));

            // Identify existing branches that remain
            Set<String> existingBranches = new HashSet<>();
            for (DriveAllowedBranch ab : drive.getAllowedBranches()) {
                existingBranches.add(ab.getBranch());
            }

            // Add genuinely new branches only
            for (String b : requestedBranches) {
                if (!existingBranches.contains(b)) {
                    drive.getAllowedBranches().add(new DriveAllowedBranch(drive, b));
                }
            }
        }

        if (request.getRounds() != null) {
            drive.getRounds().clear();
            for (int i = 0; i < request.getRounds().size(); i++) {
                String r = request.getRounds().get(i);
                if (r != null && !r.trim().isEmpty()) {
                    drive.getRounds().add(new DriveRound(drive, i, r.trim()));
                }
            }
        }

        if (request.getRequiredSkills() != null) {
            List<String> normalizedSkills = SkillMatcherUtil.normalizeSkillList(request.getRequiredSkills());
            Set<String> requestedSkills = new LinkedHashSet<>();
            for (String s : normalizedSkills) {
                if (s != null && !s.trim().isEmpty()) {
                    requestedSkills.add(s.trim());
                }
            }

            // In-place reconciliation: remove existing skills that are no longer requested
            drive.getRequiredSkills().removeIf(rs -> !requestedSkills.contains(rs.getSkill()));

            // Identify existing skills that remain
            Set<String> existingSkills = new HashSet<>();
            for (DriveRequiredSkill rs : drive.getRequiredSkills()) {
                existingSkills.add(rs.getSkill());
            }

            // Add genuinely new skills only
            for (String s : requestedSkills) {
                if (!existingSkills.contains(s)) {
                    drive.getRequiredSkills().add(new DriveRequiredSkill(drive, s));
                }
            }
        }

        PlacementDrive updated = placementDriveRepository.save(drive);
        long applicantCount = applicationRepository.countByDriveId(id);

        return ApiResponse.ok("Placement drive updated successfully!", DriveResponseDTO.fromEntity(updated, applicantCount));
    }

    @Transactional
    public ApiResponse<Void> deleteDrive(Long id) {
        PlacementDrive drive = placementDriveRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Placement drive not found"));

        applicationWithdrawalRepository.deleteByDriveId(id);
        applicationRepository.deleteByDriveId(id);
        placementDriveRepository.delete(drive);

        return ApiResponse.message("Placement drive and all related applications deleted successfully");
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<DriveRecommendationDTO>> getDriveRecommendations(Long studentId) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student account not found"));

        List<Application> studentApps = applicationRepository.findByStudentId(studentId);
        Map<Long, Application> appMap = new HashMap<>();
        for (Application a : studentApps) {
            appMap.put(a.getDrive().getId(), a);
        }

        List<PlacementDrive> drives = placementDriveRepository.findByStatusNotOrderByDriveDateAscCreatedAtDesc("Cancelled");

        List<String> candidateSkills = student.getSkills() != null
                ? student.getSkills().stream().map(StudentSkill::getSkill).toList()
                : Collections.emptyList();

        List<DriveRecommendationDTO> recommendations = new ArrayList<>();

        for (PlacementDrive drive : drives) {
            DriveRecommendationDTO rec = new DriveRecommendationDTO();
            rec.setId(drive.getId());
            rec.set_id(drive.getId() != null ? drive.getId().toString() : null);
            rec.setTitle(drive.getTitle());
            rec.setJobRole(drive.getJobRole());
            rec.setJobDescription(drive.getJobDescription());
            rec.setPackageCTC(drive.getPackageCtc());
            rec.setLocation(drive.getLocation());
            rec.setDriveDate(drive.getDriveDate());
            rec.setDeadline(drive.getDeadline());
            rec.setStatus(drive.getStatus());
            rec.setCreatedAt(drive.getCreatedAt());
            rec.setUpdatedAt(drive.getUpdatedAt());

            if (drive.getCompany() != null) {
                rec.setCompany(CompanyResponseDTO.fromEntity(drive.getCompany()));
            }

            List<String> branches = drive.getAllowedBranches() != null
                    ? drive.getAllowedBranches().stream().map(DriveAllowedBranch::getBranch).toList()
                    : Collections.emptyList();
            rec.setEligibility(new EligibilityDTO(drive.getMinCgpa(), branches, drive.getMaxBacklogs(), drive.getPassingYear()));

            List<String> rounds = drive.getRounds() != null
                    ? drive.getRounds().stream().sorted(Comparator.comparing(DriveRound::getRoundOrder)).map(DriveRound::getRoundName).toList()
                    : Collections.emptyList();
            rec.setRounds(rounds);

            List<String> reqSkills = drive.getRequiredSkills() != null
                    ? drive.getRequiredSkills().stream().map(DriveRequiredSkill::getSkill).toList()
                    : Collections.emptyList();
            rec.setRequiredSkills(reqSkills);

            Application app = appMap.get(drive.getId());
            rec.setHasApplied(app != null);
            if (app != null) {
                rec.setMyApplicationStatus(app.getStatus());
                rec.setMyApplicationId(app.getId() != null ? app.getId().toString() : null);
            }

            AcademicEligibilityDTO academic = checkStudentEligibility(student, drive);
            rec.setIsEligible(academic.isEligible());
            rec.setEligibilityReasons(academic.getReasons());
            rec.setAcademicEligibility(academic);

            SkillMatcherUtil.SkillMatchResult match = SkillMatcherUtil.calculateSkillMatch(candidateSkills, reqSkills);
            SkillMatchResultDTO matchDto = new SkillMatchResultDTO(
                    match.score(),
                    match.matchPercentage(),
                    match.matchedSkills(),
                    match.missingSkills(),
                    match.additionalSkills(),
                    match.totalRequired(),
                    match.totalMatched(),
                    match.explanation()
            );
            rec.setSkillMatch(matchDto);

            String tier = "Potential Match";
            if (academic.isEligible()) {
                if (match.totalRequired() == 0) {
                    tier = "No Skill Filter";
                } else if (match.score() >= 70) {
                    tier = "High Match";
                } else if (match.score() >= 40) {
                    tier = "Moderate Match";
                }
            } else {
                tier = "Ineligible";
            }
            rec.setRecommendationTier(tier);

            recommendations.add(rec);
        }

        // Sort priority: Tier priority -> skill score desc -> drive date asc
        recommendations.sort((a, b) -> {
            int pA = getRecommendationRankPriority(a);
            int pB = getRecommendationRankPriority(b);
            if (pA != pB) return Integer.compare(pA, pB);

            int scoreA = a.getSkillMatch() != null ? a.getSkillMatch().getScore() : 0;
            int scoreB = b.getSkillMatch() != null ? b.getSkillMatch().getScore() : 0;
            if (scoreA != scoreB) return Integer.compare(scoreB, scoreA);

            if (a.getDriveDate() != null && b.getDriveDate() != null) {
                return a.getDriveDate().compareTo(b.getDriveDate());
            }
            return 0;
        });

        return ApiResponse.okWithCount(recommendations, recommendations.size());
    }

    @Transactional(readOnly = true)
    public ApiResponse<DriveMatchScoreDTO> getDriveMatchScore(Long driveId, Long studentId) {
        PlacementDrive drive = placementDriveRepository.findById(driveId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Placement drive not found"));

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student account not found"));

        Optional<Application> appOpt = applicationRepository.findByDriveIdAndStudentId(driveId, studentId);
        AcademicEligibilityDTO academic = checkStudentEligibility(student, drive);

        List<String> candidateSkills = student.getSkills() != null
                ? student.getSkills().stream().map(StudentSkill::getSkill).toList()
                : Collections.emptyList();
        List<String> requiredSkills = drive.getRequiredSkills() != null
                ? drive.getRequiredSkills().stream().map(DriveRequiredSkill::getSkill).toList()
                : Collections.emptyList();

        SkillMatcherUtil.SkillMatchResult match = SkillMatcherUtil.calculateSkillMatch(candidateSkills, requiredSkills);
        SkillMatchResultDTO matchDto = new SkillMatchResultDTO(
                match.score(),
                match.matchPercentage(),
                match.matchedSkills(),
                match.missingSkills(),
                match.additionalSkills(),
                match.totalRequired(),
                match.totalMatched(),
                match.explanation()
        );

        DriveMatchScoreDTO dto = new DriveMatchScoreDTO();
        dto.setDriveId(drive.getId() != null ? drive.getId().toString() : null);
        dto.setDriveTitle(drive.getTitle());
        dto.setJobRole(drive.getJobRole());
        dto.setCompany(CompanyResponseDTO.fromEntity(drive.getCompany()));
        dto.setRequiredSkills(requiredSkills);
        dto.setStudentSkills(candidateSkills);
        dto.setHasApplied(appOpt.isPresent());
        appOpt.ifPresent(app -> {
            dto.setMyApplicationStatus(app.getStatus());
            dto.setMyApplicationId(app.getId() != null ? app.getId().toString() : null);
        });
        dto.setAcademicEligibility(academic);
        dto.setSkillMatch(matchDto);

        return ApiResponse.ok(dto);
    }
}
