package com.placement.portal.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.stream.Stream;

@Service
public class ResumeStorageService {

    private static final Logger log = LoggerFactory.getLogger(ResumeStorageService.class);

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    private static final List<String> ALLOWED_EXTENSIONS = List.of(".pdf", ".doc", ".docx");

    private static final List<String> ALLOWED_MIME_TYPES = List.of(
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    private static final byte[] OLE2_HEADER = new byte[] {
        (byte) 0xd0, (byte) 0xcf, (byte) 0x11, (byte) 0xe0,
        (byte) 0xa1, (byte) 0xb1, (byte) 0x1a, (byte) 0xe1
    };

    @Value("${resume.storage.path:${placement.resume.upload-dir:${RESUME_STORAGE_PATH:${RESUME_UPLOAD_DIR:../storage/resumes}}}}")
    private String uploadDirProperty;

    @Value("${resume.legacy.storage.path:${RESUME_LEGACY_STORAGE_PATH:../server/uploads/resumes}}")
    private String legacyUploadDirProperty;

    private Path uploadDir;
    private Path legacyDir;

    @PostConstruct
    public void init() {
        this.uploadDir = Paths.get(uploadDirProperty).toAbsolutePath().normalize();
        this.legacyDir = Paths.get(legacyUploadDirProperty).toAbsolutePath().normalize();
        try {
            if (!Files.exists(this.uploadDir)) {
                Files.createDirectories(this.uploadDir);
                log.info("Initialized resume storage directory: {}", this.uploadDir);
            }
            syncLegacyResumesIfPresent();
        } catch (IOException e) {
            log.error("Could not initialize upload directory: {}", this.uploadDir, e);
        }
    }

    private void syncLegacyResumesIfPresent() {
        try {
            if (Files.exists(this.legacyDir) && Files.isDirectory(this.legacyDir) && !this.legacyDir.equals(this.uploadDir)) {
                try (Stream<Path> stream = Files.list(this.legacyDir)) {
                    stream.filter(Files::isRegularFile).forEach(legacyFile -> {
                        String fileName = legacyFile.getFileName().toString();
                        Path targetFile = this.uploadDir.resolve(fileName).normalize();
                        if (targetFile.startsWith(this.uploadDir) && !Files.exists(targetFile)) {
                            try {
                                Files.copy(legacyFile, targetFile, StandardCopyOption.COPY_ATTRIBUTES);
                                log.info("Safely synchronized legacy resume [{}] to target storage [{}]", fileName, targetFile);
                            } catch (IOException copyEx) {
                                log.warn("Non-fatal issue copying legacy resume [{}]: {}", fileName, copyEx.getMessage());
                            }
                        }
                    });
                }
            }
        } catch (Exception ex) {
            log.warn("Legacy resume sync skipped or encountered non-fatal error: {}", ex.getMessage());
        }
    }

    public Path getUploadDir() {
        return uploadDir;
    }

    public static class StoredFileInfo {
        private final String filename;
        private final String originalName;
        private final String mimeType;
        private final long size;
        private final String path;

        public StoredFileInfo(String filename, String originalName, String mimeType, long size, String path) {
            this.filename = filename;
            this.originalName = originalName;
            this.mimeType = mimeType;
            this.size = size;
            this.path = path;
        }

        public String getFilename() { return filename; }
        public String getOriginalName() { return originalName; }
        public String getMimeType() { return mimeType; }
        public long getSize() { return size; }
        public String getPath() { return path; }
    }

    public StoredFileInfo storeFile(MultipartFile file, Long userId, String oldFilename) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select a resume file to upload (PDF, DOC, DOCX up to 5MB)");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File size exceeds the 5MB limit. Please upload a file smaller than 5MB.");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename().trim() : "";
        String ext = extractExtension(originalFilename);

        if (!ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file type. Only PDF (.pdf), DOC (.doc), and DOCX (.docx) documents are supported.");
        }

        byte[] bytes = file.getBytes();
        if (bytes.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uploaded file is empty.");
        }

        verifyContent(bytes, ext);

        // Generate safe unique filename
        long timestamp = System.currentTimeMillis();
        int randomSuffix = (int) (Math.random() * 1_000_000_000);
        String safeFilename = "resume-" + (userId != null ? userId : "guest") + "-" + timestamp + "-" + randomSuffix + ext.toLowerCase();

