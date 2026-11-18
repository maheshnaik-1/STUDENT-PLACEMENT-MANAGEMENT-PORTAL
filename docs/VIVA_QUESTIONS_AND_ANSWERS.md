# STUDENT PLACEMENT MANAGEMENT PORTAL
## Complete Faculty Viva Questions & Answers Bank
> **B.Tech CSE Mini Project** — Technical Viva & Evaluation Guide

This viva preparation guide covers the complete technical architecture, design decisions, source code explanations, database design, security mechanisms, critical bug resolutions, and full-stack implementation details for the B.Tech CSE mini project.

---

### Part 1: Architecture & Technology Stack

#### Q1. What is the architecture of this project and why was this technology stack chosen?
**Answer:**
The project implements a decoupled **3-tier client-server architecture**:
1. **Presentation Layer (Frontend):** React 18 Single Page Application (SPA) powered by Vite, providing responsive UI rendering, client-side route protection, and centralized state management via Context API.
2. **Application / Business Logic Layer (Backend):** Java Spring Boot 3.4.3 (running on JDK 26.0.2) delivering a RESTful API with layered controllers, services, DTOs, and Spring Security 6 stateless JWT authentication.
3. **Data Persistence Layer (Database):** MySQL 8.0 relational database (`placement_portal_java`) managed via Spring Data JPA and Hibernate ORM with HikariCP connection pooling.

**Why this stack was chosen:**
- **Enterprise Robustness & Type Safety:** Java and Spring Boot provide strict compile-time type safety, dependency injection, and clear separation of concerns compared to loosely typed script backends.
- **Relational Integrity & ACID Transactions:** Campus placements require strict relational integrity (students, drives, applications, timelines), foreign keys, and unique composite constraints that a relational database like MySQL 8.0 guarantees.
- **High Developer Velocity:** React with Vite provides instant hot-module replacement and component modularity, while Spring Data JPA eliminates boilerplate SQL.

#### Q2. How is communication established between React and Spring Boot?
**Answer:**
- The React frontend communicates with the Spring Boot backend over standard HTTP REST APIs using a centralized native fetch() client wrapper (`client/src/services/api.js`).
- For local development, the React application runs on port `3000` while the Spring Boot backend listens on port `5000`.
- The Vite development configuration (`client/vite.config.js`) proxies all `/api` requests to `http://localhost:5000`, preventing Cross-Origin Resource Sharing (CORS) issues during development.
- In production, Spring Boot's `WebMvcConfigurer` configures CORS policies explicitly.
- Every authenticated HTTP request attaches an `Authorization: Bearer <JWT_TOKEN>` header intercepted by the backend security filter chain.

#### Q3. What is the role of the legacy `server/` directory and why is it retained?
**Answer:**
- The `server/` directory contains the legacy Node.js/Express backend from the prototype phase of the project.
- It is **inactive** and not part of the active runtime.
- It is retained strictly as historical documentation and rollback evidence to demonstrate project evolution and data migration parity.
- The active, running backend is entirely contained within `server-java/`.

---

### Part 2: Authentication, Security & Resume Access

#### Q4. How is user authentication handled? Why is JWT used?
**Answer:**
We use stateless **JSON Web Token (JWT)** authentication managed by Spring Security:
1. When a student or officer logs in via `POST /api/auth/login`, `AuthController` calls `UserService`.
2. The user's credentials are verified against MySQL using `AuthenticationManager` and BCrypt password hashing.
3. Upon successful authentication, `JwtTokenProvider` generates a cryptographically signed JWT containing the user ID, email, and assigned role.
4. The token is returned to the client and stored in browser `localStorage`.
5. On every subsequent request, `JwtAuthenticationFilter` intercepts the HTTP `Authorization` header, validates the signature, extracts the claims, loads the `UserPrincipal`, and populates the `SecurityContextHolder`.

**Why JWT is used:**
- **Statelessness:** The server does not store session state in memory (`SessionCreationPolicy.STATELESS`), making the backend horizontally scalable.
- **Secure Claims:** The token carries tamper-proof role and identity claims verified via HMAC-SHA signature.

