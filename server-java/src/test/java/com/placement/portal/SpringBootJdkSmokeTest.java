package com.placement.portal;

import com.placement.portal.service.SmokeProxyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import com.placement.portal.repository.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = PortalApplication.class)
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "spring.autoconfigure.exclude=" +
        "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration," +
        "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration," +
        "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration," +
        "org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration"
})
class SpringBootJdkSmokeTest {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private SmokeProxyService proxyService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private CompanyRepository companyRepository;

    @MockitoBean
    private PlacementDriveRepository placementDriveRepository;

    @MockitoBean
    private ApplicationRepository applicationRepository;

    @MockitoBean
    private ApplicationWithdrawalRepository applicationWithdrawalRepository;

    @MockitoBean
    private NotificationRepository notificationRepository;

    @Test
    void contextLoadsAndDynamicProxiesGenerateCleanlyOnHostJdk() {
        assertNotNull(context, "Spring ApplicationContext must load and not be null");
        assertNotNull(proxyService, "Injected service bean must not be null");
        assertEquals("PROXY_ACTIVE", proxyService.testProxy());

        System.out.println("=================================================");
        System.out.println("Host JVM Version: " + System.getProperty("java.version"));
        System.out.println("Host JVM Vendor: " + System.getProperty("java.vendor"));
        System.out.println("Host Java Home: " + System.getProperty("java.home"));
        System.out.println("Spring Boot ApplicationContext: STARTED SUCCESSFULLY");
        System.out.println("CGLIB/ByteBuddy Proxy Execution: PASSED");
        System.out.println("=================================================");
    }
}
