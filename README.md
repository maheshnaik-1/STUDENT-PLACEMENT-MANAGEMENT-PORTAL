# Student Placement Management Portal
> **B.Tech CSE Mini Project** — Enterprise Full-Stack Web Application

A robust, enterprise-grade college placement management system connecting students and Training & Placement Officers (TPO) with automated eligibility matching, role-based dashboards, secure resume lifecycle management, real-time application tracking, and comprehensive recruitment analytics.

---

## 1. Project Overview

The **Student Placement Management Portal** is developed as a B.Tech Computer Science & Engineering Mini Project. The system bridges the communication and workflow gap between graduating students and the college Placement Cell.

Key capabilities include:
- **Automated Eligibility Engine:** Dynamically evaluates student eligibility against company criteria (CGPA thresholds, allowed academic branches, and maximum backlogs) with immediate status feedback.
- **Placement Drive Management:** Enables placement officers to publish and update hiring drives, define job requirements, track applicant pipelines, and manage company records.
- **Application Tracking & Timeline:** Full lifecycle visibility (`APPLIED` → `SHORTLISTED` → `TECH_ROUND` → `INTERVIEW` → `SELECTED` / `REJECTED`) with audit timeline logs and student withdrawal support.
- **Secure Document Management:** Isolated resume upload, PDF preview, ownership-validated downloads, and parsing integration.
- **Executive Analytics:** Live KPI metrics, drive performance metrics, branch-wise placement statistics, and printable status reports.

---

## 2. Current Technology Stack

| Layer | Technology | Details / Version |
|---|---|---|
| **Frontend** | React 18 + Vite | Modern Single-Page Application (SPA) with responsive design system |
| **Backend** | Java Spring Boot | Spring Boot 3.4.3 REST API with layered architecture |
| **Runtime** | Java JDK | Java 26.0.2 (modern LTS-compatible Java runtime) |
| **Database** | MySQL | MySQL 8.0 relational database (`placement_portal_java`) |
| **ORM / Data Access** | Spring Data JPA | Hibernate ORM with MySQL Connector/J |
| **Security & Auth** | Spring Security 6 | Stateless JWT (JSON Web Tokens) & BCrypt password hashing |
| **Build Tools** | Maven Wrapper & npm | `mvnw.cmd` (Backend) and npm/Vite (Frontend) |
| **Ports** | Frontend: `3000` | Backend: `5000` \| MySQL: `3306` |

---

## 3. Architecture / Components

The system follows a decoupled client-server architecture with strict separation of concerns:

- **`client/` (Active Frontend):**
  - Built with React and Vite.
  - Context-driven state management (`AuthContext`, `NotificationContext`).
  - Centralized native fetch()-based API client with automatic JWT token attachment and request wrappers.
  - Role-protected routes separating Student and Placement Officer portals.

- **`server-java/` (Active Backend):**
  - Built with Java Spring Boot 3.4.3.
  - Layered architecture: Controllers (`@RestController`), Services (`@Service`), Repositories (`JpaRepository`), and Entities (`@Entity`).
  - Stateless authentication filter (`JwtAuthenticationFilter`) validating incoming Bearer tokens.
  - Method-level security annotations (`@PreAuthorize("hasRole('STUDENT')")`, `@PreAuthorize("hasRole('OFFICER')")`).
  - Global exception handling (`@RestControllerAdvice`) delivering consistent JSON error responses.

- **`MySQL Database` (`placement_portal_java`):**
  - Normalized relational schema enforcing referential integrity via foreign keys and composite constraints.
  - Core entities: `users`, `student_profiles`, `companies`, `placement_drives`, `drive_allowed_branches`, `drive_required_skills`, `applications`, `application_timelines`, `resumes`, and `notifications`.

- **`server/` (Legacy Backend):**
  - Preserved strictly for historical reference and rollback archive purposes. Inactive in current production.

- **`migration-tools/` & `database-notes/`:**
  - Automated migration scripts, reconciliation checkers, and schema documentation validating database consistency.

---

## 4. Quick Start

### Step 1: Verify MySQL 8.0 Service
Ensure the local MySQL 8.0 server is running:

```powershell
# Open PowerShell and check service status:
Get-Service MySQL80

# If stopped, start the service (Run as Administrator):
Start-Service MySQL80
```
*(Ensure your MySQL instance is active on port `3306` and database `placement_portal_java` is present.)*

---

### Step 2: Start the Java Spring Boot Backend
Open **Terminal 1** and navigate to the backend directory:

```powershell
cd "D:\Student Placement Management Portal\server-java"

# Set required environment variables for the session:
$env:JWT_SECRET = "<your_jwt_secret>"
$env:PLACEMENT_APP_PASSWORD = "<your_mysql_password>"

# Start the Spring Boot application:
.\mvnw.cmd spring-boot:run
```
- **Backend API Port:** `5000`
- **Keep Terminal 1 open** while running the portal.

> **Port Collision Tip:** If you see `Address already in use: bind` on port 5000, check whether another Spring Boot instance is already running before launching a new process.

---

