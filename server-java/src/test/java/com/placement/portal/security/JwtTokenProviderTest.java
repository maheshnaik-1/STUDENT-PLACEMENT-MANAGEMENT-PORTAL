package com.placement.portal.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;
    private final String secret = "college_placement_portal_super_secret_key_2026";
    private final long expirationMs = 3600000; // 1 hour

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(tokenProvider, "jwtSecret", secret);
        ReflectionTestUtils.setField(tokenProvider, "jwtExpirationInMs", expirationMs);
    }

    @Test
    @DisplayName("Successfully generate and validate a valid JWT token")
    void testGenerateAndValidateToken() {
        String token = tokenProvider.generateToken(101L, "student@college.edu", "student");

        assertNotNull(token, "Generated token should not be null");
        assertTrue(tokenProvider.validateToken(token), "Token should be valid");
    }

    @Test
    @DisplayName("Correctly extract userId, email, and role claims from JWT token")
    void testExtractClaimsFromToken() {
        Long expectedId = 42L;
        String expectedEmail = "officer@college.edu";
        String expectedRole = "officer";

        String token = tokenProvider.generateToken(expectedId, expectedEmail, expectedRole);

        assertEquals(expectedId, tokenProvider.getUserIdFromToken(token), "Extracted user ID should match");
        assertEquals(expectedEmail, tokenProvider.getEmailFromToken(token), "Extracted email should match");
        assertEquals(expectedRole, tokenProvider.getRoleFromToken(token), "Extracted role should match");
    }

    @Test
    @DisplayName("Reject expired JWT token")
    void testExpiredTokenValidation() {
        // Generate token with negative expiration (already expired)
        String expiredToken = tokenProvider.generateTokenWithExpiry(1L, "expired@college.edu", "student", -5000);

        assertNotNull(expiredToken);
        assertFalse(tokenProvider.validateToken(expiredToken), "Expired token should fail validation");
    }

    @Test
    @DisplayName("Reject JWT token with invalid signature")
    void testInvalidSignatureValidation() {
        // Create another provider with a different secret
        JwtTokenProvider untrustedProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(untrustedProvider, "jwtSecret", "completely_different_untrusted_signing_secret_with_32_bytes_length!");
        ReflectionTestUtils.setField(untrustedProvider, "jwtExpirationInMs", expirationMs);

        String forgedToken = untrustedProvider.generateToken(1L, "hacker@domain.com", "officer");

        assertFalse(tokenProvider.validateToken(forgedToken), "Token signed with different secret must fail validation");
    }

    @Test
    @DisplayName("Reject malformed JWT strings and null/empty tokens")
    void testMalformedAndEmptyTokenValidation() {
        assertFalse(tokenProvider.validateToken("not.a.valid.jwt.structure"), "Malformed JWT should fail validation");
        assertFalse(tokenProvider.validateToken(""), "Empty string should fail validation");
        assertFalse(tokenProvider.validateToken(null), "Null token should fail validation");
    }

    @Test
    @DisplayName("Security: Missing JWT_SECRET throws IllegalStateException")
    void testMissingSecret_ThrowsException() {
        JwtTokenProvider unconfigured = new JwtTokenProvider();
        ReflectionTestUtils.setField(unconfigured, "jwtSecret", "");
        assertThrows(IllegalStateException.class, unconfigured::validateSecret,
            "Missing JWT_SECRET must throw IllegalStateException");
    }

    @Test
    @DisplayName("Security: Insecure short JWT_SECRET (< 32 chars) throws IllegalStateException")
    void testShortSecret_ThrowsException() {
        JwtTokenProvider unconfigured = new JwtTokenProvider();
        ReflectionTestUtils.setField(unconfigured, "jwtSecret", "too-short-secret-key-123");
        assertThrows(IllegalStateException.class, unconfigured::validateSecret,
            "Short JWT_SECRET (< 32 chars) must throw IllegalStateException");
    }
}