        Path targetLocation = uploadDir.resolve(safeFilename).normalize();
        if (!targetLocation.startsWith(uploadDir)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file path traversal attempt.");
        }

        Files.write(targetLocation, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

        // Safely purge old file if different
        if (oldFilename != null && !oldFilename.isBlank() && !oldFilename.equals(safeFilename)) {
            deletePhysicalFile(oldFilename);
        }

        String mimeType = file.getContentType();
        if (mimeType == null || !ALLOWED_MIME_TYPES.contains(mimeType)) {
            mimeType = ext.equalsIgnoreCase(".pdf") ? "application/pdf" :
                       ext.equalsIgnoreCase(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
                       "application/msword";
        }

        return new StoredFileInfo(safeFilename, originalFilename, mimeType, file.getSize(), targetLocation.toString());
    }

    public void deletePhysicalFile(String filename) {
        if (filename == null || filename.isBlank()) return;
        try {
            String cleanName = Paths.get(filename).getFileName().toString();
            Path filePath = uploadDir.resolve(cleanName).normalize();
            if (filePath.startsWith(uploadDir) && Files.exists(filePath)) {
                Files.delete(filePath);
            }
        } catch (Exception ex) {
            log.warn("Warning deleting resume file {}: {}", filename, ex.getMessage());
        }
    }

    public Resource loadFileAsResource(String filename) {
        if (filename == null || filename.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No uploaded resume found for this student");
        }

        String cleanName = Paths.get(filename).getFileName().toString();
        Path filePath = uploadDir.resolve(cleanName).normalize();

        if (!filePath.startsWith(uploadDir)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file path traversal attempt.");
        }

        if (Files.exists(filePath)) {
            return new FileSystemResource(filePath.toFile());
        }

        // Safety fallback: check legacy directory if not yet copied to target storage
        if (legacyDir != null && Files.exists(legacyDir) && !legacyDir.equals(uploadDir)) {
            Path legacyFilePath = legacyDir.resolve(cleanName).normalize();
            if (legacyFilePath.startsWith(legacyDir) && Files.exists(legacyFilePath)) {
                try {
                    Files.copy(legacyFilePath, filePath, StandardCopyOption.COPY_ATTRIBUTES);
                    log.info("On-demand synced legacy resume [{}] to target storage", cleanName);
                    return new FileSystemResource(filePath.toFile());
                } catch (Exception ex) {
                    log.warn("Fallback to direct legacy file reading for [{}]: {}", cleanName, ex.getMessage());
                    return new FileSystemResource(legacyFilePath.toFile());
                }
            }
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resume file not found on server disk");
    }

    private void verifyContent(byte[] bytes, String ext) {
        String lowerExt = ext.toLowerCase();
        if (lowerExt.equals(".pdf")) {
            int checkLen = Math.min(bytes.length, 1024);
            String header = new String(bytes, 0, checkLen, StandardCharsets.ISO_8859_1);
            if (!header.startsWith("%PDF-") && !header.contains("%PDF-")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid PDF file. The file content does not contain a valid PDF signature (%PDF-).");
            }
        } else if (lowerExt.equals(".docx")) {
            if (bytes.length < 4) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid DOCX file. File is too small.");
            }
            boolean isZip = bytes[0] == 0x50 && bytes[1] == 0x4B && bytes[2] == 0x03 && bytes[3] == 0x04;
            if (!isZip) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid DOCX file. The file is not a valid ZIP archive.");
            }
            String content = new String(bytes, StandardCharsets.ISO_8859_1);
            boolean hasContentTypes = content.contains("[Content_Types].xml");
            boolean hasWordDir = content.contains("word/") || content.contains("word\\");
            if (!hasContentTypes || !hasWordDir) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid DOCX file. The file content does not match the Microsoft Word (OOXML) structure.");
            }
        } else if (lowerExt.equals(".doc")) {
            if (bytes.length < 8) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid DOC file. File is too small.");
            }
            for (int i = 0; i < 8; i++) {
                if (bytes[i] != OLE2_HEADER[i]) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid DOC file. Missing Microsoft Compound Document (OLE2) binary header.");
                }
            }
        }
    }

    private String extractExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex >= 0) {
            return filename.substring(dotIndex);
        }
        return "";
    }
}