#### Q5. How is password security implemented in the backend?
**Answer:**
- Passwords are never stored in plaintext.
- The backend configures `BCryptPasswordEncoder` in `SecurityConfig.java`.
- When a student registers via `POST /api/auth/register`, their plaintext password is automatically hashed with a random salt before persisting to the `users` table.
- During login, `passwordEncoder.matches(rawPassword, encodedPassword)` safely validates credentials.

#### Q6. How does Role-Based Access Control (RBAC) work in Spring Boot and React?
**Answer:**
We support two primary roles: `ROLE_STUDENT` and `ROLE_OFFICER`.
- **Backend Protection:** We use method-level security via `@PreAuthorize`. For example, officer endpoints (such as drive creation or status advancement) are annotated with `@PreAuthorize("hasRole('OFFICER')")`, while student actions (such as applying to drives) use `@PreAuthorize("hasRole('STUDENT')")`. Unauthorized requests are intercepted by `JwtAccessDeniedHandler` (403 Forbidden) or `JwtAuthenticationEntryPoint` (401 Unauthorized).
- **Frontend Protection:** React Router wraps protected views inside route guards (`ProtectedRoute.jsx`), checking `user.role` from `AuthContext` and redirecting unauthorized users.

#### Q7. How is student resume upload, download, and ownership security implemented?
**Answer:**
- **Upload:** Resumes are uploaded as multipart PDF files (`POST /api/auth/resume-upload`). `ResumeStorageService` writes the file to the local filesystem using a UUID-prefixed filename to prevent directory traversal and file collisions. The storage path is saved in the `User` entity.
- **Download Authorization (`/api/auth/resume-download/{studentId}`):**
  - **Student Self-Access:** A student can only view or download their own resume (`principal.getId().equals(studentId)`).
  - **Officer Access:** Placement officers can access resumes only for students who have submitted applications to drives.
  - **Cross-Student Access Isolation:** If Student A attempts to access Student B's resume by calling `/api/auth/resume-download/{studentB_id}`, the service detects the principal ID mismatch and immediately rejects the request with **HTTP 403 Forbidden**. This isolation was verified through targeted security tests.

#### Q8. What does `CustomUserDetailsService` and `UserPrincipal` do?
**Answer:**
- `CustomUserDetailsService` implements Spring Security's `UserDetailsService`. It loads the user record from `UserRepository` by email or ID.
- `UserPrincipal` implements `UserDetails`. It wraps the `User` entity, exposing the user ID, email, hashed password, and mapping the role string into a Spring Security `SimpleGrantedAuthority` (e.g. `ROLE_STUDENT` or `ROLE_OFFICER`).

---

### Part 3: Business Logic, Eligibility Engine & Application Tracking

#### Q9. How does the Automated Eligibility Verification Engine work?
**Answer:**
The eligibility engine resides in `PlacementDriveService.java`. When a student requests placement drives, the service evaluates the student's profile against the drive's criteria:
1. **CGPA Check:** `student.getCgpa() >= drive.getMinCgpa()`
2. **Branch Check:** `drive.getAllowedBranches().contains(student.getBranch())`
3. **Backlog Check:** `student.getActiveBacklogs() <= drive.getMaxBacklogs()`
4. **Passing Year Check:** `student.getPassingYear().equals(drive.getPassingYear())`

If all conditions evaluate to `true`, the drive DTO is returned with `isEligible = true`. If any condition fails, `isEligible = false` and specific, actionable explanation messages are appended (e.g. *"Requires minimum CGPA 7.50 (Yours: 7.10)"* or *"Branch MECH not in allowed branches"*).

#### Q10. How does the system prevent duplicate applications?
**Answer:**
Duplicate prevention is enforced at two levels:
1. **Service Layer:** In `ApplicationService.java`, before creating an application, `applicationRepository.findByDriveIdAndStudentId(driveId, studentId)` checks if a record exists. If present, it throws a bad request exception.
2. **Database Layer:** The MySQL `applications` table enforces a composite unique constraint on `(drive_id, student_id)`. Even under concurrent race conditions, MySQL rejects duplicate rows with a unique key violation.

