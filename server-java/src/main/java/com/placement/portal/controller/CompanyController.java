package com.placement.portal.controller;

import com.placement.portal.dto.ApiResponse;
import com.placement.portal.dto.company.CompanyDetailsDTO;
import com.placement.portal.dto.company.CompanyRequest;
import com.placement.portal.dto.company.CompanyResponseDTO;
import com.placement.portal.service.CompanyService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/companies")
public class CompanyController {

    @Autowired
    private CompanyService companyService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CompanyResponseDTO>>> getCompanies(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "industry", required = false) String industry) {
        ApiResponse<List<CompanyResponseDTO>> response = companyService.getAllCompanies(search, industry);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CompanyDetailsDTO>> getCompanyById(@PathVariable("id") Long id) {
        ApiResponse<CompanyDetailsDTO> response = companyService.getCompanyById(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_OFFICER', 'officer')")
    public ResponseEntity<ApiResponse<CompanyResponseDTO>> createCompany(@Valid @RequestBody CompanyRequest request) {
        ApiResponse<CompanyResponseDTO> response = companyService.createCompany(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_OFFICER', 'officer')")
    public ResponseEntity<ApiResponse<CompanyResponseDTO>> updateCompany(
            @PathVariable("id") Long id,
            @RequestBody CompanyRequest request) {
        ApiResponse<CompanyResponseDTO> response = companyService.updateCompany(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_OFFICER', 'officer')")
    public ResponseEntity<ApiResponse<Void>> deleteCompany(@PathVariable("id") Long id) {
        ApiResponse<Void> response = companyService.deleteCompany(id);
        return ResponseEntity.ok(response);
    }
}
