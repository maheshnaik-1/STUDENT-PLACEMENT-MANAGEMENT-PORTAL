package com.placement.portal.service;

import com.placement.portal.dto.ApiResponse;
import com.placement.portal.dto.application.*;
import com.placement.portal.dto.company.CompanyResponseDTO;
import com.placement.portal.dto.drive.AcademicEligibilityDTO;
import com.placement.portal.dto.drive.DriveResponseDTO;
import com.placement.portal.dto.drive.SkillMatchResultDTO;
import com.placement.portal.entity.*;
import com.placement.portal.exception.IneligibleApplicationException;
import com.placement.portal.repository.*;
import com.placement.portal.util.SkillMatcherUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ApplicationService {

    private static final Logger log = LoggerFactory.getLogger(ApplicationService.class);

    private static final List<String> VALID_STATUSES = List.of(
            "Applied", "Shortlisted", "Technical Round", "Interview", "Selected", "Rejected");

    private static final List<String> TERMINAL_STATUSES = List.of("Selected", "Rejected");

    private final ApplicationRepository applicationRepository;
    private final ApplicationWithdrawalRepository applicationWithdrawalRepository;
    private final PlacementDriveRepository placementDriveRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public ApplicationService(ApplicationRepository applicationRepository,
            ApplicationWithdrawalRepository applicationWithdrawalRepository,
            PlacementDriveRepository placementDriveRepository,
            CompanyRepository companyRepository,
            UserRepository userRepository,
            NotificationService notificationService) {
        this.applicationRepository = applicationRepository;
        this.applicationWithdrawalRepository = applicationWithdrawalRepository;
        this.placementDriveRepository = placementDriveRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public ApiResponse<ApplicationResponseDTO> applyForDrive(Long driveId, Long studentId) {
        // 1. Check if placement drive exists
        PlacementDrive drive = placementDriveRepository.findById(driveId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Placement drive not found"));

        // 2. Check if drive status allows applications
        if ("Completed".equalsIgnoreCase(drive.getStatus()) || "Cancelled".equalsIgnoreCase(drive.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Applications are closed. Drive status is '" + drive.getStatus() + "'.");
        }

        String companyName = drive.getCompany() != null ? drive.getCompany().getName() : "Company";
        String driveTitle = drive.getTitle() != null ? drive.getTitle() : "Drive";

        // 3. Check duplicate application
        Optional<Application> existing = applicationRepository.findByDriveIdAndStudentId(driveId, studentId);
        if (existing.isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "You have already applied for " + companyName + " - " + driveTitle +
                            ". Current status: " + existing.get().getStatus());
        }

        // 4. Check application deadline
        if (drive.getDeadline() != null && Instant.now().isAfter(drive.getDeadline())) {
            String deadlineStr = DateTimeFormatter.ISO_INSTANT.format(drive.getDeadline());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Application deadline was on " + deadlineStr + ". Submissions are closed.");
        }

        // 5. Evaluate student academic eligibility
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student account not found"));

        AcademicEligibilityDTO eligibility = checkStudentEligibility(student, drive);
        if (!eligibility.isEligible()) {
            throw new IneligibleApplicationException("You are not eligible for this placement drive.",
                    eligibility.getReasons());
        }

        // 6. Create Application & History
        String submissionRemarks = "Application submitted successfully. Under review.";
        Application application = new Application();
        application.setDrive(drive);
        application.setStudent(student);
        application.setAppliedAt(Instant.now());
        application.setStatus("Applied");
        application.setRemarks(submissionRemarks);

        ApplicationStatusHistory history = new ApplicationStatusHistory(application, "Applied", submissionRemarks,
                student);
        history.setChangedAt(Instant.now());
        application.getStatusHistory().add(history);

        Application saved;
        try {
            saved = applicationRepository.save(application);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "You have already applied for this placement drive");
        }

        // 7. Dispatch Notifications
        try {
            // A. Student notification
            Map<String, Object> studentMeta = new HashMap<>();
            studentMeta.put("driveId", drive.getId());
            studentMeta.put("companyName", companyName);
            studentMeta.put("jobTitle", driveTitle);

            notificationService.createNotification(
                    student,
                    "student",
                    "Application Submitted",
                    "Your application for " + companyName + " - " + driveTitle + " has been successfully submitted.",
                    "APPLICATION_SUBMITTED",
                    saved.getId(),
                    "Application",
                    "/student/applications",
                    studentMeta);

            // B. Officer notifications
            List<User> officers = userRepository.findByRole("officer");
            String studentLabel = student.getName() + " ("
                    + (student.getRollNo() != null ? student.getRollNo() : student.getBranch()) + ")";
            for (User officer : officers) {
                Map<String, Object> officerMeta = new HashMap<>();
                officerMeta.put("driveId", drive.getId());
                officerMeta.put("studentId", student.getId());
                officerMeta.put("studentName", student.getName());
                officerMeta.put("companyName", companyName);
                officerMeta.put("jobTitle", driveTitle);

                notificationService.createNotification(
                        officer,
                        "officer",
                        "New Application Received",
                        studentLabel + " applied for " + companyName + " - " + driveTitle + ".",
                        "APPLICATION_SUBMITTED",
                        saved.getId(),
                        "Application",
                        "/officer/drives/" + drive.getId() + "/applicants",
                        officerMeta);
            }
        } catch (Exception ex) {
            log.warn("[Application Notification Warning]: {}", ex.getMessage());
        }

        return ApiResponse.ok("Successfully applied to " + companyName + " - " + driveTitle + "!",
                ApplicationResponseDTO.fromEntity(saved));
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<ApplicationResponseDTO>> getMyApplications(Long studentId) {
        List<Application> apps = applicationRepository.findByStudentIdOrderByAppliedAtDesc(studentId);
        List<ApplicationResponseDTO> dtos = new ArrayList<>();
        for (Application a : apps) {
            dtos.add(ApplicationResponseDTO.fromEntity(a));
        }
        ApiResponse<List<ApplicationResponseDTO>> response = ApiResponse.ok(dtos);
        response.setCount(dtos.size());
        return response;
    }

    @Transactional
    public ApiResponse<Map<String, Object>> withdrawApplication(Long applicationId, Long studentId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Application not found or already withdrawn"));

        if (application.getStudent() == null || !studentId.equals(application.getStudent().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied. You can only withdraw your own applications.");
        }

        if (!"Applied".equalsIgnoreCase(application.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot withdraw application. Application has already progressed to '" + application.getStatus()
                            + "' stage.");
        }

        PlacementDrive drive = application.getDrive();
        User student = application.getStudent();
        String companyName = drive != null && drive.getCompany() != null ? drive.getCompany().getName() : "Company";
        String driveTitle = drive != null ? drive.getTitle() : "Placement Drive";
        Long driveId = drive != null ? drive.getId() : null;

        // Archive into application_withdrawals
        ApplicationWithdrawal withdrawal = new ApplicationWithdrawal();
        withdrawal.setOriginalApplicationId(application.getId());
        withdrawal.setDrive(drive);
        withdrawal.setStudent(student);
        withdrawal.setWithdrawnAt(Instant.now());
        withdrawal.setPreviousStatus(application.getStatus());
        withdrawal.setReason("Withdrawn by student");
        applicationWithdrawalRepository.save(withdrawal);

        // Delete application
        applicationRepository.delete(application);

        // Dispatch notifications
        try {
            Map<String, Object> meta = new HashMap<>();
            meta.put("driveId", driveId);
            meta.put("companyName", companyName);
            meta.put("jobTitle", driveTitle);

            notificationService.createNotification(
                    student,
                    "student",
                    "Application Withdrawn",
                    "Your application for " + companyName + " - " + driveTitle + " has been successfully withdrawn.",
                    "SYSTEM",
                    driveId,
                    "PlacementDrive",
                    "/student/applications",
                    meta);

            List<User> officers = userRepository.findByRole("officer");
            String studentLabel = student.getName() + " ("
                    + (student.getRollNo() != null ? student.getRollNo() : student.getBranch()) + ")";
            for (User officer : officers) {
                notificationService.createNotification(
                        officer,
                        "officer",
                        "Candidate Application Withdrawn",
                        studentLabel + " has withdrawn their application for " + companyName + " - " + driveTitle + ".",
                        "SYSTEM",
                        driveId,
                        "PlacementDrive",
                        driveId != null ? "/officer/drives/" + driveId + "/applicants" : "/officer/dashboard",
                        meta);
            }
        } catch (Exception ex) {
            log.warn("[Withdrawal Notification Warning]: {}", ex.getMessage());
        }

        Map<String, Object> data = new HashMap<>();
        data.put("applicationId", applicationId);
        data.put("driveId", driveId);

        return ApiResponse
                .ok("Application for " + companyName + " - " + driveTitle + " has been successfully withdrawn.", data);
    }

    @Transactional(readOnly = true)
    public DriveApplicantsResponseDTO getDriveApplicants(Long driveId, String status, String search) {
        PlacementDrive drive = placementDriveRepository.findById(driveId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Placement drive not found"));

        List<Application> apps;
        if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status.trim())) {
            apps = applicationRepository.findByDriveIdAndStatusOrderByAppliedAtDesc(driveId, status.trim());
        } else {
            apps = applicationRepository.findByDriveIdOrderByAppliedAtDesc(driveId);
        }

        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim().toLowerCase();
            apps = apps.stream().filter(a -> {
                User s = a.getStudent();
                if (s == null)
                    return false;
                return (s.getName() != null && s.getName().toLowerCase().contains(q)) ||
                        (s.getRollNo() != null && s.getRollNo().toLowerCase().contains(q)) ||
                        (s.getEmail() != null && s.getEmail().toLowerCase().contains(q)) ||
                        (s.getBranch() != null && s.getBranch().toLowerCase().contains(q));
            }).toList();
        }

        List<ApplicationResponseDTO> dtos = new ArrayList<>();
        for (Application a : apps) {
            dtos.add(ApplicationResponseDTO.fromEntity(a));
        }

        long applicantCount = applicationRepository.countByDriveId(driveId);

        return new DriveApplicantsResponseDTO(
                DriveResponseDTO.fromEntity(drive, applicantCount),
                dtos);
    }

    @Transactional(readOnly = true)
    public ApiResponse<ApplicantMatchScoresResponseDTO> getDriveApplicantMatchScores(Long driveId) {
        PlacementDrive drive = placementDriveRepository.findById(driveId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Placement drive not found"));

        List<Application> applications = applicationRepository.findByDriveIdOrderByAppliedAtDesc(driveId);

        List<String> requiredSkills = drive.getRequiredSkills() != null
                ? drive.getRequiredSkills().stream().map(DriveRequiredSkill::getSkill).toList()
                : Collections.emptyList();

        ApplicantMatchScoresResponseDTO response = new ApplicantMatchScoresResponseDTO();
        response.setDriveId(drive.getId());
        response.setDriveTitle(drive.getTitle());
        response.setJobRole(drive.getJobRole());
        if (drive.getCompany() != null) {
            response.setCompany(CompanyResponseDTO.fromEntity(drive.getCompany()));
        }
        response.setRequiredSkills(requiredSkills);

        int totalScore = 0;
        Map<String, Integer> dist = response.getScoreDistribution();
        List<ApplicantMatchItemDTO> applicantItems = new ArrayList<>();

        for (Application app : applications) {
            User student = app.getStudent();
            List<String> studentSkills = student != null && student.getSkills() != null
                    ? student.getSkills().stream().map(StudentSkill::getSkill).toList()
                    : Collections.emptyList();

            SkillMatcherUtil.SkillMatchResult match = SkillMatcherUtil.calculateSkillMatch(studentSkills,
                    requiredSkills);
            AcademicEligibilityDTO academicEligibility = student != null
                    ? checkStudentEligibility(student, drive)
                    : new AcademicEligibilityDTO(false, List.of("Student profile missing"));

            totalScore += match.score();
            if (match.score() >= 80)
                dist.put("excellent", dist.get("excellent") + 1);
            else if (match.score() >= 60)
                dist.put("good", dist.get("good") + 1);
            else if (match.score() >= 40)
                dist.put("moderate", dist.get("moderate") + 1);
            else if (match.score() > 0)
                dist.put("low", dist.get("low") + 1);
            else
                dist.put("zero", dist.get("zero") + 1);

            ApplicantMatchItemDTO item = new ApplicantMatchItemDTO();
            item.setApplicationId(app.getId());
            item.setStatus(app.getStatus());
            item.setRemarks(app.getRemarks() != null ? app.getRemarks() : "");
            item.setAppliedAt(app.getAppliedAt());

            if (student != null) {
                Map<String, Object> sMap = new HashMap<>();
                sMap.put("id", student.getId());
                sMap.put("_id", student.getId() != null ? student.getId().toString() : null);
                sMap.put("name", student.getName());
                sMap.put("email", student.getEmail());
                sMap.put("rollNo", student.getRollNo());
                sMap.put("branch", student.getBranch());
                sMap.put("cgpa", student.getCgpa());
                sMap.put("activeBacklogs", student.getActiveBacklogs());
                sMap.put("passingYear", student.getPassingYear());
                sMap.put("skills", studentSkills);
                sMap.put("hasResume",
                        student.getResumeFileName() != null && !student.getResumeFileName().trim().isEmpty());
                sMap.put("resumeOriginalName", student.getResumeOriginalName());
                item.setStudent(sMap);
            }

            item.setAcademicEligibility(academicEligibility);
            item.setSkillMatch(new SkillMatchResultDTO(
                    match.score(),
                    match.matchPercentage(),
                    match.matchedSkills(),
                    match.missingSkills(),
                    match.additionalSkills(),
                    match.totalRequired(),
                    match.totalMatched(),
                    match.explanation()));

            applicantItems.add(item);
        }

        // Sort: score desc, eligibility desc, appliedAt asc
        applicantItems.sort((a, b) -> {
            int scoreA = a.getSkillMatch() != null ? a.getSkillMatch().getScore() : 0;
            int scoreB = b.getSkillMatch() != null ? b.getSkillMatch().getScore() : 0;
            if (scoreB != scoreA)
                return Integer.compare(scoreB, scoreA);

            boolean eligA = a.getAcademicEligibility() != null && a.getAcademicEligibility().isEligible();
            boolean eligB = b.getAcademicEligibility() != null && b.getAcademicEligibility().isEligible();
            if (eligA != eligB)
                return eligA ? -1 : 1;

            if (a.getAppliedAt() != null && b.getAppliedAt() != null) {
                return a.getAppliedAt().compareTo(b.getAppliedAt());
            }
            return 0;
        });

        int totalApplicants = applicantItems.size();
        response.setTotalApplicants(totalApplicants);
        response.setAverageScore(totalApplicants > 0 ? Math.round((float) totalScore / totalApplicants) : 0);
        response.setApplicants(applicantItems);

        return ApiResponse.ok(response);
    }

    @Transactional
    public ApiResponse<ApplicationResponseDTO> updateApplicationStatus(Long applicationId, String status,
            String remarks, Long officerId) {
        if (status == null || !VALID_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid status. Must be one of: " + String.join(", ", VALID_STATUSES));
        }

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));

        String previousStatus = application.getStatus();
        boolean isStatusChanged = !status.equals(previousStatus);

        application.setStatus(status);
        if (remarks != null) {
            application.setRemarks(remarks);
        }

        User officer = officerId != null ? userRepository.findById(officerId).orElse(null) : null;

        if (isStatusChanged) {
            String cleanRemarks = remarks != null ? remarks
                    : (application.getRemarks() != null ? application.getRemarks() : "");
            ApplicationStatusHistory history = new ApplicationStatusHistory(application, status, cleanRemarks, officer);
            history.setChangedAt(Instant.now());
            application.getStatusHistory().add(history);
        }

        Application saved = applicationRepository.save(application);

        // Notification for student
        if (isStatusChanged && application.getStudent() != null) {
            PlacementDrive drive = application.getDrive();
            String companyName = drive != null && drive.getCompany() != null ? drive.getCompany().getName() : "Company";
            String driveTitle = drive != null ? drive.getTitle() : "Placement Drive";
            String cleanRemarks = (remarks != null && !remarks.trim().isEmpty()) ? remarks.trim() : "";

            String notifType = "APPLICATION_STATUS_CHANGED";
            String notifTitle = "Application Status Updated";
            String notifMessage;

            switch (status) {
                case "Shortlisted" -> {
                    notifType = "SHORTLISTED";
                    notifTitle = "Application Shortlisted";
                    notifMessage = "Your application for " + companyName + " (" + driveTitle + ") has been shortlisted."
                            +
                            (!cleanRemarks.isEmpty() ? " Remarks: \"" + cleanRemarks + "\"" : "");
                }
                case "Technical Round" -> {
                    notifType = "TECHNICAL_ROUND";
                    notifTitle = "Technical Round Scheduled";
                    notifMessage = "Your application for " + companyName + " (" + driveTitle
                            + ") has progressed to the Technical Round." +
                            (!cleanRemarks.isEmpty() ? " Remarks: \"" + cleanRemarks + "\"" : "");
                }
                case "Interview" -> {
                    notifType = "INTERVIEW";
                    notifTitle = "Interview Scheduled";
                    notifMessage = "Your application for " + companyName + " (" + driveTitle
                            + ") has progressed to the Interview stage." +
                            (!cleanRemarks.isEmpty() ? " Remarks: \"" + cleanRemarks + "\"" : "");
                }
                case "Selected" -> {
                    notifType = "SELECTED";
                    notifTitle = "Congratulations! You are Selected";
                    notifMessage = "Congratulations! You have been selected for " + companyName + " (" + driveTitle
                            + ")." +
                            (!cleanRemarks.isEmpty() ? " Remarks: \"" + cleanRemarks + "\"" : "");
                }
                case "Rejected" -> {
                    notifType = "REJECTED";
                    notifTitle = "Application Update";
                    notifMessage = "Your application for " + companyName + " (" + driveTitle + ") was not selected." +
                            (!cleanRemarks.isEmpty() ? " Remarks: \"" + cleanRemarks + "\"" : "");
                }
                default -> notifMessage = "Your application status for " + companyName + " (" + driveTitle
                        + ") is now '" + status + "'." +
                        (!cleanRemarks.isEmpty() ? " Remarks: \"" + cleanRemarks + "\"" : "");
            }

            Map<String, Object> meta = new HashMap<>();
            if (drive != null)
                meta.put("driveId", drive.getId());
            meta.put("companyName", companyName);
            meta.put("jobTitle", driveTitle);
            meta.put("previousStatus", previousStatus);
            meta.put("newStatus", status);
            meta.put("remarks", cleanRemarks);

            notificationService.createNotification(
                    application.getStudent(),
                    "student",
                    notifTitle,
                    notifMessage,
                    notifType,
                    application.getId(),
                    "Application",
                    "/student/applications",
                    meta);
        }

        return ApiResponse.ok("Applicant status updated to '" + saved.getStatus() + "'",
                ApplicationResponseDTO.fromEntity(saved));
    }

    @Transactional
    public ApiResponse<BulkStatusUpdateResponseDTO> bulkUpdateApplicationStatus(BulkStatusUpdateRequest request,
            Long officerId) {
        Long driveId = request.getResolvedDriveId();
        if (driveId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Placement drive ID is required for bulk status updates");
        }

        List<Long> applicationIds = request.getResolvedApplicationIds();
        if (applicationIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Please provide a non-empty list of application IDs to update");
        }

        if (applicationIds.size() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Bulk status update batch size cannot exceed 100 applications");
        }

        String status = request.getStatus();
        if (status == null || !VALID_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid status. Must be one of: " + String.join(", ", VALID_STATUSES));
        }

        PlacementDrive drive = placementDriveRepository.findById(driveId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Placement drive not found"));

        String companyName = drive.getCompany() != null ? drive.getCompany().getName() : "Company";
        String driveTitle = drive.getTitle() != null ? drive.getTitle() : "Placement Drive";

        List<Application> applications = applicationRepository.findByIdInAndDriveId(applicationIds, driveId);
        Map<Long, Application> appMap = new HashMap<>();
        for (Application a : applications) {
            appMap.put(a.getId(), a);
        }

        User officer = officerId != null ? userRepository.findById(officerId).orElse(null) : null;
        String remarks = request.getRemarks();

        List<Map<String, Object>> updated = new ArrayList<>();
        List<Map<String, Object>> skipped = new ArrayList<>();

        for (Long id : applicationIds) {
            Application app = appMap.get(id);
            if (app == null) {
                Map<String, Object> sk = new HashMap<>();
                sk.put("id", id);
                sk.put("reason", "Application not found or does not belong to the specified drive");
                skipped.add(sk);
                continue;
            }

            // Terminal-state protection
            if (TERMINAL_STATUSES.contains(app.getStatus())) {
                Map<String, Object> sk = new HashMap<>();
                sk.put("id", app.getId());
                sk.put("studentName", app.getStudent() != null ? app.getStudent().getName() : "Unknown");
                sk.put("rollNo", app.getStudent() != null ? app.getStudent().getRollNo() : "N/A");
                sk.put("currentStatus", app.getStatus());
                sk.put("attemptedStatus", status);
                sk.put("reason", "Cannot bulk update application in terminal state '" + app.getStatus() +
                        "'. Terminal statuses are protected to prevent accidental overwrites.");
                sk.put("isTerminalProtected", true);
                skipped.add(sk);
                continue;
            }

            String previousStatus = app.getStatus();
            boolean isStatusChanged = !status.equals(previousStatus);

            app.setStatus(status);
            if (remarks != null) {
                app.setRemarks(remarks);
            }

            if (isStatusChanged) {
                String cleanRemarks = remarks != null ? remarks : (app.getRemarks() != null ? app.getRemarks() : "");
                ApplicationStatusHistory history = new ApplicationStatusHistory(app, status, cleanRemarks, officer);
                history.setChangedAt(Instant.now());
                app.getStatusHistory().add(history);
            }

            applicationRepository.save(app);

            // Send notification
            if (isStatusChanged && app.getStudent() != null) {
                String cleanRemarks = (remarks != null && !remarks.trim().isEmpty()) ? remarks.trim() : "";
                String notifType = "APPLICATION_STATUS_CHANGED";
                String notifTitle = "Application Status Updated";
                String notifMessage;

                switch (status) {
                    case "Shortlisted" -> {
                        notifType = "SHORTLISTED";
                        notifTitle = "Application Shortlisted";
                        notifMessage = "Your application for " + companyName + " (" + driveTitle
                                + ") has been shortlisted." +
                                (!cleanRemarks.isEmpty() ? " Remarks: \"" + cleanRemarks + "\"" : "");
                    }
                    case "Technical Round" -> {
                        notifType = "TECHNICAL_ROUND";
                        notifTitle = "Technical Round Scheduled";
                        notifMessage = "Your application for " + companyName + " (" + driveTitle
                                + ") has progressed to the Technical Round." +
                                (!cleanRemarks.isEmpty() ? " Remarks: \"" + cleanRemarks + "\"" : "");
                    }
                    case "Interview" -> {
                        notifType = "INTERVIEW";
                        notifTitle = "Interview Scheduled";
                        notifMessage = "Your application for " + companyName + " (" + driveTitle
                                + ") has progressed to the Interview stage." +
                                (!cleanRemarks.isEmpty() ? " Remarks: \"" + cleanRemarks + "\"" : "");
                    }
                    case "Selected" -> {
                        notifType = "SELECTED";
                        notifTitle = "Congratulations! You are Selected";
                        notifMessage = "Congratulations! You have been selected for " + companyName + " (" + driveTitle
                                + ")." +
                                (!cleanRemarks.isEmpty() ? " Remarks: \"" + cleanRemarks + "\"" : "");
                    }
                    case "Rejected" -> {
                        notifType = "REJECTED";
                        notifTitle = "Application Update";
                        notifMessage = "Your application for " + companyName + " (" + driveTitle + ") was not selected."
                                +
                                (!cleanRemarks.isEmpty() ? " Remarks: \"" + cleanRemarks + "\"" : "");
                    }
                    default -> notifMessage = "Your application status for " + companyName + " (" + driveTitle
                            + ") is now '" + status + "'." +
                            (!cleanRemarks.isEmpty() ? " Remarks: \"" + cleanRemarks + "\"" : "");
                }

                Map<String, Object> meta = new HashMap<>();
                meta.put("driveId", drive.getId());
                meta.put("companyName", companyName);
                meta.put("jobTitle", driveTitle);
                meta.put("previousStatus", previousStatus);
                meta.put("newStatus", status);
                meta.put("remarks", cleanRemarks);

                notificationService.createNotification(
                        app.getStudent(),
                        "student",
                        notifTitle,
                        notifMessage,
                        notifType,
                        app.getId(),
                        "Application",
                        "/student/applications",
                        meta);
            }

            Map<String, Object> up = new HashMap<>();
            up.put("id", app.getId());
            up.put("studentName", app.getStudent() != null ? app.getStudent().getName() : null);
            up.put("rollNo", app.getStudent() != null ? app.getStudent().getRollNo() : null);
            up.put("previousStatus", previousStatus);
            up.put("newStatus", status);
            up.put("statusChanged", isStatusChanged);
            updated.add(up);
        }

        int terminalSkippedCount = (int) skipped.stream().filter(s -> Boolean.TRUE.equals(s.get("isTerminalProtected")))
                .count();
        String responseMessage;
        if (updated.isEmpty() && terminalSkippedCount > 0) {
            responseMessage = "No applications updated. " + terminalSkippedCount + " application" +
                    (terminalSkippedCount > 1 ? "s were" : " was") +
                    " skipped because terminal statuses ('Selected' or 'Rejected') cannot be modified in bulk.";
        } else if (terminalSkippedCount > 0) {
            responseMessage = "Bulk update complete: " + updated.size() + " updated, " + skipped.size() +
                    " skipped (" + terminalSkippedCount + " protected terminal status"
                    + (terminalSkippedCount > 1 ? "es" : "") + ")";
        } else {
            responseMessage = "Bulk update complete: " + updated.size() + " updated, " + skipped.size() + " skipped";
        }

        BulkStatusUpdateResponseDTO bulkResponse = new BulkStatusUpdateResponseDTO(
                updated.size(), skipped.size(), terminalSkippedCount, updated, skipped);

        return ApiResponse.ok(responseMessage, bulkResponse);
    }

    @Transactional(readOnly = true)
    public ApiResponse<PlacementStatsDTO> getPlacementStats() {
        PlacementStatsDTO stats = new PlacementStatsDTO();
        stats.setTotalCompanies(companyRepository.count());
        stats.setTotalDrives(placementDriveRepository.count());
        stats.setActiveDrives(
                placementDriveRepository.countByStatusIn(List.of("Upcoming", "Ongoing")));
        stats.setTotalStudents(userRepository.countByRole("student"));

        long totalApps = applicationRepository.count();
        stats.setTotalApplications(totalApps);

        long totalSelected = applicationRepository.countByStatus("Selected");
        stats.setTotalSelected(totalSelected);
        stats.setTotalShortlisted(
                applicationRepository.countByStatusIn(List.of("Shortlisted", "Technical Round", "Interview")));
        stats.setTotalTechnicalRound(applicationRepository.countByStatus("Technical Round"));
        stats.setTotalInterview(applicationRepository.countByStatus("Interview"));
        stats.setTotalApplied(applicationRepository.countByStatus("Applied"));
        stats.setTotalRejected(applicationRepository.countByStatus("Rejected"));

        long totalStudents = stats.getTotalStudents();
        stats.setPlacementRate(
                totalStudents > 0 ? (int) Math.round(((double) totalSelected / totalStudents) * 100) : 0);

        // Funnel stages
        long stage1 = totalApps;
        long stage2 = applicationRepository
                .countByStatusIn(List.of("Shortlisted", "Technical Round", "Interview", "Selected"));
        long stage3 = applicationRepository.countByStatusIn(List.of("Technical Round", "Interview", "Selected"));
        long stage4 = applicationRepository.countByStatusIn(List.of("Interview", "Selected"));
        long stage5 = totalSelected;

        List<Map<String, Object>> stages = new ArrayList<>();
        stages.add(buildStage("applied", "Applications Received", "Applied", "Stage 1", stage1, totalApps, 100,
                Math.max(0, stage1 - stage2), calcRate(Math.max(0, stage1 - stage2), stage1),
                "#2563eb", "#eff6ff", "#bfdbfe", "Total applications submitted across campus drives"));

        stages.add(buildStage("shortlisted", "Screening Cleared (Shortlisted+)", "Shortlisted", "Stage 2", stage2,
                totalApps,
                calcRate(stage2, stage1), Math.max(0, stage2 - stage3), calcRate(Math.max(0, stage2 - stage3), stage2),
                "#d97706", "#fffbeb", "#fde68a", "Candidates meeting eligibility and advancing past screening"));

        stages.add(buildStage("technical", "Technical Evaluation (Tech Round+)", "Technical Round", "Stage 3", stage3,
                totalApps,
                calcRate(stage3, stage2), Math.max(0, stage3 - stage4), calcRate(Math.max(0, stage3 - stage4), stage3),
                "#7c3aed", "#f5f3ff", "#ddd6fe", "Candidates evaluated in coding and technical rounds"));

        stages.add(buildStage("interview", "Formal Interview (Interview+)", "Interview", "Stage 4", stage4, totalApps,
                calcRate(stage4, stage3), Math.max(0, stage4 - stage5), calcRate(Math.max(0, stage4 - stage5), stage4),
                "#4f46e5", "#eef2ff", "#c7d2fe", "Candidates appearing before technical and HR interview panels"));

        stages.add(buildStage("selected", "Offers Extended (Selected)", "Offers Extended", "Stage 5", stage5, totalApps,
                calcRate(stage5, stage4), 0, 0,
                "#059669", "#ecfdf5", "#a7f3d0", "Confirmed placement offers extended to candidates"));

        Map<String, Object> funnel = new HashMap<>();
        funnel.put("stages", stages);

        Map<String, Object> pipelineHealth = new HashMap<>();
        pipelineHealth.put("totalApplications", totalApps);
        pipelineHealth.put("activeInReview", totalApps - (totalSelected + stats.getTotalRejected()));
        pipelineHealth.put("offersExtended", totalSelected);
        pipelineHealth.put("rejected", stats.getTotalRejected());
        pipelineHealth.put("overallConversionRate", calcRate(totalSelected, totalApps));
        funnel.put("pipelineHealth", pipelineHealth);
        stats.setRecruitmentFunnel(funnel);

        // Branch stats & selections
        List<User> students = userRepository.findByRole("student");
        Map<String, List<User>> byBranch = new HashMap<>();
        for (User s : students) {
            String b = s.getBranch() != null ? s.getBranch() : "Unknown";
            byBranch.computeIfAbsent(b, k -> new ArrayList<>()).add(s);
        }

        List<Map<String, Object>> branchStatsList = new ArrayList<>();
        for (Map.Entry<String, List<User>> entry : byBranch.entrySet()) {
            Map<String, Object> bStat = new HashMap<>();
            bStat.put("_id", entry.getKey());
            bStat.put("totalStudents", entry.getValue().size());
            double avgCgpa = entry.getValue().stream()
                    .filter(u -> u.getCgpa() != null)
                    .mapToDouble(u -> u.getCgpa().doubleValue())
                    .average().orElse(0.0);
            bStat.put("avgCGPA", Math.round(avgCgpa * 100.0) / 100.0);
            branchStatsList.add(bStat);
        }
        stats.setBranchStats(branchStatsList);

        // Placed students per branch
        List<Application> selectedApps = applicationRepository.findByStatus("Selected");
        Map<String, Long> branchPlacedCount = new HashMap<>();
        for (Application a : selectedApps) {
            String b = (a.getStudent() != null && a.getStudent().getBranch() != null) ? a.getStudent().getBranch()
                    : "Unknown";
            branchPlacedCount.put(b, branchPlacedCount.getOrDefault(b, 0L) + 1);
        }

        List<Map<String, Object>> placedStudentsList = new ArrayList<>();
        for (Map.Entry<String, Long> entry : branchPlacedCount.entrySet()) {
            Map<String, Object> item = new HashMap<>();
            item.put("_id", entry.getKey());
            item.put("placedCount", entry.getValue());
            placedStudentsList.add(item);
        }
        stats.setPlacedStudents(placedStudentsList);

        // Company-wise selections (top 10 by hire count descending)
        Map<String, List<Application>> byCompany = new HashMap<>();
        for (Application a : selectedApps) {
            String compName = (a.getDrive() != null && a.getDrive().getCompany() != null
                    && a.getDrive().getCompany().getName() != null
                    && !a.getDrive().getCompany().getName().trim().isEmpty())
                            ? a.getDrive().getCompany().getName().trim()
                            : "Unknown Company";
            byCompany.computeIfAbsent(compName, k -> new ArrayList<>()).add(a);
        }

        List<Map<String, Object>> companyHiresList = new ArrayList<>();
        for (Map.Entry<String, List<Application>> entry : byCompany.entrySet()) {
            Map<String, Object> cItem = new HashMap<>();
            cItem.put("_id", entry.getKey());
            cItem.put("companyName", entry.getKey());
            cItem.put("hires", entry.getValue().size());

            Set<String> distinctPackages = new LinkedHashSet<>();
            for (Application a : entry.getValue()) {
                if (a.getDrive() != null && a.getDrive().getPackageCtc() != null) {
                    String p = a.getDrive().getPackageCtc().trim();
                    if (!p.isEmpty()) {
                        distinctPackages.add(p);
                    }
                }
            }

            List<String> pkgList = new ArrayList<>(distinctPackages);
            pkgList.sort((p1, p2) -> {
                double l1 = parsePackageLPA(p1);
                double l2 = parsePackageLPA(p2);
                if (l1 > 0 && l2 > 0 && Double.compare(l1, l2) != 0) {
                    return Double.compare(l1, l2);
                }
                return p1.compareToIgnoreCase(p2);
            });

            String packageStr;
            if (pkgList.isEmpty()) {
                packageStr = "N/A";
            } else if (pkgList.size() == 1) {
                packageStr = pkgList.get(0);
            } else {
                packageStr = String.join(", ", pkgList);
            }

            cItem.put("package", packageStr);
            companyHiresList.add(cItem);
        }

        companyHiresList.sort((a, b) -> {
            int cmp = Integer.compare((Integer) b.get("hires"), (Integer) a.get("hires"));
            if (cmp != 0)
                return cmp;
            String nameA = (String) a.get("_id");
            String nameB = (String) b.get("_id");
            return nameA.compareToIgnoreCase(nameB);
        });

        if (companyHiresList.size() > 10) {
            companyHiresList = new ArrayList<>(companyHiresList.subList(0, 10));
        }
        stats.setCompanyHires(companyHiresList);

        return ApiResponse.ok(stats);
    }

    @Transactional(readOnly = true)
    public ApiResponse<OfficerAnalyticsDTO> getOfficerAnalytics(Long filterDriveId, String filterBranch,
            String filterStatus, String filterSearch) {
        List<PlacementDrive> allDrives = placementDriveRepository.findAll();
        List<User> allStudents = userRepository.findByRole("student");

        Set<String> distinctBranches = new TreeSet<>();
        for (User s : allStudents) {
            if (s.getBranch() != null && !s.getBranch().trim().isEmpty()) {
                distinctBranches.add(s.getBranch().trim());
            }
        }

        List<Map<String, Object>> driveFilterOptions = new ArrayList<>();
        for (PlacementDrive d : allDrives) {
            Map<String, Object> opt = new HashMap<>();
            opt.put("_id", d.getId() != null ? d.getId().toString() : null);
            opt.put("id", d.getId());
            opt.put("title", d.getTitle());
            opt.put("companyName", d.getCompany() != null ? d.getCompany().getName() : "Company");
            opt.put("packageCTC", d.getPackageCtc());
            opt.put("status", d.getStatus());
            driveFilterOptions.add(opt);
        }

        List<Application> applications = applicationRepository.findAllByOrderByAppliedAtDesc();

        if (filterDriveId != null) {
            applications = applications.stream()
                    .filter(a -> a.getDrive() != null && filterDriveId.equals(a.getDrive().getId()))
                    .toList();
        }

        if (filterStatus != null && !filterStatus.trim().isEmpty() && !"ALL".equalsIgnoreCase(filterStatus.trim())) {
            applications = applications.stream()
                    .filter(a -> filterStatus.trim().equalsIgnoreCase(a.getStatus()))
                    .toList();
        }

        if (filterBranch != null && !filterBranch.trim().isEmpty() && !"ALL".equalsIgnoreCase(filterBranch.trim())) {
            applications = applications.stream()
                    .filter(a -> a.getStudent() != null
                            && filterBranch.trim().equalsIgnoreCase(a.getStudent().getBranch()))
                    .toList();
        }

        if (filterSearch != null && !filterSearch.trim().isEmpty()) {
            String q = filterSearch.trim().toLowerCase();
            applications = applications.stream().filter(a -> {
                String sName = (a.getStudent() != null && a.getStudent().getName() != null)
                        ? a.getStudent().getName().toLowerCase()
                        : "";
                String sRoll = (a.getStudent() != null && a.getStudent().getRollNo() != null)
                        ? a.getStudent().getRollNo().toLowerCase()
                        : "";
                String sEmail = (a.getStudent() != null && a.getStudent().getEmail() != null)
                        ? a.getStudent().getEmail().toLowerCase()
                        : "";
                String cName = (a.getDrive() != null && a.getDrive().getCompany() != null
                        && a.getDrive().getCompany().getName() != null)
                                ? a.getDrive().getCompany().getName().toLowerCase()
                                : "";
                String dTitle = (a.getDrive() != null && a.getDrive().getTitle() != null)
                        ? a.getDrive().getTitle().toLowerCase()
                        : "";
                return sName.contains(q) || sRoll.contains(q) || sEmail.contains(q) || cName.contains(q)
                        || dTitle.contains(q);
            }).toList();
        }

        int totalApplications = applications.size();
        Set<Long> uniqueApplicantIds = new HashSet<>();
        for (Application a : applications) {
            if (a.getStudent() != null && a.getStudent().getId() != null) {
                uniqueApplicantIds.add(a.getStudent().getId());
            }
        }
        int uniqueApplicantsCount = uniqueApplicantIds.size();

        List<User> relevantStudents = (filterBranch != null && !filterBranch.trim().isEmpty()
                && !"ALL".equalsIgnoreCase(filterBranch.trim()))
                        ? allStudents.stream().filter(s -> filterBranch.trim().equalsIgnoreCase(s.getBranch())).toList()
                        : allStudents;
        int totalStudents = relevantStudents.size();

        long totalSelected = applications.stream().filter(a -> "Selected".equalsIgnoreCase(a.getStatus())).count();
        long totalShortlisted = applications.stream().filter(a -> "Shortlisted".equalsIgnoreCase(a.getStatus()))
                .count();
        long totalTechnicalRound = applications.stream().filter(a -> "Technical Round".equalsIgnoreCase(a.getStatus()))
                .count();
        long totalInterview = applications.stream().filter(a -> "Interview".equalsIgnoreCase(a.getStatus())).count();
        long totalApplied = applications.stream().filter(a -> "Applied".equalsIgnoreCase(a.getStatus())).count();
        long totalRejected = applications.stream().filter(a -> "Rejected".equalsIgnoreCase(a.getStatus())).count();
        long totalUnderReview = totalApplied + totalShortlisted + totalTechnicalRound + totalInterview;

        Set<Long> uniqueSelectedStudents = new HashSet<>();
        for (Application a : applications) {
            if ("Selected".equalsIgnoreCase(a.getStatus()) && a.getStudent() != null
                    && a.getStudent().getId() != null) {
                uniqueSelectedStudents.add(a.getStudent().getId());
            }
        }
        int uniqueSelectedStudentsCount = uniqueSelectedStudents.size();

        double selectionRate = totalApplications > 0 ? calcRate(totalSelected, totalApplications) : 0;
        double studentPlacementRate = totalStudents > 0 ? calcRate(uniqueSelectedStudentsCount, totalStudents) : 0;

        OfficerAnalyticsDTO dto = new OfficerAnalyticsDTO();

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalDrives", filterDriveId != null ? 1 : allDrives.size());
        summary.put("totalApplications", totalApplications);
        summary.put("uniqueApplicants", uniqueApplicantsCount);
        summary.put("totalStudents", totalStudents);
        summary.put("totalSelected", totalSelected);
        summary.put("totalShortlisted", totalShortlisted);
        summary.put("totalTechnicalRound", totalTechnicalRound);
        summary.put("totalInterview", totalInterview);
        summary.put("totalApplied", totalApplied);
        summary.put("totalRejected", totalRejected);
        summary.put("totalUnderReview", totalUnderReview);
        summary.put("selectionRate", selectionRate);
        summary.put("studentPlacementRate", studentPlacementRate);
        dto.setSummary(summary);

        // Status distribution
        List<Map<String, Object>> statusDist = new ArrayList<>();
        for (String st : VALID_STATUSES) {
            long count = applications.stream().filter(a -> st.equalsIgnoreCase(a.getStatus())).count();
            Map<String, Object> item = new HashMap<>();
            item.put("status", st);
            item.put("count", count);
            item.put("percentage", totalApplications > 0 ? calcRate(count, totalApplications) : 0);
            statusDist.add(item);
        }
        dto.setStatusDistribution(statusDist);

        // Recruitment funnel
        long stage1 = totalApplications;
        long stage2 = applications.stream()
                .filter(a -> List.of("Shortlisted", "Technical Round", "Interview", "Selected").contains(a.getStatus()))
                .count();
        long stage3 = applications.stream()
                .filter(a -> List.of("Technical Round", "Interview", "Selected").contains(a.getStatus())).count();
        long stage4 = applications.stream().filter(a -> List.of("Interview", "Selected").contains(a.getStatus()))
                .count();
        long stage5 = totalSelected;

        List<Map<String, Object>> stages = new ArrayList<>();
        stages.add(buildStage("applied", "Applications Received", "Applied", "Stage 1", stage1, totalApplications, 100,
                Math.max(0, stage1 - stage2), calcRate(Math.max(0, stage1 - stage2), stage1),
                "#2563eb", "#eff6ff", "#bfdbfe", "Total applications submitted across campus drives"));
        stages.add(buildStage("shortlisted", "Screening Cleared (Shortlisted+)", "Shortlisted", "Stage 2", stage2,
                totalApplications,
                calcRate(stage2, stage1), Math.max(0, stage2 - stage3), calcRate(Math.max(0, stage2 - stage3), stage2),
                "#d97706", "#fffbeb", "#fde68a", "Candidates meeting eligibility and advancing past screening"));
        stages.add(buildStage("technical", "Technical Evaluation (Tech Round+)", "Technical Round", "Stage 3", stage3,
                totalApplications,
                calcRate(stage3, stage2), Math.max(0, stage3 - stage4), calcRate(Math.max(0, stage3 - stage4), stage3),
                "#7c3aed", "#f5f3ff", "#ddd6fe", "Candidates evaluated in coding and technical rounds"));
        stages.add(buildStage("interview", "Formal Interview (Interview+)", "Interview", "Stage 4", stage4,
                totalApplications,
                calcRate(stage4, stage3), Math.max(0, stage4 - stage5), calcRate(Math.max(0, stage4 - stage5), stage4),
                "#4f46e5", "#eef2ff", "#c7d2fe", "Candidates appearing before technical and HR interview panels"));
        stages.add(buildStage("selected", "Offers Extended (Selected)", "Offers Extended", "Stage 5", stage5,
                totalApplications,
                calcRate(stage5, stage4), 0, 0,
                "#059669", "#ecfdf5", "#a7f3d0", "Confirmed placement offers extended to candidates"));

        Map<String, Object> funnel = new HashMap<>();
        funnel.put("stages", stages);

        Map<String, Object> pipelineHealth = new HashMap<>();
        pipelineHealth.put("totalApplications", totalApplications);
        pipelineHealth.put("activeInReview", totalUnderReview);
        pipelineHealth.put("offersExtended", totalSelected);
        pipelineHealth.put("rejected", totalRejected);
        pipelineHealth.put("overallConversionRate", selectionRate);
        funnel.put("pipelineHealth", pipelineHealth);

        dto.setRecruitmentFunnel(funnel);

        // Salary analytics
        List<Map<String, Object>> selectedSalaryValues = new ArrayList<>();
        List<Double> lpaList = new ArrayList<>();
        for (Application a : applications) {
            if ("Selected".equalsIgnoreCase(a.getStatus())) {
                String pkg = a.getDrive() != null ? a.getDrive().getPackageCtc() : null;
                double lpa = parsePackageLPA(pkg);
                if (lpa > 0) {
                    lpaList.add(lpa);
                    Map<String, Object> sal = new HashMap<>();
                    sal.put("applicationId", a.getId());
                    sal.put("studentName", a.getStudent() != null ? a.getStudent().getName() : "Student");
                    sal.put("rollNo", a.getStudent() != null ? a.getStudent().getRollNo() : "N/A");
                    sal.put("branch", a.getStudent() != null ? a.getStudent().getBranch() : "N/A");
                    sal.put("companyName",
                            a.getDrive() != null && a.getDrive().getCompany() != null
                                    ? a.getDrive().getCompany().getName()
                                    : "Company");
                    sal.put("driveTitle", a.getDrive() != null ? a.getDrive().getTitle() : "Drive");
                    sal.put("packageCTC", pkg != null ? pkg : "N/A");
                    sal.put("lpa", lpa);
                    selectedSalaryValues.add(sal);
                }
            }
        }

        Collections.sort(lpaList);
        boolean hasOffers = !lpaList.isEmpty();
        double highestLPA = hasOffers ? lpaList.get(lpaList.size() - 1) : 0;
        double lowestLPA = hasOffers ? lpaList.get(0) : 0;
        double avgLPA = hasOffers
                ? Math.round((lpaList.stream().mapToDouble(Double::doubleValue).sum() / lpaList.size()) * 100.0) / 100.0
                : 0;

        double medianLPA = 0;
        if (hasOffers) {
            int mid = lpaList.size() / 2;
            medianLPA = (lpaList.size() % 2 != 0) ? lpaList.get(mid)
                    : Math.round(((lpaList.get(mid - 1) + lpaList.get(mid)) / 2.0) * 100.0) / 100.0;
        }

        Map<String, Object> salaryAnalytics = new HashMap<>();
        salaryAnalytics.put("hasOffers", hasOffers);
        salaryAnalytics.put("offersCount", selectedSalaryValues.size());
        salaryAnalytics.put("highestLPA", highestLPA);
        salaryAnalytics.put("lowestLPA", lowestLPA);
        salaryAnalytics.put("averageLPA", avgLPA);
        salaryAnalytics.put("medianLPA", medianLPA);
        dto.setSalaryAnalytics(salaryAnalytics);

        // Drive-wise analytics
        List<PlacementDrive> targetDrives = (filterDriveId != null)
                ? allDrives.stream().filter(d -> filterDriveId.equals(d.getId())).toList()
                : allDrives;

        List<Map<String, Object>> driveAnalytics = new ArrayList<>();
        for (PlacementDrive d : targetDrives) {
            List<Application> driveApps = applications.stream()
                    .filter(a -> a.getDrive() != null && d.getId().equals(a.getDrive().getId()))
                    .toList();

            long appCount = driveApps.size();
            long selCount = driveApps.stream().filter(a -> "Selected".equalsIgnoreCase(a.getStatus())).count();
            long shortlistedCount = driveApps.stream().filter(a -> "Shortlisted".equalsIgnoreCase(a.getStatus()))
                    .count();
            long techCount = driveApps.stream().filter(a -> "Technical Round".equalsIgnoreCase(a.getStatus())).count();
            long interviewCount = driveApps.stream().filter(a -> "Interview".equalsIgnoreCase(a.getStatus())).count();
            long appliedCount = driveApps.stream().filter(a -> "Applied".equalsIgnoreCase(a.getStatus())).count();
            long rejectedCount = driveApps.stream().filter(a -> "Rejected".equalsIgnoreCase(a.getStatus())).count();
            long underReviewCount = appliedCount + shortlistedCount + techCount + interviewCount;
            double selRate = appCount > 0 ? calcRate(selCount, appCount) : 0.0;

            Map<String, Object> dData = new HashMap<>();
            dData.put("driveId", d.getId() != null ? d.getId().toString() : null);
            dData.put("id", d.getId());
            dData.put("_id", d.getId() != null ? d.getId().toString() : null);
            dData.put("driveTitle", d.getTitle() != null ? d.getTitle() : "Placement Drive");
            dData.put("companyName", (d.getCompany() != null && d.getCompany().getName() != null)
                    ? d.getCompany().getName()
                    : "Company");
            dData.put("companyLogo", (d.getCompany() != null && d.getCompany().getLogoUrl() != null)
                    ? d.getCompany().getLogoUrl()
                    : "");
            dData.put("packageCTC", d.getPackageCtc() != null ? d.getPackageCtc() : "N/A");
            dData.put("driveStatus", d.getStatus() != null ? d.getStatus() : "Upcoming");
            dData.put("status", d.getStatus() != null ? d.getStatus() : "Upcoming");
            dData.put("driveDate", d.getDriveDate());
            dData.put("applicationsCount", appCount);
            dData.put("appliedCount", appliedCount);
            dData.put("shortlistedCount", shortlistedCount);
            dData.put("technicalRoundCount", techCount);
            dData.put("interviewCount", interviewCount);
            dData.put("selectedCount", selCount);
            dData.put("rejectedCount", rejectedCount);
            dData.put("underReviewCount", underReviewCount);
            dData.put("selectionRate", selRate);

            driveAnalytics.add(dData);
        }
        dto.setDriveAnalytics(driveAnalytics);

        // Branch analytics
        Map<String, Map<String, Object>> branchMap = new LinkedHashMap<>();
        for (String b : distinctBranches) {
            Map<String, Object> bData = new HashMap<>();
            bData.put("branch", b);
            bData.put("totalStudents", allStudents.stream().filter(s -> b.equalsIgnoreCase(s.getBranch())).count());
            bData.put("applicationsCount", 0L);
            bData.put("shortlistedCount", 0L);
            bData.put("technicalRoundCount", 0L);
            bData.put("interviewCount", 0L);
            bData.put("selectedCount", 0L);
            bData.put("rejectedCount", 0L);
            bData.put("underReviewCount", 0L);
            branchMap.put(b, bData);
        }

        for (Application a : applications) {
            String b = (a.getStudent() != null && a.getStudent().getBranch() != null) ? a.getStudent().getBranch()
                    : "Unknown";
            Map<String, Object> bData = branchMap.computeIfAbsent(b, k -> {
                Map<String, Object> m = new HashMap<>();
                m.put("branch", k);
                m.put("totalStudents", 0L);
                m.put("applicationsCount", 0L);
                m.put("shortlistedCount", 0L);
                m.put("technicalRoundCount", 0L);
                m.put("interviewCount", 0L);
                m.put("selectedCount", 0L);
                m.put("rejectedCount", 0L);
                m.put("underReviewCount", 0L);
                return m;
            });

            bData.put("applicationsCount", ((Long) bData.get("applicationsCount")) + 1);
            if ("Shortlisted".equalsIgnoreCase(a.getStatus()))
                bData.put("shortlistedCount", ((Long) bData.get("shortlistedCount")) + 1);
            else if ("Technical Round".equalsIgnoreCase(a.getStatus()))
                bData.put("technicalRoundCount", ((Long) bData.get("technicalRoundCount")) + 1);
            else if ("Interview".equalsIgnoreCase(a.getStatus()))
                bData.put("interviewCount", ((Long) bData.get("interviewCount")) + 1);
            else if ("Selected".equalsIgnoreCase(a.getStatus()))
                bData.put("selectedCount", ((Long) bData.get("selectedCount")) + 1);
            else if ("Rejected".equalsIgnoreCase(a.getStatus()))
                bData.put("rejectedCount", ((Long) bData.get("rejectedCount")) + 1);

            if (List.of("Applied", "Shortlisted", "Technical Round", "Interview").contains(a.getStatus())) {
                bData.put("underReviewCount", ((Long) bData.get("underReviewCount")) + 1);
            }
        }
        dto.setBranchAnalytics(new ArrayList<>(branchMap.values()));

        // Application Roster
        List<Map<String, Object>> roster = new ArrayList<>();
        for (Application a : applications) {
            Map<String, Object> item = new HashMap<>();
            item.put("applicationId", a.getId());
            item.put("id", a.getId());
            item.put("_id", a.getId() != null ? a.getId().toString() : null);
            item.put("studentName", a.getStudent() != null ? a.getStudent().getName() : "Student");
            item.put("rollNo", a.getStudent() != null ? a.getStudent().getRollNo() : "N/A");
            item.put("email", a.getStudent() != null ? a.getStudent().getEmail() : "");
            item.put("branch", a.getStudent() != null ? a.getStudent().getBranch() : "N/A");
            item.put("cgpa", a.getStudent() != null ? a.getStudent().getCgpa() : 0);
            item.put("activeBacklogs", a.getStudent() != null ? a.getStudent().getActiveBacklogs() : 0);
            item.put("companyName",
                    a.getDrive() != null && a.getDrive().getCompany() != null ? a.getDrive().getCompany().getName()
                            : "Company");
            item.put("driveTitle", a.getDrive() != null ? a.getDrive().getTitle() : "Drive");
            item.put("packageCTC", a.getDrive() != null ? a.getDrive().getPackageCtc() : "N/A");
            item.put("appliedAt", a.getAppliedAt());
            item.put("status", a.getStatus());
            item.put("remarks", a.getRemarks() != null ? a.getRemarks() : "");
            roster.add(item);
        }
        dto.setApplicationsRoster(roster);

        // Recent applications (latest 6, respecting active filters)
        List<Map<String, Object>> recentList = new ArrayList<>();

        for (int i = 0; i < Math.min(6, applications.size()); i++) {
            Application a = applications.get(i);

            Map<String, Object> item = new HashMap<>();
            item.put("id", a.getId());
            item.put("_id", a.getId() != null ? a.getId().toString() : null);
            item.put("status", a.getStatus());
            item.put("appliedAt", a.getAppliedAt());

            // Flat compatibility properties (expected by PlacementReports.jsx and legacy
            // API compatibility)
            item.put("studentName", a.getStudent() != null && a.getStudent().getName() != null
                    ? a.getStudent().getName()
                    : "Student");
            item.put("rollNo", a.getStudent() != null && a.getStudent().getRollNo() != null
                    ? a.getStudent().getRollNo()
                    : "N/A");
            item.put("branch", a.getStudent() != null && a.getStudent().getBranch() != null
                    ? a.getStudent().getBranch()
                    : "N/A");
            item.put("email", a.getStudent() != null && a.getStudent().getEmail() != null
                    ? a.getStudent().getEmail()
                    : "");
            item.put("companyName", a.getDrive() != null && a.getDrive().getCompany() != null
                    && a.getDrive().getCompany().getName() != null
                            ? a.getDrive().getCompany().getName()
                            : "Company");
            item.put("driveTitle", a.getDrive() != null && a.getDrive().getTitle() != null
                    ? a.getDrive().getTitle()
                    : "Drive");
            item.put("packageCTC", a.getDrive() != null && a.getDrive().getPackageCtc() != null
                    ? a.getDrive().getPackageCtc()
                    : "N/A");

            // Nested structure (expected by OfficerDashboard.jsx and existing tests)
            if (a.getStudent() != null) {
                Map<String, Object> student = new HashMap<>();
                student.put("name", a.getStudent().getName());
                student.put("rollNo", a.getStudent().getRollNo());
                student.put("branch", a.getStudent().getBranch());
                item.put("student", student);
            }

            if (a.getDrive() != null) {
                Map<String, Object> drive = new HashMap<>();
                drive.put("title", a.getDrive().getTitle());

                if (a.getDrive().getCompany() != null) {
                    Map<String, Object> company = new HashMap<>();
                    company.put("name", a.getDrive().getCompany().getName());
                    company.put("logoUrl", a.getDrive().getCompany().getLogoUrl());
                    drive.put("company", company);
                }

                item.put("drive", drive);
            }

            recentList.add(item);
        }

        dto.setRecentApplications(recentList);

        // Available filters
        Map<String, Object> avFilters = new HashMap<>();
        avFilters.put("branches", new ArrayList<>(distinctBranches));
        avFilters.put("drives", driveFilterOptions);
        avFilters.put("statuses", VALID_STATUSES);
        dto.setAvailableFilters(avFilters);

        return ApiResponse.ok(dto);
    }

    private AcademicEligibilityDTO checkStudentEligibility(User student, PlacementDrive drive) {
        List<String> reasons = new ArrayList<>();

        if (student == null) {
            return new AcademicEligibilityDTO(false, List.of("Student profile not found"));
        }

        // 1. CGPA check
        if (drive.getMinCgpa() != null) {
            if (student.getCgpa() == null) {
                reasons.add("Your CGPA is not recorded in your profile. Minimum required: " + drive.getMinCgpa());
            } else if (student.getCgpa().compareTo(drive.getMinCgpa()) < 0) {
                reasons.add("Your CGPA (" + student.getCgpa() + ") is below the minimum required (" + drive.getMinCgpa()
                        + ")");
            }
        }

        // 2. Allowed branch check
        if (drive.getAllowedBranches() != null && !drive.getAllowedBranches().isEmpty()) {
            List<String> allowed = drive.getAllowedBranches().stream().map(DriveAllowedBranch::getBranch).toList();
            if (student.getBranch() == null || student.getBranch().trim().isEmpty()) {
                reasons.add("Your branch is not set in your profile");
            } else {
                boolean branchAllowed = false;
                for (String b : allowed) {
                    if (b != null && b.equalsIgnoreCase(student.getBranch().trim())) {
                        branchAllowed = true;
                        break;
                    }
                }
                if (!branchAllowed) {
                    reasons.add("Your branch (" + student.getBranch() + ") is not eligible. Allowed: "
                            + String.join(", ", allowed));
                }
            }
        }

        // 3. Max backlogs check
        if (drive.getMaxBacklogs() != null) {
            int studentBacklogs = student.getActiveBacklogs() != null ? student.getActiveBacklogs() : 0;
            if (studentBacklogs > drive.getMaxBacklogs()) {
                reasons.add("You have " + studentBacklogs + " active backlog(s). Maximum permitted: "
                        + drive.getMaxBacklogs());
            }
        }

        // 4. Passing year check
        if (drive.getPassingYear() != null && student.getPassingYear() != null) {
            if (!drive.getPassingYear().equals(student.getPassingYear())) {
                reasons.add("This drive is for the graduating batch of " + drive.getPassingYear() + " (your batch: "
                        + student.getPassingYear() + ")");
            }
        }

        return new AcademicEligibilityDTO(reasons.isEmpty(), reasons);
    }

    private double calcRate(long numerator, long denominator) {
        if (denominator <= 0)
            return 0.0;
        return Math.round(((double) numerator / denominator) * 1000.0) / 10.0;
    }

    private double parsePackageLPA(String pkgString) {
        if (pkgString == null || pkgString.trim().isEmpty())
            return 0.0;
        Pattern pattern = Pattern.compile("\\d+(?:\\.\\d+)?");
        Matcher matcher = pattern.matcher(pkgString);
        double maxVal = 0.0;
        while (matcher.find()) {
            try {
                double val = Double.parseDouble(matcher.group());
                if (val > maxVal)
                    maxVal = val;
            } catch (NumberFormatException ignored) {
            }
        }
        return maxVal;
    }

    private Map<String, Object> buildStage(String stageId, String title, String shortLabel, String badge,
            long count, long totalApps, double convFromPrev,
            long dropOffCount, double dropOffRate,
            String color, String bgColor, String borderColor, String desc) {
        Map<String, Object> stage = new HashMap<>();
        stage.put("stageId", stageId);
        stage.put("title", title);
        stage.put("shortLabel", shortLabel);
        stage.put("badge", badge);
        stage.put("count", count);
        stage.put("percentageOfTotal", totalApps > 0 ? calcRate(count, totalApps) : 0.0);
        stage.put("conversionFromPrev", convFromPrev);
        stage.put("dropOffCount", dropOffCount);
        stage.put("dropOffRate", dropOffRate);
        stage.put("color", color);
        stage.put("bgColor", bgColor);
        stage.put("borderColor", borderColor);
        stage.put("description", desc);
        return stage;
    }
}
