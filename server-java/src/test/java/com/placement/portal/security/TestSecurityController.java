package com.placement.portal.security;

import com.placement.portal.dto.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/test")
public class TestSecurityController {

    public static class TestValidationDto {
        @NotBlank(message = "Field 'name' is required")
        private String name;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<String>> publicEndpoint() {
        return ResponseEntity.ok(ApiResponse.ok("Public content accessible to everyone"));
    }

    @GetMapping("/student")
    @PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'student')")
    public ResponseEntity<ApiResponse<String>> studentEndpoint() {
        return ResponseEntity.ok(ApiResponse.ok("Student protected content"));
    }

    @GetMapping("/officer")
    @PreAuthorize("hasAnyAuthority('ROLE_OFFICER', 'officer')")
    public ResponseEntity<ApiResponse<String>> officerEndpoint() {
        return ResponseEntity.ok(ApiResponse.ok("Officer protected content"));
    }

    @GetMapping("/error")
    public ResponseEntity<ApiResponse<String>> errorEndpoint() {
        throw new IllegalStateException("Test error thrown from controller");
    }

    @PostMapping("/validation")
    public ResponseEntity<ApiResponse<String>> validationEndpoint(@Valid @RequestBody TestValidationDto dto) {
        return ResponseEntity.ok(ApiResponse.ok("Validated: " + dto.getName()));
    }
}