### Step 3: Start the React Frontend
Open **Terminal 2** and navigate to the frontend directory:

```powershell
cd "D:\Student Placement Management Portal\client"

# Start Vite development server:
npm run dev
```
- **Frontend Port:** `3000`
- **Frontend URL:** [http://localhost:3000](http://localhost:3000)
- **Keep Terminal 2 open** while using the application.

---

### Step 4: Access the Application
Open your web browser and navigate to:
```
http://localhost:3000/login
```
Log in using your registered account credentials.

---

## 5. Important Runtime Notes

1. **Active Architecture:** The portal runs exclusively on **Java Spring Boot 3.4.3 + MySQL 8.0 + React/Vite**.
2. **Do NOT start MongoDB:** MongoDB is not utilized by the current application runtime.
3. **Do NOT run the legacy backend:** Do not execute `npm start` in `server/`.
4. **Do NOT run seed scripts:** Do not run `npm run seed` or drop/recreate database tables. Existing students, placement drives, company data, and application histories are preserved in MySQL.
5. **Environment Security:** Never commit or hardcode actual database passwords or JWT secret keys. Provide them via terminal environment variables or secure local profiles.
6. **Concurrent Terminals:** Both Terminal 1 (Backend) and Terminal 2 (Frontend) must remain open during portal execution.

---

## 6. Main Student Features

- **Profile Management:** Registration and management of academic profile attributes (Degree, Branch, CGPA, Active Backlogs, Passing Year, Technical Skills).
- **Automated Eligibility Engine:** Real-time dynamic eligibility verification against drive requirements:
  - Green / Red status badges displayed on every drive card.
  - Transparent ineligibility diagnosis (e.g. *"Requires minimum CGPA 7.50 (Yours: 7.10)"* or *"Branch MECH not in allowed branches"*).
- **Placement Drive Exploration:** Filter and browse active hiring drives, company profiles, CTC packages, role descriptions, and registration deadlines.
- **Application Submission:** 1-Click application submission with duplicate-application prevention.
- **Application Timeline & Tracking:** Interactive timeline showing stage-by-stage progression (`Applied` → `Shortlisted` → `Tech Round` → `Interview` → `Selected` / `Rejected`).
- **Application Self-Withdrawal:** Ability to withdraw an application before drive finalization with automatic status updates.
- **Resume Management:** Upload resume PDF, view parsed skill suggestions, and securely preview/download uploaded files.
- **In-App Notifications:** Real-time alerts for status updates, interview schedules, and officer remarks.

---

## 7. Main Placement Officer Features

- **Executive KPI Dashboard:** Real-time statistical overview displaying total students, registered companies, active drives, total applications, and selected candidates.
- **Company Management:** Full CRUD operations for recruiting organizations with contact information and website metadata.
- **Placement Drive Lifecycle Management:**
  - Create and update placement drives.
  - Configure multi-branch eligibility (CSE, IT, ECE, AI&DS, MECH, etc.).
  - Specify required skill tags, minimum CGPA, maximum backlogs, salary CTC, and commencement dates.
- **Applicant Evaluation Console:**
  - Browse candidate submissions grouped by placement drive.
  - View full academic profiles, student backlogs, and direct resume links.
  - Advance applicant recruitment stages with custom officer feedback and remarks.
- **Drive Performance Analytics:**
  - Drive-by-drive application and selection metrics.
  - Department-wise placement distribution.
  - Master student placement status reports for institutional reporting.
- **Export Capabilities:** Export filtered applicant rosters and placement summaries.

---

## 8. Security / Authorization Features

- **Stateless JWT Authentication:**
  - Cryptographically signed JWT tokens issued upon login.
  - `JwtAuthenticationFilter` validates token integrity and expiry on every protected endpoint.
- **Role-Based Access Control (RBAC):**
  - Strict role hierarchy separating `ROLE_STUDENT` and `ROLE_OFFICER`.
  - Enforced at controller method level with `@PreAuthorize`.
- **Strict Resume Ownership & Authorization:**
  - Students can only view, download, or delete their own resumes.
  - Placement Officers can access candidate resumes exclusively for students who have applied to placement drives.
  - Cross-student unauthorized resume access attempts are rejected with `HTTP 403 Forbidden`.
- **Decoupled & Configurable Resume Storage:**
  - Resumes are stored in a standalone project-level directory (`storage/resumes/`) decoupled from legacy server directories.
  - Fully configurable for production deployments via the `RESUME_STORAGE_PATH` environment variable (default: `../storage/resumes`).
  - Seamless dual-tier synchronization guarantees existing legacy resume files are preserved and accessible without data loss.
- **Password Protection:**
  - All passwords hashed using BCrypt before database persistence.
- **Database Constraint Integrity:**
  - Database-enforced foreign keys, unique composite indexes (e.g., `(drive_id, branch)`, `(drive_id, skill)`), and orphan removal prevent data corruption.

---

## 9. Database & Migration Notes

- **Migration Background:**
  The project prototype originally used MongoDB. To achieve transactional integrity, strict relational schema constraints, and enterprise standards for academic accreditation, the portal was fully migrated to **MySQL 8.0** (`placement_portal_java`).
- **Data Reconciliation:**
  All user records, company profiles, placement drives, applications, and historical timelines were migrated and verified with 100% data parity.
- **Collection Reconciliation in JPA:**
  Child collections such as `DriveAllowedBranch` and `DriveRequiredSkill` utilize in-place collection reconciliation in `PlacementDriveService` to prevent unique constraint collisions during drive updates.
- **Historical Evidence:**
  The `migration-tools/` and `database-notes/` directories retain full migration scripts, schema definitions, and verification logs for auditability.

---

## 10. Project Structure

```
Student Placement Management Portal/
├── client/                                # React + Vite Frontend (Active)
│   ├── src/
│   │   ├── components/                    # UI Components (Modals, Navbar, Cards)
│   │   ├── context/                       # AuthContext & NotificationContext
│   │   ├── pages/                         # Student & Placement Officer Views
│   │   ├── services/                      # Centralized API service layer
│   │   ├── App.jsx                        # Routing and Route Guards
│   │   └── index.css                      # Modern CSS design system
│   ├── package.json                       # Frontend dependencies & scripts
│   └── vite.config.js                     # Vite build & proxy configuration
│
├── server-java/                           # Java Spring Boot Backend (Active)
│   ├── src/
│   │   ├── main/java/com/placement/portal/
│   │   │   ├── config/                    # SecurityConfig & WebMvc configuration
│   │   │   ├── controller/                # REST Controllers (Auth, Student, Drive, etc.)
│   │   │   ├── dto/                       # Data Transfer Objects
│   │   │   ├── model/                     # JPA Entities (User, Drive, Application, etc.)
│   │   │   ├── repository/                # Spring Data JPA Repositories
│   │   │   ├── security/                  # JwtAuthenticationFilter & TokenProvider
│   │   │   └── service/                   # Business Logic & Eligibility Engine
│   │   └── test/java/com/placement/portal/# Comprehensive Unit & Integration Tests
│   ├── pom.xml                            # Maven project dependencies
│   └── mvnw.cmd                           # Maven wrapper executable
│
├── server/                                # Legacy Node.js Backend (Preserved Archive)
├── migration-tools/                       # MongoDB to MySQL Migration Tooling
├── database-notes/                        # Schema notes, credentials, and verification logs
├── docs/                                  # Project Documentation & Viva Preparation
│   ├── PROJECT_REPORT.md                  # Comprehensive Mini Project Report
│   ├── ARCHITECTURE_AND_DATAFLOW.md       # Architecture Specifications & Data Flow
│   └── VIVA_QUESTIONS_AND_ANSWERS.md      # Comprehensive Viva Question Bank for Defense
├── START_PROJECT.txt                      # Step-by-step project startup reference
└── README.md                              # Main project documentation
```

---

## 11. Documentation & Viva Preparation

All academic evaluation and defense materials are organized in the [`docs/`](file:///d:/Student%20Placement%20Management%20Portal/docs/) directory:

1. **[`docs/PROJECT_REPORT.md`](file:///d:/Student%20Placement%20Management%20Portal/docs/PROJECT_REPORT.md):**
   - Full academic report containing Problem Statement, Literature Survey, System Architecture, Database Design (ER Diagrams), Implementation Details, and Testing Methodologies.
2. **[`docs/ARCHITECTURE_AND_DATAFLOW.md`](file:///d:/Student%20Placement%20Management%20Portal/docs/ARCHITECTURE_AND_DATAFLOW.md):**
   - Architectural diagrams, API endpoint specifications, JWT auth flows, and request lifecycle mapping.
3. **[`docs/VIVA_QUESTIONS_AND_ANSWERS.md`](file:///d:/Student%20Placement%20Management%20Portal/docs/VIVA_QUESTIONS_AND_ANSWERS.md):**
   - Comprehensive viva question bank covering Java Spring Boot, React, MySQL relational design, security/RBAC, and architectural trade-offs.

---

## 12. Testing / Verification Status

The project has undergone rigorous automated testing, static analysis, and end-to-end verification:

- **Spring Boot Backend Test Suite:**
  - **143 Total Tests:** 141 Passed, 0 Failures, 0 Errors, 2 Skipped (`BUILD SUCCESS`).
  - Covers Controller MockMvc tests, Service-layer logic, Security filters, and Database integration.
- **Frontend Production Build:**
  - Successfully verified with Vite (`npm run build`). Clean compilation with zero build errors.
- **Placement Drive Update Defect Resolution:**
  - Resolved `drive_allowed_branches.uk_drive_branch` unique constraint conflict during drive date updates through in-place collection reconciliation in `PlacementDriveService`. Verified via integration regression tests.
- **Resume Security & Ownership Verification:**
  - Verified cross-student resume isolation and authorization rules, ensuring strict adherence to data privacy guidelines.
- **Database & Schema Validation:**
  - Relational schema constraints, foreign key cascades, and transactional integrity confirmed via `PlacementDriveDatabaseIntegrationTest` and live database operations.
