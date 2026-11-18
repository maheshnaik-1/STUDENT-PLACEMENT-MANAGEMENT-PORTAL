# B.TECH COMPUTER SCIENCE & ENGINEERING
## MINI PROJECT REPORT (10 MARKS EVALUATION)

---

# STUDENT PLACEMENT MANAGEMENT PORTAL

**An Enterprise Full-Stack Web Application for Campus Recruitment, Automated Eligibility Matching, and Selection Lifecycle Tracking**

---

### Project Metadata
- **Academic Program:** Bachelor of Technology (B.Tech) in Computer Science & Engineering
- **Course Component:** CSE Mini Project Evaluation
- **Verified Technology Stack:** React + Vite, Java Spring Boot 3.4.3, MySQL 8.0
- **Database Name:** `placement_portal_java`
- **Backend Port:** 5000 | **Frontend Port:** 3000 | **MySQL Port:** 3306

---

## 1. ABSTRACT

The **Student Placement Management Portal** is a centralized, enterprise-grade web application engineered to digitize and automate the end-to-end campus training and recruitment lifecycle in collegiate institutions. Historically, Training and Placement Cells rely on disparate spreadsheets, generic online forms, and physical bulletin boards. These legacy methods suffer from communication latency, registration duplication, security vulnerabilities in resume handling, and frequent human error when verifying academic eligibility thresholds (CGPA cutoffs, eligible branches, backlog limits).

To address these challenges, this project delivers a decoupled, multi-tiered architecture powered by a **React/Vite** frontend and a **Java Spring Boot 3.4.3** backend interacting with a relational **MySQL 8.0** database. The system provides role-based access for two principal stakeholders: **Graduating Students** and **Training & Placement Officers (TPO)**. Key innovations include an **Automated Eligibility Engine** that computes real-time qualification decisions with clear diagnostic feedback, strict duplicate application prevention via database composite keys, in-place JPA collection reconciliation, secure resume storage with cross-student isolation, and stage-by-stage application timeline tracking from submission to final placement.

---

## 2. PROBLEM STATEMENT & OBJECTIVES

### 2.1 Problem Statement
In conventional campus placement setups, the Placement Cell manually evaluates student records against company recruitment parameters. This manual process exhibits significant operational drawbacks:
1. **Error-Prone Eligibility Verification:** Placement officers must manually reconcile student academic records against company criteria, leading to inadvertent shortlisting errors or wrongful disqualifications.
2. **Lack of Transparent Recruitment Tracking:** Students experience an information blackout between application submission and interview rounds, lacking visibility into stage progression (Shortlisted, Technical Round, HR Interview, Selection/Rejection).
3. **Application Duplication & Inconsistent Data:** Without database-enforced unique constraints, students inadvertently submit duplicate entries, skewing applicant tallies.
4. **Insecure Document & Resume Handling:** Public or unsecured resume links expose confidential student contact and academic data to unauthorized access.
5. **Absence of Real-Time Reporting:** Compiling department-wise placement statistics and executive summaries for institutional accreditation requires laborious manual aggregation.

### 2.2 Project Objectives
- Develop a robust, enterprise-grade campus placement portal using **React + Vite** and **Java Spring Boot 3.4.3**.
- Enforce relational data integrity, foreign-key relationships, and ACID compliance using **MySQL 8.0** (`placement_portal_java`).
- Implement stateless, cryptographic authentication and role-based access control (RBAC) via **Spring Security** and **JSON Web Tokens (JWT)**.
- Build an **Automated Eligibility Engine** evaluating CGPA, branch eligibility, maximum backlogs, and graduation year with dynamic feedback badges.
- Provide a candidate selection tracker with timestamped timeline logs and student self-withdrawal capabilities.
- Ensure strict **resume ownership authorization**, preventing cross-student file access.
- Deliver an executive dashboard with live KPI counters, drive management controls, and exportable placement status rosters for placement officers.

---

## 3. PROPOSED SOLUTION

