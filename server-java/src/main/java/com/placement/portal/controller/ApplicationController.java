package com.placement.portal.controller;

import com.placement.portal.dto.ApiResponse;
import com.placement.portal.dto.application.*;
import com.placement.portal.security.UserPrincipal;
import com.placement.portal.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    // 1. Public / Summary Stats
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<PlacementStatsDTO>> getPlacementStats() {
        ApiResponse<PlacementStatsDTO> response = applicationService.getPlacementStats();
        return ResponseEntity.ok(response);
    }

    // 2. Student Routes
    @PostMapping("/apply/{driveId}")
    @PreAuthorize("hasAnyRole('student', 'ROLE_STUDENT')")
    public ResponseEntity<ApiResponse<ApplicationResponseDTO>> applyForDrive(
            @PathVariable("driveId") Long driveId,
            @AuthenticationPrincipal UserPrincipal principal) {
        ApiResponse<ApplicationResponseDTO> response = applicationService.applyForDrive(driveId, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/my-applications")
    @PreAuthorize("hasAnyRole('student', 'ROLE_STUDENT')")
    public ResponseEntity<ApiResponse<List<ApplicationResponseDTO>>> getMyApplications(
            @AuthenticationPrincipal UserPrincipal principal) {
        ApiResponse<List<ApplicationResponseDTO>> response = applicationService.getMyApplications(principal.getId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}/withdraw")
    @PreAuthorize("hasAnyRole('student', 'ROLE_STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> withdrawApplication(
            @PathVariable("id") Long applicationId,
            @AuthenticationPrincipal UserPrincipal principal) {
        ApiResponse<Map<String, Object>> response = applicationService.withdrawApplication(applicationId, principal.getId());
        return ResponseEntity.ok(response);
    }

    // 3. Placement Officer Routes
    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('officer', 'ROLE_OFFICER')")
    public ResponseEntity<ApiResponse<OfficerAnalyticsDTO>> getOfficerAnalytics(
            @RequestParam(value = "driveId", required = false) Long driveId,
            @RequestParam(value = "branch", required = false) String branch,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "search", required = false) String search) {
        ApiResponse<OfficerAnalyticsDTO> response = applicationService.getOfficerAnalytics(driveId, branch, status, search);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/drive/{driveId}")
    @PreAuthorize("hasAnyRole('officer', 'ROLE_OFFICER')")
    public ResponseEntity<DriveApplicantsResponseDTO> getDriveApplicants(
            @PathVariable("driveId") Long driveId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "search", required = false) String search) {
        DriveApplicantsResponseDTO response = applicationService.getDriveApplicants(driveId, status, search);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/drive/{driveId}/match-scores")
    @PreAuthorize("hasAnyRole('officer', 'ROLE_OFFICER')")
    public ResponseEntity<ApiResponse<ApplicantMatchScoresResponseDTO>> getDriveApplicantMatchScores(
            @PathVariable("driveId") Long driveId) {
        ApiResponse<ApplicantMatchScoresResponseDTO> response = applicationService.getDriveApplicantMatchScores(driveId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('officer', 'ROLE_OFFICER')")
    public ResponseEntity<ApiResponse<ApplicationResponseDTO>> updateApplicationStatus(
            @PathVariable("id") Long applicationId,
            @Valid @RequestBody StatusUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        ApiResponse<ApplicationResponseDTO> response = applicationService.updateApplicationStatus(
                applicationId, request.getStatus(), request.getRemarks(), principal != null ? principal.getId() : null);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/bulk-status")
    @PreAuthorize("hasAnyRole('officer', 'ROLE_OFFICER')")
    public ResponseEntity<ApiResponse<BulkStatusUpdateResponseDTO>> bulkUpdateApplicationStatus(
            @Valid @RequestBody BulkStatusUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        ApiResponse<BulkStatusUpdateResponseDTO> response = applicationService.bulkUpdateApplicationStatus(
                request, principal != null ? principal.getId() : null);
        return ResponseEntity.ok(response);
    }
}
