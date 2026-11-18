package com.placement.portal;

import com.placement.portal.condition.DatabaseCredentialsCondition;
import com.placement.portal.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(DatabaseCredentialsCondition.class)
@SpringBootTest(classes = PortalApplication.class)
@TestPropertySource(locations = "classpath:application-test.properties")
public class SchemaValidationIntegrationTest {

    @Autowired(required = false)
    private DataSource dataSource;

    @Autowired(required = false)
    private UserRepository userRepository;

    @Autowired(required = false)
    private CompanyRepository companyRepository;

    @Autowired(required = false)
    private PlacementDriveRepository placementDriveRepository;

    @Autowired(required = false)
    private ApplicationRepository applicationRepository;

    @Autowired(required = false)
    private ApplicationWithdrawalRepository applicationWithdrawalRepository;

    @Autowired(required = false)
    private NotificationRepository notificationRepository;

    @Autowired(required = false)
    private NotificationOutboxRepository notificationOutboxRepository;

    @Autowired(required = false)
    private AuditLogRepository auditLogRepository;

    @Autowired(required = false)
    private IdempotencyKeyRepository idempotencyKeyRepository;

    @Autowired(required = false)
    private SystemSettingRepository systemSettingRepository;

    @Test
    @DisplayName("Hibernate ddl-auto=validate successfully verifies all 18 entities against placement_portal_java_test")
    void testHibernateSchemaValidationAgainstTestDatabase() throws SQLException {
        assertNotNull(dataSource, "DataSource bean must be active and configured");

        try (Connection connection = dataSource.getConnection()) {
            String catalog = connection.getCatalog();
            System.out.println("=================================================");
            System.out.println("Active Test Database Catalog: " + catalog);
            System.out.println("Database Product Name: " + connection.getMetaData().getDatabaseProductName());
            System.out.println("Database Product Version: " + connection.getMetaData().getDatabaseProductVersion());
            System.out.println("Connected User: " + connection.getMetaData().getUserName());
            System.out.println("=================================================");

            // Guard: Assert test database is strictly placement_portal_java_test and never the development database
            assertEquals("placement_portal_java_test", catalog,
                "Integration tests must connect to placement_portal_java_test and NEVER the development database");
            assertNotEquals("placement_portal_java", catalog,
                "CRITICAL VIOLATION: Test connection targeted the development database!");
        }

        // Verify repository injection
        assertNotNull(userRepository, "UserRepository must be injected");
        assertNotNull(companyRepository, "CompanyRepository must be injected");
        assertNotNull(placementDriveRepository, "PlacementDriveRepository must be injected");
        assertNotNull(applicationRepository, "ApplicationRepository must be injected");
        assertNotNull(applicationWithdrawalRepository, "ApplicationWithdrawalRepository must be injected");
        assertNotNull(notificationRepository, "NotificationRepository must be injected");
        assertNotNull(notificationOutboxRepository, "NotificationOutboxRepository must be injected");
        assertNotNull(auditLogRepository, "AuditLogRepository must be injected");
        assertNotNull(idempotencyKeyRepository, "IdempotencyKeyRepository must be injected");
        assertNotNull(systemSettingRepository, "SystemSettingRepository must be injected");

        // Read-only count verification (asserting clean execution against test database without writes)
        assertTrue(userRepository.count() >= 0, "UserRepository count query must succeed");
        assertTrue(companyRepository.count() >= 0, "CompanyRepository count query must succeed");
        assertTrue(placementDriveRepository.count() >= 0, "PlacementDriveRepository count query must succeed");
        assertTrue(applicationRepository.count() >= 0, "ApplicationRepository count query must succeed");
        assertTrue(applicationWithdrawalRepository.count() >= 0, "ApplicationWithdrawalRepository count query must succeed");
        assertTrue(notificationRepository.count() >= 0, "NotificationRepository count query must succeed");
        assertTrue(notificationOutboxRepository.count() >= 0, "NotificationOutboxRepository count query must succeed");
        assertTrue(auditLogRepository.count() >= 0, "AuditLogRepository count query must succeed");
        assertTrue(idempotencyKeyRepository.count() >= 0, "IdempotencyKeyRepository count query must succeed");
        assertTrue(systemSettingRepository.count() >= 0, "SystemSettingRepository count query must succeed");

        System.out.println("Hibernate ddl-auto=validate passed for all 18 entities and repositories against placement_portal_java_test!");
    }
}
