package com.placement.portal.service;

import com.placement.portal.dto.ApiResponse;
import com.placement.portal.dto.company.CompanyDetailsDTO;
import com.placement.portal.dto.company.CompanyRequest;
import com.placement.portal.dto.company.CompanyResponseDTO;
import com.placement.portal.dto.drive.DriveResponseDTO;
import com.placement.portal.entity.Company;
import com.placement.portal.entity.PlacementDrive;
import com.placement.portal.repository.ApplicationRepository;
import com.placement.portal.repository.ApplicationWithdrawalRepository;
import com.placement.portal.repository.CompanyRepository;
import com.placement.portal.repository.PlacementDriveRepository;
import com.placement.portal.util.ValidationUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CompanyService {

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private PlacementDriveRepository placementDriveRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationWithdrawalRepository applicationWithdrawalRepository;

    @Transactional(readOnly = true)
    public ApiResponse<List<CompanyResponseDTO>> getAllCompanies(String search, String industry) {
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        String cleanIndustry = (industry != null && !industry.trim().isEmpty() && !"ALL".equalsIgnoreCase(industry.trim()))
                ? industry.trim()
                : null;

        List<Company> companies = companyRepository.searchCompanies(cleanSearch, cleanIndustry);
        List<CompanyResponseDTO> dtos = new ArrayList<>();

        for (Company comp : companies) {
            long totalDrives = placementDriveRepository.countByCompanyId(comp.getId());
            long activeDrives = placementDriveRepository.countByCompanyIdAndStatusIn(
                    comp.getId(),
                    List.of("Upcoming", "Ongoing")
            );
            dtos.add(CompanyResponseDTO.fromEntity(comp, totalDrives, activeDrives));
        }

        return ApiResponse.okWithCount(dtos, dtos.size());
    }

    @Transactional(readOnly = true)
    public ApiResponse<CompanyDetailsDTO> getCompanyById(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));

        long totalDrives = placementDriveRepository.countByCompanyId(company.getId());
        long activeDrives = placementDriveRepository.countByCompanyIdAndStatusIn(
                company.getId(),
                List.of("Upcoming", "Ongoing")
        );

        List<PlacementDrive> drives = placementDriveRepository.findByCompanyIdOrderByDriveDateDesc(id);
        List<DriveResponseDTO> driveDTOs = new ArrayList<>();
        for (PlacementDrive drive : drives) {
            long applicantCount = applicationRepository.countByDriveId(drive.getId());
            driveDTOs.add(DriveResponseDTO.fromEntity(drive, applicantCount));
        }

        CompanyDetailsDTO detailsDTO = new CompanyDetailsDTO();
        detailsDTO.setId(company.getId());
        detailsDTO.set_id(company.getId() != null ? company.getId().toString() : null);
        detailsDTO.setName(company.getName());
        detailsDTO.setIndustry(company.getIndustry());
        detailsDTO.setWebsite(company.getWebsite() != null ? company.getWebsite() : "");
        detailsDTO.setLocation(company.getLocation());
        detailsDTO.setDescription(company.getDescription());
        detailsDTO.setContactEmail(company.getContactEmail() != null ? company.getContactEmail() : "");
        detailsDTO.setContactPerson(company.getContactPerson() != null ? company.getContactPerson() : "");
        detailsDTO.setLogoUrl(company.getLogoUrl() != null ? company.getLogoUrl() : "");
        detailsDTO.setCreatedAt(company.getCreatedAt());
        detailsDTO.setUpdatedAt(company.getUpdatedAt());
        detailsDTO.setTotalDrives(totalDrives);
        detailsDTO.setActiveDrives(activeDrives);
        detailsDTO.setDrives(driveDTOs);

        return ApiResponse.ok(detailsDTO);
    }

    @Transactional
    public ApiResponse<CompanyResponseDTO> createCompany(CompanyRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company name is required");
        }
        if (request.getIndustry() == null || request.getIndustry().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Industry is required");
        }
        if (request.getLocation() == null || request.getLocation().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Location is required");
        }
        if (request.getDescription() == null || request.getDescription().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description is required");
        }

        String trimmedName = request.getName().trim();
        if (companyRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Company '" + trimmedName + "' is already registered in the system");
        }

        if (request.getWebsite() != null && !request.getWebsite().isBlank() && !ValidationUtil.isValidUrl(request.getWebsite())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please provide a valid website URL (e.g. https://...)");
        }
        if (request.getLogoUrl() != null && !request.getLogoUrl().isBlank() && !ValidationUtil.isValidUrl(request.getLogoUrl())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please provide a valid logo URL (e.g. https://...)");
        }

        Company company = new Company();
        company.setName(trimmedName);
        company.setIndustry(request.getIndustry().trim());
        company.setLocation(request.getLocation().trim());
        company.setDescription(request.getDescription().trim());
        company.setWebsite(request.getWebsite() != null ? request.getWebsite().trim() : "");
        company.setContactEmail(request.getContactEmail() != null ? request.getContactEmail().trim() : "");
        company.setContactPerson(request.getContactPerson() != null ? request.getContactPerson().trim() : "");
        company.setLogoUrl(request.getLogoUrl() != null ? request.getLogoUrl().trim() : "");

        Company saved = companyRepository.save(company);
        CompanyResponseDTO dto = CompanyResponseDTO.fromEntity(saved, 0L, 0L);

        return ApiResponse.ok("Company '" + saved.getName() + "' added successfully!", dto);
    }

    @Transactional
    public ApiResponse<CompanyResponseDTO> updateCompany(Long id, CompanyRequest request) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            String newName = request.getName().trim();
            if (!newName.equalsIgnoreCase(company.getName())) {
                Optional<Company> existing = companyRepository.findByNameIgnoreCase(newName);
                if (existing.isPresent() && !existing.get().getId().equals(id)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Company '" + newName + "' is already registered in the system");
                }
                company.setName(newName);
            }
        }

        if (request.getIndustry() != null && !request.getIndustry().trim().isEmpty()) {
            company.setIndustry(request.getIndustry().trim());
        }
        if (request.getLocation() != null && !request.getLocation().trim().isEmpty()) {
            company.setLocation(request.getLocation().trim());
        }
        if (request.getDescription() != null && !request.getDescription().trim().isEmpty()) {
            company.setDescription(request.getDescription().trim());
        }
        if (request.getWebsite() != null) {
            if (!request.getWebsite().isBlank() && !ValidationUtil.isValidUrl(request.getWebsite())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please provide a valid website URL (e.g. https://...)");
            }
            company.setWebsite(request.getWebsite().trim());
        }
        if (request.getContactEmail() != null) {
            company.setContactEmail(request.getContactEmail().trim());
        }
        if (request.getContactPerson() != null) {
            company.setContactPerson(request.getContactPerson().trim());
        }
        if (request.getLogoUrl() != null) {
            if (!request.getLogoUrl().isBlank() && !ValidationUtil.isValidUrl(request.getLogoUrl())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please provide a valid logo URL (e.g. https://...)");
            }
            company.setLogoUrl(request.getLogoUrl().trim());
        }

        Company updated = companyRepository.save(company);
        long totalDrives = placementDriveRepository.countByCompanyId(id);
        long activeDrives = placementDriveRepository.countByCompanyIdAndStatusIn(id, List.of("Upcoming", "Ongoing"));

        return ApiResponse.ok("Company updated successfully!", CompanyResponseDTO.fromEntity(updated, totalDrives, activeDrives));
    }

    @Transactional
    public ApiResponse<Void> deleteCompany(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));

        List<PlacementDrive> drives = placementDriveRepository.findByCompanyId(id);
        if (!drives.isEmpty()) {
            List<Long> driveIds = drives.stream().map(PlacementDrive::getId).toList();
            applicationWithdrawalRepository.deleteByDriveIdIn(driveIds);
            applicationRepository.deleteByDriveIdIn(driveIds);
            placementDriveRepository.deleteAll(drives);
        }

        companyRepository.delete(company);
        return ApiResponse.message("Company '" + company.getName() + "' and all associated drives deleted successfully.");
    }
}