#### Q11. What is the recruitment stage progression model and how is the timeline tracked?
**Answer:**
The application lifecycle follows a progressive state model:
`APPLIED` → `SHORTLISTED` → `TECH_ROUND` → `INTERVIEW` → `SELECTED` / `REJECTED`
- When an application is created, an initial `ApplicationTimeline` entity is persisted with status `APPLIED`.
- Whenever a Placement Officer updates a candidate's stage via `PUT /api/applications/{id}/status`, `ApplicationService` updates the status, logs officer remarks, creates a new timestamped `ApplicationTimeline` entry, and queues an in-app notification for the student.
- Students can view the complete audit timeline on their **My Applications** page.

#### Q12. Can a student withdraw an application?
**Answer:**
Yes. The portal supports student self-withdrawal via `POST /api/applications/withdraw/{id}`. `ApplicationService` verifies that the requesting student owns the application and that the recruitment drive has not yet finalized. Upon withdrawal, the status is updated and an audit entry is logged in `application_withdrawals`.

---

### Part 4: Database Design, JPA/Hibernate & Historical Migration

#### Q13. Describe the relational schema in MySQL (`placement_portal_java`).
**Answer:**
The MySQL 8.0 database is normalized into structured relational tables:
- `users`: Core identity table (name, email, password, role, resume file path).
- `student_profiles`: One-to-one extension holding branch, CGPA, backlogs, and graduation year.
- `student_skills`: Element collection table mapped to student technical skills.
- `companies`: Registered recruiter details (name, industry, location, contact email).
- `placement_drives`: Core hiring drives with salary CTC, eligibility thresholds, and deadlines.
- `drive_allowed_branches`: Child table with composite unique key `(drive_id, branch)` defining eligible departments.
- `drive_required_skills`: Child table with composite unique key `(drive_id, skill)` defining requisite skills.
- `applications`: Junction table associating students with drives (`drive_id`, `student_id`).
- `application_timelines`: Audit trail storing stage changes, timestamps, and feedback remarks.
- `notifications`: Student notification messages.

#### Q14. What is the role of Spring Data JPA and Hibernate in this project?
**Answer:**
- **Hibernate ORM:** Acts as the JPA provider that maps Java entity classes (`@Entity`) to MySQL tables, managing relational associations (`@ManyToOne`, `@OneToMany`, `@Embedded`).
- **Spring Data JPA:** Provides repository interfaces (e.g. `PlacementDriveRepository`, `ApplicationRepository`) that generate boilerplate CRUD and JPQL queries automatically at runtime.
- **Transaction Management:** Handled via `@Transactional`, ensuring that multi-table operations (e.g. updating an application and inserting a timeline entry) succeed or roll back atomically.

#### Q15. Explain the historical migration from MongoDB to MySQL.
**Answer:**
- During the initial rapid prototyping phase, MongoDB was used.
- To meet institutional academic standards, enforce foreign key referential integrity, and guarantee strict ACID transactions, the project underwent a complete migration to **MySQL 8.0**.
- Migration scripts in `migration-tools/` extracted BSON documents, mapped MongoDB ObjectIds to integer foreign keys, and validated 100% data parity.
- Schema definitions, grant permissions, and reconciliation logs are documented in `database-notes/`.
- MongoDB was retired, and MySQL 8.0 is now the sole active database.

---

### Part 5: Critical Bug Fixes & Technical Challenges

#### Q16. What was the Placement Drive update bug, and how was it resolved?
**Answer:**
- **The Issue:** When an officer updated a placement drive (e.g. changing the commencement date), the update failed with:
  `Duplicate entry '4-AI&DS' for key 'drive_allowed_branches.uk_drive_branch'`.
- **Root Cause:** In `PlacementDriveService.java`, the old update method called `drive.getAllowedBranches().clear()`, followed by re-instantiating and adding the branch objects. In Hibernate, the `ActionQueue` executes inserts before orphan deletions during flush. Because the rows already existed with the unique constraint `(drive_id, branch)`, the immediate inserts collided with existing rows before the deletions could occur.
- **The Solution:** We implemented **in-place collection reconciliation**:
  1. Use `removeIf()` to delete only branches no longer present in the update payload.
  2. Retain existing branch entities that match the incoming payload.
  3. Instantiate and append only genuinely new branch entries.
- The exact same reconciliation pattern was applied to `drive_required_skills`.
- **Verification:** Verified with unit tests, regression tests in `PlacementDriveDatabaseIntegrationTest`, and confirmed working in live UI testing.