The proposed system replaces manual spreadsheets and legacy ad-hoc systems with an integrated client-server architecture:
- **Client Tier:** A responsive Single Page Application (SPA) built with React 18 and Vite, offering specialized views for students and officers, animated toast notifications, and client-side route protection.
- **Application Tier:** A modular Java Spring Boot REST API structured into Controllers, Services, Repositories, Entities, and DTOs. Business rules, transactional boundaries, and security filters execute within this tier.
- **Data Tier:** A normalized MySQL 8.0 relational schema enforcing referential integrity, cascading updates, and composite unique constraints (`(drive_id, student_id)`, `(drive_id, branch)`, `(drive_id, skill)`).
- **Concurrency & Collection Integrity:** In-place entity reconciliation within JPA transactions prevents duplicate-key violations during placement drive updates.

---

## 4. CURRENT TECHNOLOGY STACK

| Component | Technology | Version / Specification |
|---|---|---|
| **Frontend Framework** | React.js | 18.x (SPA with React Router v6) |
| **Frontend Tooling** | Vite | Modern, high-performance module bundler |
| **Styling & UI** | CSS3 Design System | Responsive layout with CSS variables and custom components |
| **Backend Framework** | Java Spring Boot | 3.4.3 (RESTful API architecture) |
| **Java Runtime** | Java JDK | JDK 26.0.2 |
| **Build & Dependency Tool** | Apache Maven | Maven Wrapper (`mvnw.cmd`) |
| **Security Framework** | Spring Security 6 | Stateless JWT authentication & method-level RBAC |
| **Password Encryption** | BCrypt | PasswordEncoder with cryptographic salt hashing |
| **Database Management** | MySQL Server | 8.0 relational database (`placement_portal_java`) |
| **Data Access / ORM** | Spring Data JPA / Hibernate | 3NF normalized schema with connection pooling (HikariCP) |
| **Network Endpoints** | HTTP / JSON | Frontend: `3000` \| Backend: `5000` \| MySQL: `3306` |

---

## 5. SYSTEM ARCHITECTURE

### 5.1 Architectural Data Flow
The portal operates on a clear three-tier client-server model:

```
React/Vite Frontend (Port 3000)
        |
        | HTTP/REST API (JSON) + Authorization: Bearer <JWT>
        v
Spring Boot Backend (Port 5000)
        |
        | Spring Data JPA / Hibernate (JDBC via HikariCP)
        v
MySQL 8.0 Database (Port 3306)
`placement_portal_java`
```

### 5.2 Layered Backend Organization (`server-java`)
The backend adheres to enterprise Spring Boot layering:
1. **Security & Filter Chain:** `JwtAuthenticationFilter` intercepts requests, validates cryptographic signatures, and constructs `UserPrincipal` objects injected into `SecurityContextHolder`.
2. **Controller Layer (`controller/`):** REST controllers (`AuthController`, `StudentController`, `CompanyController`, `PlacementDriveController`, `ApplicationController`, `NotificationController`, `AiController`, `HealthController`) handle HTTP contracts and validate incoming DTOs (`@Valid`).
3. **Service Layer (`service/`):** Houses business rules (`UserService`, `StudentService`, `PlacementDriveService`, `ApplicationService`, `ResumeStorageService`, `ResumeParserService`, `NotificationService`). Transactions are managed using `@Transactional`.
4. **Repository Layer (`repository/`):** Spring Data JPA repositories extending `JpaRepository` provide type-safe CRUD operations, JPQL queries, and derived query methods.
5. **Entity Layer (`entity/`):** JPA entities mapped to MySQL tables with explicit constraints, foreign keys, and cascading rules.
6. **Data Transfer Object Layer (`dto/`):** Decouples external API payloads from internal persistence entities.
7. **Exception Handling Layer (`exception/`):** Global exception handler (`@RestControllerAdvice`) returns structured `ApiResponse<T>` error payloads with standard HTTP status codes.

### 5.3 Project Structure Overview
- **`client/`:** Active React/Vite frontend application.
- **`server-java/`:** Active Java Spring Boot 3.4.3 backend service.
- **`database-notes/`:** Database schema documentation, SQL setup scripts, and verification logs.
- **`migration-tools/`:** Automated migration tooling used for historic transition from document storage to MySQL.
- **`docs/`:** Comprehensive academic report, architecture specifications, and viva defense materials.
- **`server/`:** Legacy Node.js backend preserved strictly for archival and rollback reference (inactive).

---

## 6. MODULE DESCRIPTION

