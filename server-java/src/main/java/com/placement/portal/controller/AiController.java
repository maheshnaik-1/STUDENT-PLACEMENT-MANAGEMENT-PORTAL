package com.placement.portal.controller;

import com.placement.portal.dto.ApiResponse;
import com.placement.portal.dto.ai.ResumeAnalysisResponseDTO;
import com.placement.portal.security.UserPrincipal;
import com.placement.portal.service.ResumeParserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final ResumeParserService resumeParserService;

    public AiController(ResumeParserService resumeParserService) {
        this.resumeParserService = resumeParserService;
    }

    /**
     * Parse and extract skills/contact info from authenticated student's stored resume.
     * Route: POST /api/ai/parse-resume
     * Access: Private (Student only)
     */
    @PostMapping("/parse-resume")
    @PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'student')")
    public ResponseEntity<ApiResponse<ResumeAnalysisResponseDTO>> parseMyResume(
            @AuthenticationPrincipal UserPrincipal principal) {
        ResumeAnalysisResponseDTO analysis = resumeParserService.parseMyResume(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(analysis));
    }
}

