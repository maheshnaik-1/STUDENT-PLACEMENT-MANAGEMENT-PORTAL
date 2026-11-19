# Legacy Test Suite (Historical Reference)

The scripts under `tests/legacy/` are retained historical test suites authored for the legacy Node.js/Express + MongoDB architecture (`server/`). They are preserved for historical reference, migration traceability, and rollback/reference purposes.

## Archived Legacy Tests

The archived suites are organized as follows:

- `tests/legacy/unit/` — historical unit tests for the legacy Node.js/MongoDB backend.
- `tests/legacy/integration/` — historical integration tests for the legacy backend and MongoDB.
- `tests/legacy/browser/` — historical browser-level verification scripts for the legacy application.

These tests are **not part of the active production test suite** and should not be used to validate the current React + Spring Boot + MySQL architecture.

## Current Active Test Suites

The active production architecture uses:

- React 18 + Vite frontend
- Java Spring Boot 3.4.3 backend
- MySQL 8.0 database
- Spring Data JPA
- Spring Security 6
- JWT authentication
- BCrypt password hashing
- Flyway database migrations

### Backend Tests

Active backend tests are located in:

`server-java/src/test/java/com/placement/portal/`

Run them with:

```bash
cd server-java
./mvnw.cmd test