### 6.1 Authentication & Authorization Module
- **Dual-Role Support:** Supports `STUDENT` and `OFFICER` roles.
- **Registration & Profile Creation:** Student onboarding captures academic branch, CGPA, backlogs, passing year, technical skills, and resume upload.
- **Stateless JWT Flow:** Signed JWT tokens issued upon successful authentication; token validated on each subsequent request via `JwtAuthenticationFilter`.
- **BCrypt Encryption:** Passwords hashed with salted BCrypt before database persistence.

### 6.2 Student Module
- **Student Dashboard:** Real-time summary displaying total available drives, eligible drives, active applications, and current placement status.
- **Drive Directory with Dynamic Eligibility:** Comprehensive listing of active placement drives displaying company details, salary CTC, and automated eligibility badges (*"Eligible"* / *"Ineligible"* with detailed diagnosis).
- **1-Click Application:** Submission mechanism enforcing duplicate prevention and initial stage logging (`APPLIED`).
- **Application Timeline Tracker:** Visual stage-by-stage progression indicator (`APPLIED` → `SHORTLISTED` → `TECH_ROUND` → `INTERVIEW` → `SELECTED` / `REJECTED`) displaying timestamped transitions and officer feedback.
- **Application Withdrawal:** Allows students to retract applications before drive finalization with automatic audit trail recording.
- **Resume Management:** PDF upload, preview, and download with parsed skill extraction.
- **In-App Notification Center:** Real-time alerts for recruitment updates, interview shortlisting, and officer remarks.

### 6.3 Placement Officer Module
- **Executive KPI Dashboard:** Real-time statistical metrics tracking total registered students, verified companies, active drives, total applications, and selected candidates.
- **Company Management Console:** Full CRUD functionality for partner corporate recruiters.
- **Placement Drive Management:** Scheduling interface enabling officers to configure job roles, CTC packages, application deadlines, commencement dates, minimum CGPA, allowed branch checklists, and maximum backlog allowances.
- **Applicant Evaluation Console:** Centralized console listing applicants per drive, displaying academic profiles, granting authorized resume access, and enabling stage transitions with custom officer remarks.
- **Placement Analytics & Reporting:** Real-time analytics displaying branch-wise placement distribution, drive performance metrics, and printable master placement rosters.

---

## 7. ELIGIBILITY, APPLICATION & TRACKING WORKFLOW

### 7.1 Automated Eligibility Engine
When a student browses placement drives, the backend dynamically calculates eligibility by evaluating student profile attributes against drive parameters:

$$\text{Eligible} \iff (\text{CGPA} \ge \text{minCGPA}) \land (\text{Branch} \in \text{AllowedBranches}) \land (\text{Backlogs} \le \text{maxBacklogs}) \land (\text{Year} = \text{PassingYear})$$

If any condition fails, the engine sets `isEligible = false` and appends clear diagnostics:
- *"CGPA requirement not met (Yours: 7.10, Required: 7.50)"*
- *"Branch 'MECH' is not eligible for this drive (Allowed: CSE, IT, AI&DS)"*
- *"Active backlogs (2) exceeds maximum permissible limit (0)"*

### 7.2 Application Processing & Duplicate Prevention
1. The student clicks **Apply** on an eligible drive.
2. The service verifies eligibility server-side to prevent client-side bypass.
3. The system checks `ApplicationRepository.findByDriveIdAndStudentId(driveId, studentId)`.
4. If an application exists, the request is rejected with `HTTP 400 Bad Request`.
5. If valid, an `Application` entity is persisted, an initial `ApplicationTimeline` entry is logged, a student notification is queued, and the transaction commits atomically.

### 7.3 Recruitment Lifecycle Progression
The selection workflow follows a progressive state model:
$$\text{APPLIED} \longrightarrow \text{SHORTLISTED} \longrightarrow \text{TECH\_ROUND} \longrightarrow \text{INTERVIEW} \longrightarrow \begin{cases} \text{SELECTED} \\ \text{REJECTED} \end{cases}$$

Placement Officers advance candidate stages through the evaluation console. Each transition creates a timestamped record in `application_timelines`, ensuring full auditability.

---

## 8. SECURITY & AUTHORIZATION ARCHITECTURE

### 8.1 Role-Based Access Control (RBAC)
Endpoints are protected using Spring Security method-level security:
- `@PreAuthorize("hasRole('STUDENT')")`: Restricted to authenticated student users (e.g. drive application, profile updates, personal applications).
- `@PreAuthorize("hasRole('OFFICER')")`: Restricted to placement officers (e.g. drive creation, company management, stage updates, analytics).
- Unauthorized requests trigger `JwtAuthenticationEntryPoint` (401) or `JwtAccessDeniedHandler` (403).

