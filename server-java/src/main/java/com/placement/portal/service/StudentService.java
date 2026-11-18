package com.placement.portal.service;

import com.placement.portal.dto.ApiResponse;
import com.placement.portal.dto.application.ApplicationResponseDTO;
import com.placement.portal.dto.student.StudentSummaryDTO;
import com.placement.portal.entity.Application;
import com.placement.portal.entity.User;
import com.placement.portal.repository.ApplicationRepository;
import com.placement.portal.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class StudentService {

    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;

    public StudentService(UserRepository userRepository, ApplicationRepository applicationRepository) {
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
    }

    public ApiResponse<List<StudentSummaryDTO>> getAllStudents(String branch, String search, BigDecimal minCgpa) {
        String cleanBranch = (branch != null && !branch.isBlank() && !"ALL".equalsIgnoreCase(branch.trim()) && !"undefined".equalsIgnoreCase(branch.trim()))
                ? branch.trim()
                : null;
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        List<User> students = userRepository.findStudentsFiltered(cleanBranch, minCgpa, cleanSearch);
        List<StudentSummaryDTO> result = new ArrayList<>();

        for (User st : students) {
            List<Application> apps = applicationRepository.findByStudentId(st.getId());
            int totalApps = apps.size();

            Application selectedApp = null;
            for (Application a : apps) {
                if ("Selected".equalsIgnoreCase(a.getStatus())) {
                    selectedApp = a;
                    break;
                }
            }

            String placementStatus;
            ApplicationResponseDTO selectedOffer = null;
            if (selectedApp != null) {
                String companyName = (selectedApp.getDrive() != null && selectedApp.getDrive().getCompany() != null && selectedApp.getDrive().getCompany().getName() != null)
                        ? selectedApp.getDrive().getCompany().getName()
                        : "Company";
                placementStatus = "Placed at " + companyName;
                selectedOffer = ApplicationResponseDTO.fromEntity(selectedApp);
            } else if (totalApps > 0) {
                placementStatus = "In Progress";
            } else {
                placementStatus = "Not Applied";
            }

            result.add(StudentSummaryDTO.fromUser(st, totalApps, placementStatus, selectedOffer));
        }

        return ApiResponse.okWithCount(result, result.size());
    }

    public ApiResponse<StudentSummaryDTO> getStudentById(Long id) {
        User student = userRepository.findByIdAndRole(id, "student")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        List<Application> apps = applicationRepository.findByStudentIdOrderByAppliedAtDesc(id);
        List<ApplicationResponseDTO> appDTOs = new ArrayList<>();
        Application selectedApp = null;

        for (Application a : apps) {
            appDTOs.add(ApplicationResponseDTO.fromEntity(a));
            if (selectedApp == null && "Selected".equalsIgnoreCase(a.getStatus())) {
                selectedApp = a;
            }
        }

        StudentSummaryDTO dto = StudentSummaryDTO.fromUserWithApplications(student, appDTOs);
        if (selectedApp != null) {
            String companyName = (selectedApp.getDrive() != null && selectedApp.getDrive().getCompany() != null && selectedApp.getDrive().getCompany().getName() != null)
                    ? selectedApp.getDrive().getCompany().getName()
                    : "Company";
            dto.setPlacementStatus("Placed at " + companyName);
            dto.setSelectedOffer(ApplicationResponseDTO.fromEntity(selectedApp));
        } else if (!apps.isEmpty()) {
            dto.setPlacementStatus("In Progress");
        } else {
            dto.setPlacementStatus("Not Applied");
        }

        return ApiResponse.ok(dto);
    }
}