#### Q17. How did you resolve the Officer Analytics defect?
**Answer:**
- In `ApplicationService.java`, the `getOfficerAnalytics()` method calculated drive-performance analytics, but omitted the call to populate the DTO: `dto.setDriveAnalytics(driveAnalytics);`.
- Because of this missing setter call, the React frontend Drive Performance tab showed an empty list.
- We added the missing setter invocation, preserving the existing calculation logic without altering the frontend or backend contract. This was verified with regression tests in `ApplicationIntegrationTest`.

---

### Part 6: Testing, Quality Assurance & Build Verification

#### Q18. How was the application tested and verified?
**Answer:**
The project was subjected to multi-layered automated testing:
- **Spring Boot Backend Test Suite:**
  - Ran `.\mvnw.cmd test` in `server-java/`.
  - **127 total tests executed: 127 passed, 0 failures, 0 errors, 0 skipped (`BUILD SUCCESS`)**.
  - Covers Controller MockMvc tests, service business logic, Spring Security filter chains, and database integration.
- **Frontend Production Build:**
  - Executed `npm run build` in `client/` using Vite.
  - Zero compilation errors, producing an optimized production bundle.
- **Database Integration Tests:**
  - Tested relational constraints, foreign-key cascades, and in-place child reconciliation via `PlacementDriveDatabaseIntegrationTest`.
- **Security & Authorization Verification:**
  - Cross-student resume isolation and role guard tests verified via automated integration tests.

#### Q19. How do you start the project for demonstration?
**Answer:**
1. **Ensure MySQL 8.0 is running:** Verify the service with `Get-Service MySQL80` on port 3306.
2. **Terminal 1 (Backend):**
   ```powershell
   cd "D:\Student Placement Management Portal\server-java"
   $env:JWT_SECRET = "<your_jwt_secret>"
   $env:PLACEMENT_APP_PASSWORD = "<your_mysql_password>"
   .\mvnw.cmd spring-boot:run
   ```
   Listens on port `5000`.
3. **Terminal 2 (Frontend):**
   ```powershell
   cd "D:\Student Placement Management Portal\client"
   npm run dev
   ```
   Listens on port `3000`.
4. **Access Portal:** Open browser at `http://localhost:3000/login`.

---

### Part 7: Future Enhancements

#### Q20. What are the planned future enhancements for this portal?
**Answer:**
1. **Cloud Object Storage (AWS S3):** Transition resume PDF storage from the local server filesystem to AWS S3 using time-limited pre-signed URLs.
2. **External Notification Gateways:** Integrate SendGrid or Twilio for automatic email and SMS alerts when application stages update.
3. **Integrated Technical Assessment Engine:** An in-portal coding challenge and quiz module for preliminary screening rounds.

---

### Part 8: Full-Stack Technical Defense

#### 1. Full-Stack System Summary & Technical Overview
> *"The Student Placement Management Portal is an enterprise full-stack web application designed to automate campus recruitment end-to-end: featuring a reactive user interface in React and Vite, a Java Spring Boot 3.4.3 REST backend, stateless JWT security and role-based access control with Spring Security, a normalized relational schema in MySQL 8.0, and validation through a comprehensive 127-test automated regression suite."*

#### 2. Frontend Architecture & Presentation Focus (React 18 + Vite)
- **Key Files:** `client/src/App.jsx`, `client/src/context/AuthContext.jsx`, `client/src/context/NotificationContext.jsx`, `client/src/services/api.js`, `client/src/pages/`
- **Key Talking Points:**
  - Designed a responsive Single Page Application (SPA) using React 18 and Vite for fast development compilation and optimal production asset bundling.
  - Implemented client-side route guards (`ProtectedRoute.jsx`) that inspect the authenticated user's role from `AuthContext` to restrict access between student and officer portals.
  - Built a centralized native fetch() API service layer (`api.js`) that automatically attaches the `Authorization: Bearer <token>` header to all outgoing requests.
  - Developed custom responsive CSS design components featuring animated notifications, color-coded recruitment status badges, and dynamic eligibility diagnosis cards.