### 8.2 Resume Upload & Ownership Security
Student resumes represent sensitive personal information requiring strict authorization guards:
1. **Upload & Storage:** Resumes are uploaded as multipart PDF files and stored via `ResumeStorageService` on the local server filesystem using UUID-prefixed filenames to prevent directory traversal and name collisions.
2. **Strict Ownership Enforcement:**
   - **Student Access:** A student can only view, download, or delete their own resume.
   - **Cross-Student Access Blocked:** If Student A attempts to access `/api/auth/resume-download/{studentB_id}`, the backend detects the mismatch between `principal.getId()` and the target `studentId`, rejecting the request with `HTTP 403 Forbidden`.
   - **Officer Access:** Placement Officers are granted access to download candidate resumes only for students who have submitted applications to drives.
3. **Automated Skill Parsing:** Authenticated students can invoke `POST /api/ai/parse-resume` to extract key technical skills from their uploaded resume, assisting in profile completion.

---

## 9. DATABASE DESIGN & RELATIONAL DATA INTEGRITY

### 9.1 Relational Schema (`placement_portal_java`)
The database is structured into normalized tables adhering to Third Normal Form (3NF):
- **`users`:** Stores authentication credentials, hashed passwords, roles (`STUDENT`, `OFFICER`), and resume file metadata.
- **`student_profiles` & `student_skills`:** Normalized entities storing academic indicators (CGPA, branch, active backlogs, graduation year) and technical skill tags.
- **`companies`:** Recruiter profiles, industry domains, contact details, and headquarters locations.
- **`placement_drives`:** Core hiring drive records (job title, package CTC, eligibility criteria, commencement date, deadline, status).
- **`drive_allowed_branches`:** Child table with composite unique constraint `uk_drive_branch` (`drive_id`, `branch`).
- **`drive_required_skills`:** Child table with composite unique constraint `uk_drive_skill` (`drive_id`, `skill`).
- **`applications`:** Associates students with drives with unique composite constraint `(drive_id, student_id)`.
- **`application_timelines`:** Audit log capturing status changes, timestamps, and officer remarks.
- **`notifications`:** In-app notification queue.

### 9.2 In-Place Collection Reconciliation
During placement drive updates (e.g. modifying commencement dates or updating eligible branches), Hibernate's default behavior of clearing and re-inserting child collections can trigger `Duplicate entry for key 'drive_allowed_branches.uk_drive_branch'` because Hibernate schedules inserts before orphan deletions.

The service resolves this using **in-place collection reconciliation**:
- Existing child entities matching incoming payload items are retained.
- Obsolete child entities are removed using `removeIf`.
- Newly added items are instantiated and appended.
- This guarantees safe updates under strict relational constraints without requiring temporary constraint deactivation.

### 9.3 Historical Migration Context
The project initially used MongoDB during early exploratory prototyping. To enforce transactional integrity, strict relational foreign-key consistency, and compliance with institutional software engineering standards, the database was fully migrated to **MySQL 8.0**:
- Automated migration tooling (`migration-tools/`) migrated all records with 100% data parity.
- Database documentation and SQL setup scripts are preserved in `database-notes/`.
- MongoDB has been completely retired from the active application runtime.

---

## 10. TESTING AND VALIDATION

The system underwent comprehensive automated unit, integration, and end-to-end testing:

### 10.1 Automated Test Execution Summary
- **Backend Test Suite (Maven):**
  - **Total Tests Executed:** 127
  - **Passed:** 127
  - **Failures:** 0
  - **Errors:** 0
  - **Skipped:** 0
  - **Result:** `BUILD SUCCESS`
- **Frontend Production Build (Vite):**
  - Executed `npm run build` in `client/`.
  - Zero syntax errors, zero bundling warnings, clean production bundle emitted.

### 10.2 Targeted Verification Scenarios

