package com.placement.portal.controller;

import com.placement.portal.dto.ApiResponse;
import com.placement.portal.dto.auth.*;
import com.placement.portal.security.UserPrincipal;
import com.placement.portal.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponseDTO>> register(@Valid @RequestBody RegisterRequest request) {
        ApiResponse<UserResponseDTO> response = userService.register(request);
        return ResponseEntity.status(201).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserResponseDTO>> login(@RequestBody LoginRequest request) {
        ApiResponse<UserResponseDTO> response = userService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponseDTO>> getMe(@AuthenticationPrincipal UserPrincipal principal) {
        ApiResponse<UserResponseDTO> response = userService.getMe(principal.getId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponseDTO>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdateProfileRequest request) {
        ApiResponse<UserResponseDTO> response = userService.updateProfile(principal.getId(), request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/resume-upload")
    public ResponseEntity<ApiResponse<ResumeFileDTO>> uploadResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("resume") MultipartFile file) throws IOException {
        ApiResponse<ResumeFileDTO> response = userService.uploadResume(principal.getId(), file);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/resume")
    public ResponseEntity<ApiResponse<ResumeFileDTO>> deleteResume(@AuthenticationPrincipal UserPrincipal principal) {
        ApiResponse<ResumeFileDTO> response = userService.deleteResume(principal.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/resume")
    public ResponseEntity<Resource> downloadMyResume(@AuthenticationPrincipal UserPrincipal principal) {
        ResumeDownloadDTO download = userService.getResumeForDownload(principal.getId(), principal.getRole(), principal.getId());
        return createResumeDownloadResponse(download);
    }

    @GetMapping("/resume-download/{studentId}")
    public ResponseEntity<Resource> downloadStudentResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("studentId") Long studentId) {
        ResumeDownloadDTO download = userService.getResumeForDownload(principal.getId(), principal.getRole(), studentId);
        return createResumeDownloadResponse(download);
    }

    private ResponseEntity<Resource> createResumeDownloadResponse(ResumeDownloadDTO download) {
        ContentDisposition contentDisposition = ContentDisposition.inline()
            .filename(download.getOriginalName(), StandardCharsets.UTF_8)
            .build();

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(download.getMimeType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
            .contentType(mediaType)
            .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
            .body(download.getResource());
    }
}