#### 3. Backend REST Architecture & Business Logic Focus (Java Spring Boot 3.4.3)
- **Key Files:** `server-java/src/main/java/com/placement/portal/controller/`, `service/`, `dto/`, `exception/GlobalExceptionHandler.java`
- **Key Talking Points:**
  - Implemented an enterprise layered architecture strictly separating concerns between REST controllers, business services, DTOs, and Spring Data JPA repositories.
  - Created standardized API contracts wrapped in a generic `ApiResponse<T>` envelope for predictable client-side consumption.
  - Implemented centralized exception handling using `@RestControllerAdvice` to translate domain exceptions (`ResourceNotFoundException`, `IneligibleApplicationException`) into clean, structured HTTP status responses.
  - Handled transactional boundaries using `@Transactional` to guarantee atomic multi-table updates across drives, applications, and audit timelines.

#### 4. Security, Identity & Resume Isolation Focus (Spring Security 6 + JWT)
- **Key Files:** `server-java/src/main/java/com/placement/portal/security/SecurityConfig.java`, `JwtTokenProvider.java`, `JwtAuthenticationFilter.java`, `CustomUserDetailsService.java`, `UserPrincipal.java`
- **Key Talking Points:**
  - Configured stateless session management (`SessionCreationPolicy.STATELESS`) eliminating server-side session memory overhead.
  - Built `JwtAuthenticationFilter` to validate HMAC-SHA token signatures on each HTTP request, populate the `SecurityContextHolder`, and map user roles into `GrantedAuthority` objects.
  - Secured endpoints using `@PreAuthorize("hasRole('STUDENT')")` and `@PreAuthorize("hasRole('OFFICER')")`.
  - Implemented BCrypt password encryption with random salt generation.
  - Enforced strict resume ownership authorization: verified that cross-student resume access attempts are rejected with `HTTP 403 Forbidden` while allowing placement officers authorized access to candidate resumes for associated drives.

#### 5. Automated Eligibility Engine & Recruitment Workflow Focus
- **Key Files:** `server-java/src/main/java/com/placement/portal/service/PlacementDriveService.java`, `ApplicationService.java`, `entity/Application.java`, `entity/ApplicationTimeline.java`
- **Key Talking Points:**
  - Built the Automated Eligibility Engine that dynamically compares student CGPA, department branch, active backlogs, and graduation year against drive thresholds in real time.
  - Implemented dual-layer duplicate application prevention combining a service-layer check with a database-level composite unique constraint `(drive_id, student_id)`.
  - Designed the recruitment stage transition pipeline (`APPLIED` → `SHORTLISTED` → `TECH_ROUND` → `INTERVIEW` → `SELECTED`/`REJECTED`) with timestamped timeline tracking and student self-withdrawal capabilities.

#### 6. Database Architecture & JPA Collection Reconciliation Focus (MySQL 8.0)
- **Key Files:** `server-java/src/main/java/com/placement/portal/entity/`, `repository/`, `service/PlacementDriveService.java`
- **Key Talking Points:**
  - Designed a 3NF normalized relational database (`placement_portal_java`) in MySQL 8.0 with explicit foreign keys and composite unique constraints (`uk_drive_branch`, `uk_drive_skill`).
  - **Critical Technical Challenge Solved:** Diagnosed and resolved the `uk_drive_branch` unique constraint violation during placement drive updates. Replaced destructive `.clear()` re-instantiation with in-place collection reconciliation (`removeIf`, retain matching, append new), eliminating Hibernate `ActionQueue` insert-before-delete collisions.
  - Completed the historical migration from MongoDB to MySQL 8.0, mapping document structures to relational tables and ensuring 100% data parity.

#### 7. Testing, Verification & Production Readiness Focus
- **Key Files:** `server-java/src/test/java/com/placement/portal/`, `client/`
- **Key Talking Points:**
  - Maintained and verified a comprehensive automated test suite of **127 tests** in Spring Boot with **127 passed, 0 failures, 0 errors, 0 skipped (`BUILD SUCCESS`)**.
  - Verified the Vite production build (`npm run build`) with zero compilation errors.
  - Validated database relational integrity and in-place child reconciliation with dedicated database integration tests (`PlacementDriveDatabaseIntegrationTest`).
  - Successfully resolved the Officer Analytics bug by ensuring the DTO is properly populated with calculated drive analytics.