| Test Category | Test Case / Scenario | Verification Method | Result |
|---|---|---|---|
| **Authentication** | Student & Officer login with valid credentials | MockMvc & Controller Tests | **PASS** (JWT issued) |
| **Authentication** | Access protected endpoints without Bearer token | MockMvc security filter test | **PASS** (401 Unauthorized) |
| **Authorization** | Student attempting officer-only drive creation | Security filter chain check | **PASS** (403 Forbidden) |
| **Eligibility Engine** | Ineligible student (CGPA below threshold) applies | `IneligibleApplicationException` check | **PASS** (Rejected with reasons) |
| **Duplicate Prevention** | Student submitting duplicate drive application | `ApplicationRepository` duplicate test | **PASS** (Rejected with 400) |
| **Drive Update Defect** | Updating drive commencement date with existing branches | `PlacementDriveDatabaseIntegrationTest` | **PASS** (No duplicate key error) |
| **Resume Security** | Cross-student resume download attempt | `StudentSecurityIntegrationTest` | **PASS** (403 Forbidden) |
| **Application Lifecycle**| Stage advancement (`APPLIED` → `SELECTED`) | `ApplicationServiceTest` | **PASS** (Timeline logged) |
| **Self-Withdrawal** | Student withdraws application before deadline | Integration test & browser verification | **PASS** (Status updated) |

---

## 11. RESULTS AND ADVANTAGES

### 11.1 Project Outcomes
- **Operational Efficiency:** Automated eligibility matching eliminates manual spreadsheet filtering by placement staff.
- **Data Parity & Reliability:** Relational schema enforcement in MySQL ensures zero duplicate applications or orphan records.
- **Transparency for Students:** Instant visual eligibility feedback and real-time timeline tracking provide complete visibility into hiring stages.
- **Information Security:** Strong cryptographic authentication and resume access control safeguard confidential student data.

### 11.2 Key Advantages
1. **Architectural Decoupling:** Independent React frontend and Spring Boot REST backend allow modular scaling and maintenance.
2. **ACID Transactional Guarantees:** Relational database operations ensure atomic multi-table updates across drives, applications, and timelines.
3. **Enterprise Security Model:** Role-based access control enforced at both HTTP filter and service method levels.
4. **Institutional Readiness:** Clean, reproducible build pipelines with 127 automated tests and comprehensive documentation.

---

## 12. LIMITATIONS & FUTURE ENHANCEMENTS

### 12.1 Current Limitations
1. **Local File Storage:** Resumes are currently stored on the application server filesystem rather than a distributed cloud object store.
2. **Synchronous Notifications:** Notifications are stored in-app; external delivery channels (SMS/Email) require external gateway integration.

### 12.2 Future Enhancements
1. **Cloud Object Storage (AWS S3):** Transition resume storage to secure cloud bucket storage with pre-signed URLs.
2. **Automated Email / WhatsApp Alerts:** Integration with communication gateways (e.g., SendGrid, Twilio) for automated status notifications.
3. **Online Assessment Module:** Incorporating an in-portal technical screening and aptitude test engine.

---

## 13. CONCLUSION

The **Student Placement Management Portal** successfully satisfies all requirements of a comprehensive B.Tech Computer Science & Engineering Mini Project. By integrating **React + Vite**, **Java Spring Boot 3.4.3**, and **MySQL 8.0**, the portal transforms the traditional, fragmented placement process into a streamlined, automated, and secure digital platform. With an automated eligibility engine, robust role-based access control, secure resume management, and 100% test suite verification across 127 automated tests, the application stands fully prepared for deployment and academic evaluation.

---

## 14. REFERENCES

1. **Spring Framework Documentation:** *Spring Boot Reference Guide (v3.4.3)*, VMware Tanzu. https://docs.spring.io/spring-boot/
2. **React Documentation:** *React 18 — The Library for Web and Native User Interfaces*, Meta Open Source. https://react.dev/
3. **MySQL 8.0 Reference Manual:** *Relational Database Architecture and Constraint Enforcement*, Oracle Corporation. https://dev.mysql.com/doc/refman/8.0/en/
4. **RFC 7519:** *JSON Web Token (JWT) Specification*, Internet Engineering Task Force (IETF). https://datatracker.ietf.org/doc/html/rfc7519
5. **Hibernate ORM Documentation:** *Hibernate ORM 6.x User Guide*, Red Hat. https://hibernate.org/orm/documentation/

---
*Report submitted in partial fulfillment of the requirements for the award of Bachelor of Technology (B.Tech) in Computer Science & Engineering.*
