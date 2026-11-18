package com.placement.portal.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ResumeStorageServiceTest {

    @TempDir
    Path tempBaseDir;

    private Path targetStorageDir;
    private Path legacyStorageDir;
    private ResumeStorageService storageService;

    @BeforeEach
    void setUp() throws IOException {
        targetStorageDir = tempBaseDir.resolve("storage/resumes");
        legacyStorageDir = tempBaseDir.resolve("server/uploads/resumes");
        Files.createDirectories(legacyStorageDir);

        storageService = new ResumeStorageService();
        ReflectionTestUtils.setField(storageService, "uploadDirProperty", targetStorageDir.toString());
        ReflectionTestUtils.setField(storageService, "legacyUploadDirProperty", legacyStorageDir.toString());
        storageService.init();
    }

    @AfterEach
    void tearDown() throws IOException {
        if (Files.exists(tempBaseDir)) {
            try (var stream = Files.walk(tempBaseDir)) {
                stream.sorted(Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(File::delete);
            }
        }
    }

    @Test
    @DisplayName("init() creates target storage directory and syncs legacy resumes safely")
    void testInit_CreatesTargetDirAndSyncsLegacyFiles() throws IOException {
        String legacyFileName = "legacy-student-resume.pdf";
        byte[] pdfContent = "%PDF-1.4 sample legacy resume".getBytes(StandardCharsets.ISO_8859_1);
        Files.write(legacyStorageDir.resolve(legacyFileName), pdfContent);

        // Re-run init to trigger legacy sync
        storageService.init();

        Path syncedFile = targetStorageDir.resolve(legacyFileName);
        assertThat(Files.exists(syncedFile)).isTrue();
        assertThat(Files.readAllBytes(syncedFile)).isEqualTo(pdfContent);

        // Legacy file must be strictly preserved
        assertThat(Files.exists(legacyStorageDir.resolve(legacyFileName))).isTrue();
    }

    @Test
    @DisplayName("storeFile saves valid PDF to target storage directory")
    void testStoreFile_SavesToTargetStorage() throws IOException {
        byte[] pdfContent = "%PDF-1.7 valid resume content".getBytes(StandardCharsets.ISO_8859_1);
        MockMultipartFile file = new MockMultipartFile("resume", "student_resume.pdf", "application/pdf", pdfContent);

        ResumeStorageService.StoredFileInfo info = storageService.storeFile(file, 42L, null);

        assertThat(info.getFilename()).startsWith("resume-42-");
        assertThat(info.getOriginalName()).isEqualTo("student_resume.pdf");

        Path storedPath = targetStorageDir.resolve(info.getFilename());
        assertThat(Files.exists(storedPath)).isTrue();
        assertThat(Files.readAllBytes(storedPath)).isEqualTo(pdfContent);
    }

    @Test
    @DisplayName("loadFileAsResource returns resource from target storage")
    void testLoadFileAsResource_FromTargetStorage() throws IOException {
        String filename = "resume-test.pdf";
        byte[] pdfContent = "%PDF-1.5 test document".getBytes(StandardCharsets.ISO_8859_1);
        Files.write(targetStorageDir.resolve(filename), pdfContent);

        Resource resource = storageService.loadFileAsResource(filename);
        assertThat(resource.exists()).isTrue();
        assertThat(resource.contentLength()).isEqualTo(pdfContent.length);
    }

    @Test
    @DisplayName("loadFileAsResource falls back to legacy location and syncs on-demand if missing in target")
    void testLoadFileAsResource_FallbackToLegacyStorage() throws IOException {
        String filename = "unmigrated-resume.pdf";
        byte[] pdfContent = "%PDF-1.5 unmigrated document".getBytes(StandardCharsets.ISO_8859_1);
        Files.write(legacyStorageDir.resolve(filename), pdfContent);

        // Target storage does NOT have the file yet
        assertThat(Files.exists(targetStorageDir.resolve(filename))).isFalse();

        Resource resource = storageService.loadFileAsResource(filename);
        assertThat(resource.exists()).isTrue();
        assertThat(resource.contentLength()).isEqualTo(pdfContent.length);

        // Verified on-demand synced to target storage
        assertThat(Files.exists(targetStorageDir.resolve(filename))).isTrue();
    }

    @Test
    @DisplayName("Path traversal attempts are rejected with 400 Bad Request")
    void testPathTraversal_Blocked() {
        assertThatThrownBy(() -> storageService.loadFileAsResource("../../etc/passwd"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    @DisplayName("deletePhysicalFile removes file from target storage while preserving legacy file")
    void testDeletePhysicalFile_RemovesFromTargetOnly() throws IOException {
        String filename = "file-to-delete.pdf";
        byte[] pdfContent = "%PDF-1.4 delete test".getBytes(StandardCharsets.ISO_8859_1);
        Files.write(targetStorageDir.resolve(filename), pdfContent);
        Files.write(legacyStorageDir.resolve(filename), pdfContent);

        storageService.deletePhysicalFile(filename);

        assertThat(Files.exists(targetStorageDir.resolve(filename))).isFalse();
        // Legacy file must remain intact for safety
        assertThat(Files.exists(legacyStorageDir.resolve(filename))).isTrue();
    }
}

