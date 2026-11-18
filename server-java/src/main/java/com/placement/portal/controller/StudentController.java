package com.placement.portal.controller;

import com.placement.portal.dto.ApiResponse;
import com.placement.portal.dto.student.StudentSummaryDTO;
import com.placement.portal.service.StudentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_OFFICER', 'officer')")
    public ResponseEntity<ApiResponse<List<StudentSummaryDTO>>> getAllStudents(
            @RequestParam(value = "branch", required = false) String branch,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "minCGPA", required = false) BigDecimal minCGPA) {
        ApiResponse<List<StudentSummaryDTO>> response = studentService.getAllStudents(branch, search, minCGPA);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_OFFICER', 'officer')")
    public ResponseEntity<ApiResponse<StudentSummaryDTO>> getStudentById(@PathVariable("id") Long id) {
        ApiResponse<StudentSummaryDTO> response = studentService.getStudentById(id);
        return ResponseEntity.ok(response);
    }
}

