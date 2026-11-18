# Legacy Test Suite (Historical Reference)

The scripts in this directory (`tests/unit/`, `tests/integration/`, `tests/browser/`) are retained historical test suites authored for the legacy Node.js/Express + MongoDB architecture (`server/`). They interact directly with MongoDB via Mongoose.

## Current Test Suites (React + Spring Boot + MySQL)

For the active production architecture, all automated unit and integration tests are located in:

### Backend Tests (Spring Boot + JUnit 5 + MockMvc)
Located in `server-java/src/test/java/com/placement/portal/`:
- `AuthIntegrationTest`: Authentication, registration, token issuance, and password security.
- `PlacementControllerTest`: Drive management, applicant tracking, and eligibility validation.
- `ResumeSecurityIntegrationTest`: Multi-tenant ownership, path traversal defenses, and resume lifecycle.
- `SkillDeduplicationTest`: Technical skill normalization and integrity.

To execute the active test suite:
```bash
cd server-java
./mvnw.cmd test
```

### Frontend Build & Lint Verification
Located in `client/`:
```bash
npm run build --prefix client
```

