package com.placement.portal.controller;

import com.placement.portal.dto.ApiResponse;
import com.placement.portal.dto.drive.DriveMatchScoreDTO;
import com.placement.portal.dto.drive.DriveRecommendationDTO;
import com.placement.portal.dto.drive.DriveRequest;
import com.placement.portal.dto.drive.DriveResponseDTO;
import com.placement.portal.security.UserPrincipal;
import com.placement.portal.service.PlacementDriveService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/drives")
public class PlacementDriveController {

    @Autowired
    private PlacementDriveService placementDriveService;

    @GetMapping("/recommendations")
    @PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'student')")
    public ResponseEntity<ApiResponse<List<DriveRecommendationDTO>>> getRecommendations(
            @AuthenticationPrincipal UserPrincipal principal) {
        ApiResponse<List<DriveRecommendationDTO>> response = placementDriveService.getDriveRecommendations(principal.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/match-score")
    @PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'student')")
    public ResponseEntity<ApiResponse<DriveMatchScoreDTO>> getMatchScore(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        ApiResponse<DriveMatchScoreDTO> response = placementDriveService.getDriveMatchScore(id, principal.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DriveResponseDTO>>> getDrives(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "branch", required = false) String branch,
            @RequestParam(value = "eligibleOnly", required = false) String eligibleOnly,
            @AuthenticationPrincipal UserPrincipal principal) {
        ApiResponse<List<DriveResponseDTO>> response = placementDriveService.getAllDrives(
                search, status, branch, eligibleOnly, principal
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DriveResponseDTO>> getDriveById(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        ApiResponse<DriveResponseDTO> response = placementDriveService.getDriveById(id, principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_OFFICER', 'officer')")
    public ResponseEntity<ApiResponse<DriveResponseDTO>> createDrive(
            @Valid @RequestBody DriveRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long createdBy = principal != null ? principal.getId() : null;
        ApiResponse<DriveResponseDTO> response = placementDriveService.createDrive(request, createdBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_OFFICER', 'officer')")
    public ResponseEntity<ApiResponse<DriveResponseDTO>> updateDrive(
            @PathVariable("id") Long id,
            @RequestBody DriveRequest request) {
        ApiResponse<DriveResponseDTO> response = placementDriveService.updateDrive(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_OFFICER', 'officer')")
    public ResponseEntity<ApiResponse<Void>> deleteDrive(@PathVariable("id") Long id) {
        ApiResponse<Void> response = placementDriveService.deleteDrive(id);
        return ResponseEntity.ok(response);
    }
}
