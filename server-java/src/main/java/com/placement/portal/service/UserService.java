package com.placement.portal.service;

import com.placement.portal.dto.ApiResponse;
import com.placement.portal.dto.auth.*;
import com.placement.portal.entity.*;
import com.placement.portal.repository.UserRepository;
import com.placement.portal.security.JwtTokenProvider;
import com.placement.portal.util.ValidationUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private ResumeStorageService resumeStorageService;

    @Transactional
    public ApiResponse<UserResponseDTO> register(RegisterRequest req) {
        if (req.getEmail() == null || req.getEmail().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please provide your college email address");
        }
        String cleanEmail = req.getEmail().toLowerCase().trim();

        if (userRepository.existsByEmail(cleanEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A user with this email address already exists");
        }

        String cleanRollNo = null;
        if (req.getRollNo() != null && !req.getRollNo().isBlank()) {
            cleanRollNo = req.getRollNo().toUpperCase().trim();
            if (userRepository.findByRollNo(cleanRollNo).isPresent()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A student with this Roll Number is already registered");
            }
        }

        if (req.getPassword() == null || req.getPassword().trim().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
        }

        User user = new User();
        user.setName(req.getName() != null ? req.getName().trim() : "");
        user.setEmail(cleanEmail);
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setRole("student"); // Strictly student registration
        user.setRollNo(cleanRollNo);
        user.setBranch(req.getBranch() != null && !req.getBranch().isBlank() ? req.getBranch().trim() : "CSE");
        user.setCgpa(ValidationUtil.parseBigDecimal(req.getCgpa(), BigDecimal.ZERO));
        user.setActiveBacklogs(ValidationUtil.parseInteger(req.getActiveBacklogs(), 0));
        user.setPassingYear(ValidationUtil.parseInteger(req.getPassingYear(), 2026));
        user.setPhone(req.getPhone() != null ? req.getPhone().trim() : "");
        user.setResumeUrl(req.getResumeUrl() != null ? req.getResumeUrl().trim() : "");

        List<String> parsedSkills = ValidationUtil.parseSkills(req.getSkills());
        for (String s : parsedSkills) {
            user.getSkills().add(new StudentSkill(user, s));
        }

        user = userRepository.save(user);

        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
        UserResponseDTO userDTO = UserResponseDTO.fromEntity(user);

        ApiResponse<UserResponseDTO> response = ApiResponse.ok("Student registration successful!", userDTO);
        response.setToken(token);
        response.setUser(userDTO);
        return response;
    }

    @Transactional(readOnly = true)
    public ApiResponse<UserResponseDTO> login(LoginRequest req) {
        if (req.getEmail() == null || req.getEmail().isBlank() || req.getPassword() == null || req.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please provide both email and password");
        }

        String cleanEmail = req.getEmail().toLowerCase().trim();
        User user = userRepository.findByEmail(cleanEmail)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials. User not found."));

        if (req.getRole() != null && !req.getRole().isBlank()) {
            String expectedRole = req.getRole().trim();
            if (!user.getRole().equalsIgnoreCase(expectedRole)) {
                String portalName = "officer".equalsIgnoreCase(expectedRole) ? "Placement Officer" : "Student";
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials for " + portalName + " portal.");
            }
        }

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
        UserResponseDTO userDTO = UserResponseDTO.fromEntity(user);

        ApiResponse<UserResponseDTO> response = ApiResponse.ok("Welcome back, " + user.getName() + "!", userDTO);
        response.setToken(token);
        response.setUser(userDTO);
        return response;
    }

    @Transactional(readOnly = true)
    public ApiResponse<UserResponseDTO> getMe(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        UserResponseDTO userDTO = UserResponseDTO.fromEntity(user);
        ApiResponse<UserResponseDTO> response = ApiResponse.ok(userDTO);
        response.setUser(userDTO);
        return response;
    }

    @Transactional
    public ApiResponse<UserResponseDTO> updateProfile(Long userId, UpdateProfileRequest req) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (req.getName() != null && !req.getName().isBlank()) {
            user.setName(req.getName().trim());
        }
        if (req.getPhone() != null) {
            user.setPhone(req.getPhone().trim());
        }
        if (req.getResumeUrl() != null) {
            if (!ValidationUtil.isValidUrl(req.getResumeUrl())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please provide a valid resume URL (e.g., https://...)");
            }
            user.setResumeUrl(req.getResumeUrl().trim());
        }

        // Student-specific fields
        if ("student".equalsIgnoreCase(user.getRole())) {
            if (req.getBranch() != null && !req.getBranch().isBlank()) {
                user.setBranch(req.getBranch().trim());
            }
            if (req.getCgpa() != null) {
                user.setCgpa(ValidationUtil.parseBigDecimal(req.getCgpa(), user.getCgpa()));
            }
            if (req.getActiveBacklogs() != null) {
                user.setActiveBacklogs(ValidationUtil.parseInteger(req.getActiveBacklogs(), user.getActiveBacklogs()));
            }
            if (req.getPassingYear() != null) {
                user.setPassingYear(ValidationUtil.parseInteger(req.getPassingYear(), user.getPassingYear()));
            }

            if (req.getSkills() != null) {
                List<String> newSkills = ValidationUtil.parseSkills(req.getSkills());
                if (user.getSkills() == null) {
                    user.setSkills(new ArrayList<>());
                }

                Map<String, String> requestedSkillMap = new LinkedHashMap<>();
                for (String s : newSkills) {
                    if (s != null && !s.trim().isEmpty()) {
                        String clean = s.trim();
                        requestedSkillMap.putIfAbsent(clean.toLowerCase(Locale.ROOT), clean);
                    }
                }

                // 1. Remove skills from user.getSkills() that are no longer in requested list
                user.getSkills().removeIf(existing ->
                    existing.getSkill() == null ||
                    !requestedSkillMap.containsKey(existing.getSkill().trim().toLowerCase(Locale.ROOT))
                );

                // 2. Identify existing skills and update canonical casing if needed
                Set<String> existingLower = new HashSet<>();
                for (StudentSkill existing : user.getSkills()) {
                    if (existing.getSkill() != null) {
                        String lower = existing.getSkill().trim().toLowerCase(Locale.ROOT);
                        existingLower.add(lower);
                        String canonical = requestedSkillMap.get(lower);
                        if (canonical != null && !canonical.equals(existing.getSkill())) {
                            existing.setSkill(canonical);
                        }
                    }
                }

                // 3. Add only newly requested skills that are not already present
                for (Map.Entry<String, String> entry : requestedSkillMap.entrySet()) {
                    if (!existingLower.contains(entry.getKey())) {
                        user.getSkills().add(new StudentSkill(user, entry.getValue()));
                        existingLower.add(entry.getKey());
                    }
                }
            }

            if (req.getAcademicDetails() != null) {
                AcademicDetailsDTO ad = req.getAcademicDetails();
                if (ad.getTenthPercentage() != null) {
                    if (ad.getTenthPercentage().compareTo(BigDecimal.ZERO) < 0 || ad.getTenthPercentage().compareTo(BigDecimal.valueOf(100)) > 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "10th percentage must be a number between 0 and 100");
                    }
                    user.setTenthPercentage(ad.getTenthPercentage());
                }
                if (ad.getTwelfthPercentage() != null) {
                    if (ad.getTwelfthPercentage().compareTo(BigDecimal.ZERO) < 0 || ad.getTwelfthPercentage().compareTo(BigDecimal.valueOf(100)) > 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "12th percentage must be a number between 0 and 100");
                    }
                    user.setTwelfthPercentage(ad.getTwelfthPercentage());
                }
                if (ad.getDiplomaPercentage() != null) {
                    if (ad.getDiplomaPercentage().compareTo(BigDecimal.ZERO) < 0 || ad.getDiplomaPercentage().compareTo(BigDecimal.valueOf(100)) > 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Diploma percentage must be a number between 0 and 100");
                    }
                    user.setDiplomaPercentage(ad.getDiplomaPercentage());
                }
                if (ad.getCurrentSemester() != null) {
                    if (ad.getCurrentSemester() < 1 || ad.getCurrentSemester() > 12) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current semester must be an integer between 1 and 12");
                    }
                    user.setCurrentSemester(ad.getCurrentSemester());
                }
                if (ad.getGapYears() != null) {
                    if (ad.getGapYears() < 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Gap years must be a non-negative number");
                    }
                    user.setGapYears(ad.getGapYears());
                }
            }

            if (req.getLinks() != null) {
                LinksDTO l = req.getLinks();
                if (l.getGithub() != null) {
                    if (!ValidationUtil.isValidUrl(l.getGithub())) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "GitHub link must be a valid URL format (e.g. https://github.com/...)");
                    }
                    user.setGithubLink(l.getGithub().trim());
                }
                if (l.getLinkedin() != null) {
                    if (!ValidationUtil.isValidUrl(l.getLinkedin())) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "LinkedIn link must be a valid URL format (e.g. https://linkedin.com/...)");
                    }
                    user.setLinkedinLink(l.getLinkedin().trim());
                }
                if (l.getPortfolio() != null) {
                    if (!ValidationUtil.isValidUrl(l.getPortfolio())) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Portfolio link must be a valid URL format (e.g. https://...)");
                    }
                    user.setPortfolioLink(l.getPortfolio().trim());
                }
            }

            if (req.getProjects() != null) {
                user.getProjects().clear();
                for (ProjectDTO p : req.getProjects()) {
                    if (p != null) {
                        if (p.getLink() != null && !ValidationUtil.isValidUrl(p.getLink())) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid project URL format for project \"" + (p.getTitle() != null ? p.getTitle() : "Untitled") + "\"");
                        }
                        StudentProject sp = new StudentProject();
                        sp.setStudent(user);
                        sp.setTitle(p.getTitle() != null ? p.getTitle().trim() : "");
                        sp.setDescription(p.getDescription() != null ? p.getDescription().trim() : "");
                        sp.setLink(p.getLink() != null ? p.getLink().trim() : "");
                        if (p.getTechStack() != null) {
                            for (String tech : p.getTechStack()) {
                                if (tech != null && !tech.trim().isEmpty()) {
                                    sp.getTechStacks().add(new StudentProjectTechStack(sp, tech.trim()));
                                }
                            }
                        }
                        user.getProjects().add(sp);
                    }
                }
            }

            if (req.getCertifications() != null) {
                user.getCertifications().clear();
                for (CertificationDTO c : req.getCertifications()) {
                    if (c != null) {
                        if (c.getCertificateUrl() != null && !ValidationUtil.isValidUrl(c.getCertificateUrl())) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid certificate URL format for \"" + (c.getName() != null ? c.getName() : "Untitled") + "\"");
                        }
                        StudentCertification sc = new StudentCertification();
                        sc.setStudent(user);
                        sc.setName(c.getName() != null ? c.getName().trim() : "");
                        sc.setIssuer(c.getIssuer() != null ? c.getIssuer().trim() : "");
                        sc.setIssueDate(c.getIssueDate() != null ? c.getIssueDate().trim() : "");
                        sc.setCertificateUrl(c.getCertificateUrl() != null ? c.getCertificateUrl().trim() : "");
                        user.getCertifications().add(sc);
                    }
                }
            }
        }

        // Optional password change
        if (req.getPassword() != null && req.getPassword().trim().length() >= 6) {
            user.setPassword(passwordEncoder.encode(req.getPassword().trim()));
        }

        user = userRepository.save(user);
        UserResponseDTO userDTO = UserResponseDTO.fromEntity(user);

        ApiResponse<UserResponseDTO> response = ApiResponse.ok("Profile updated successfully!", userDTO);
        response.setUser(userDTO);
        return response;
    }

    @Transactional
    public ApiResponse<ResumeFileDTO> uploadResume(Long userId, MultipartFile file) throws IOException {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        ResumeStorageService.StoredFileInfo stored = resumeStorageService.storeFile(file, userId, user.getResumeFileName());

        user.setResumeFileName(stored.getFilename());
        user.setResumeOriginalName(stored.getOriginalName());
        user.setResumeMimeType(stored.getMimeType());
        user.setResumeSize(stored.getSize());
        user.setResumePath(stored.getPath());
        user.setResumeUploadedAt(Instant.now());

        userRepository.save(user);

        ResumeFileDTO rf = new ResumeFileDTO(
            stored.getFilename(),
            stored.getOriginalName(),
            stored.getMimeType(),
            stored.getSize(),
            stored.getPath(),
            user.getResumeUploadedAt()
        );
        ApiResponse<ResumeFileDTO> response = ApiResponse.ok("Resume uploaded successfully!", rf);
        response.setResumeFile(rf);
        return response;
    }

    @Transactional
    public ApiResponse<ResumeFileDTO> deleteResume(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getResumeFileName() != null && !user.getResumeFileName().isBlank()) {
            resumeStorageService.deletePhysicalFile(user.getResumeFileName());
        }

        user.setResumeFileName(null);
        user.setResumeOriginalName(null);
        user.setResumeMimeType(null);
        user.setResumeSize(null);
        user.setResumePath(null);
        user.setResumeUploadedAt(null);

        userRepository.save(user);

        ResumeFileDTO rf = new ResumeFileDTO(null, null, null, null, null, null);
        return ApiResponse.ok("Uploaded resume removed successfully", rf);
    }

    @Transactional(readOnly = true)
    public ResumeDownloadDTO getResumeForDownload(Long requestingUserId, String requestingUserRole, Long targetStudentId) {
        Long effectiveId = targetStudentId != null ? targetStudentId : requestingUserId;

        if ("student".equalsIgnoreCase(requestingUserRole) && !requestingUserId.equals(effectiveId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not authorized to access this resume");
        }

        User targetUser = userRepository.findById(effectiveId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        if (targetUser.getResumeFileName() == null || targetUser.getResumeFileName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No uploaded resume found for this student");
        }

        Resource resource = resumeStorageService.loadFileAsResource(targetUser.getResumeFileName());
        String mimeType = targetUser.getResumeMimeType() != null && !targetUser.getResumeMimeType().isBlank()
            ? targetUser.getResumeMimeType()
            : "application/octet-stream";

        String originalName = targetUser.getResumeOriginalName() != null && !targetUser.getResumeOriginalName().isBlank()
            ? targetUser.getResumeOriginalName()
            : targetUser.getResumeFileName();

        return new ResumeDownloadDTO(resource, originalName, mimeType);
    }
}
