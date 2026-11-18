# STUDENT PLACEMENT MANAGEMENT PORTAL
## System Architecture & Data Flow Specification
> **B.Tech CSE Mini Project** — Enterprise Full-Stack Web Application

This document provides a comprehensive technical specification of the system architecture, component layers, data access patterns, security models, and end-to-end data flows for the Student Placement Management Portal.

---

### 1. High-Level System Architecture

The application implements a decoupled, three-tier client-server architecture:

```
+-------------------------------------------------------------+
|               Client Layer (React.js + Vite)                |
|  - Single Page Application (SPA) running on Port 3000       |
|  - Role-Based Protected Routing (React Router v6)           |
|  - AuthContext & NotificationContext State Management       |
|  - Centralized native fetch() Client with JWT Attachment    |
|  - Responsive Vanilla CSS Design System                     |
+-------------------------------------------------------------+
                               |
                               | HTTP / REST API (JSON)
                               | Authorization: Bearer <JWT>
                               v
+-------------------------------------------------------------+
|          Backend API Layer (Java Spring Boot 3.4.3)         |
|  - Standalone Spring Boot Application running on Port 5000  |
|  - Java Runtime: JDK 26.0.2                                 |
|  - Spring Security 6 Stateless JWT Filter Chain             |
|  - REST Controllers (@RestController)                       |
|  - Service Layer & Dynamic Eligibility Engine (@Service)    |
|  - Spring Data JPA & Hibernate ORM (@Repository)            |
|  - Centralized Exception Handling (@RestControllerAdvice)   |
+-------------------------------------------------------------+
                               |
                               | JDBC / SQL via Hibernate ORM
                               | Connection Pooling (HikariCP)
                               v
+-------------------------------------------------------------+
|             Database Layer (MySQL 8.0 Relational)           |
|  - Database Name: placement_portal_java (Port 3306)         |
|  - Normalized Relational Tables with Foreign Key Cascades   |
|  - Unique Composite Constraints (uk_drive_branch, etc.)     |
|  - Transactional ACID Guarantees & Referential Integrity    |
+-------------------------------------------------------------+
```

#### Core Architecture Flow:
```
React/Vite Frontend (Port 3000)
        |
        | HTTP/REST API (JSON)
        v
Spring Boot Backend (Port 5000)
        |
        | JPA/Hibernate (JDBC)
        v
MySQL 8.0 (`placement_portal_java`, Port 3306)
```

---

### 2. Project Directory Structure & Component Roles

The workspace maintains a clear separation between active runtime components, historical tools, and academic documentation:

| Directory | Role in Project | Status |
|---|---|---|
| **`client/`** | Active React 18 + Vite frontend Single Page Application (Port 3000) | **Active Runtime** |
| **`server-java/`** | Active Java Spring Boot 3.4.3 backend REST API service (Port 5000) | **Active Runtime** |
| **`database-notes/`** | Schema definitions, user privileges, migration validation, and verification notes | Reference / Setup |
| **`migration-tools/`** | Python/Node migration scripts and reconciliation verification tooling | Tooling / Audit |
| **`docs/`** | Project report (`PROJECT_REPORT.md`), viva question bank, and architectural specifications | Documentation |
| **`storage/`** | Decoupled document storage directory (`storage/resumes/`) for candidate PDF resume files | **Active Storage** |
| **`server/`** | Legacy Node.js/Express backend preserved strictly for historical/rollback archive | **Inactive Archive** |

---

### 3. Backend Architecture Layers (`server-java`)

The backend is organized into standard enterprise Spring Boot layers to enforce separation of concerns:

```
[ HTTP Request: Authorization: Bearer <JWT> ]
                     |
                     v
+-------------------------------------------------------------+
| 1. Security & Filter Layer                                  |
|    - JwtAuthenticationFilter: Validates token signature/exp |
|    - SecurityConfig: Configures CSRF, CORS, session policy  |
|    - CustomUserDetailsService: Loads user credentials        |
|    - UserPrincipal: Wraps user details & granted roles      |
+-------------------------------------------------------------+
                     |
                     v
+-------------------------------------------------------------+
| 2. Controller Layer (com.placement.portal.controller)       |
|    - AuthController: Login, registration, profile, resume   |
|    - StudentController: Academic profile & student rosters  |
|    - CompanyController: Company CRUD operations             |
|    - PlacementDriveController: Drive scheduling & criteria  |
|    - ApplicationController: Applications, stages, stats    |
|    - NotificationController: In-app student alerts         |
|    - AiController: Resume parsing and skill suggestions     |
|    - HealthController: Backend readiness probe              |
+-------------------------------------------------------------+
                     |
                     v
+-------------------------------------------------------------+
| 3. Service Layer (com.placement.portal.service)             |
|    - UserService: Authentication, password hashing, profile |
|    - StudentService: Academic statistics & student details  |
|    - PlacementDriveService: Eligibility & in-place child sync|
|    - ApplicationService: Stage transitions & timelines      |
|    - NotificationService: Event-driven student alerts       |
|    - ResumeStorageService: Secure filesystem storage (PDF)  |
|    - ResumeParserService: Resume text extraction & parsing  |
+-------------------------------------------------------------+
                     |
                     v
+-------------------------------------------------------------+
| 4. Data Access Layer (com.placement.portal.repository)      |
|    - Spring Data JPA Interfaces: UserRepository,            |
|      PlacementDriveRepository, ApplicationRepository, etc.  |
|    - Custom JPQL queries & derived query methods            |
+-------------------------------------------------------------+
                     |
                     v
+-------------------------------------------------------------+
| 5. Entity & Persistence Layer (com.placement.portal.entity) |
|    - Hibernate ORM mapped entities                          |
|    - Relational constraints, lazy fetching, cascading       |
+-------------------------------------------------------------+
                     |
                     v
[ MySQL Database: placement_portal_java ]
```

#### Layer Responsibilities:
1. **Controllers (`controller/`):** Expose versioned REST endpoints, deserialize incoming JSON into DTOs, execute `@Valid` validation, and return standardized `ApiResponse<T>` wrappers.
2. **Services (`service/`):** Encapsulate business logic, drive eligibility rules, resume ownership checks, and orchestrate atomic transactions with `@Transactional`.
3. **Repositories (`repository/`):** Extend `JpaRepository<T, ID>` providing type-safe CRUD operations, pagination, and transactional queries.
4. **Entities (`entity/`):** Represent relational tables in MySQL (`User`, `StudentSkill`, `Company`, `PlacementDrive`, `DriveAllowedBranch`, `DriveRequiredSkill`, `Application`, `ApplicationTimeline`, `Notification`, etc.).
5. **DTOs (`dto/`):** Strongly typed Data Transfer Objects decoupling internal database entities from external API contracts.
6. **Exception Handling (`exception/`):** `@RestControllerAdvice` (`GlobalExceptionHandler`) intercepts exceptions (`ResourceNotFoundException`, `IneligibleApplicationException`, `MethodArgumentNotValidException`) and maps them to HTTP status codes with structured JSON error messages.
7. **Utilities (`util/`):** Helper classes including `SkillMatcherUtil` for skill tokenization and `ValidationUtil`.

---

### 4. Authentication & Role-Based Authorization Flow

The portal employs stateless JSON Web Token (JWT) authentication and role-based access control (RBAC):

```
User (Student/Officer)               Spring Boot Backend               MySQL Database
        |                                     |                               |
   1.   |--- POST /api/auth/login ----------->|                               |
        |    { email, password }              |--- Query User by Email ------>|
        |                                     |<-- Return User Entity --------|
        |                                     |                               |
        |                                     |-- BCrypt.matches()            |
        |                                     |-- Generate Signed JWT Token   |
   2.   |<-- Return JWT + UserProfile --------|                               |
        |    (Stores token in localStorage)   |                               |
        |                                     |                               |
        |                                     |                               |
   3.   |--- GET /api/drives (Protected) ---->|                               |
        |    Headers: Authorization: Bearer <token>                           |
        |                                     |-- JwtAuthenticationFilter:    |
        |                                     |   1. Parse Bearer header      |
        |                                     |   2. Validate token signature |
        |                                     |   3. Extract userId & role    |
        |                                     |   4. Set SecurityContext      |
        |                                     |                               |
        |                                     |-- @PreAuthorize Check         |
        |                                     |   (Verifies ROLE_STUDENT or   |
        |                                     |    ROLE_OFFICER authority)    |
        |                                     |                               |
        |                                     |--- Query Drive Entities ----->|
        |                                     |<-- Return Drive Data ---------|
   4.   |<-- Return 200 OK + Drive DTOs ------|                               |
```

#### Security Highlights:
- **Stateless Sessions:** `SessionCreationPolicy.STATELESS` ensures no server-side HTTP session state is retained.
- **Role Hierarchy:** Roles (`ROLE_STUDENT`, `ROLE_OFFICER`) are mapped to `GrantedAuthority` collections.
- **Unauthorized Handling:**
  - `JwtAuthenticationEntryPoint` responds with `401 Unauthorized` for missing or invalid tokens.
  - `JwtAccessDeniedHandler` responds with `403 Forbidden` when an authenticated user attempts to access endpoints reserved for another role.

---

### 5. Resume Management & Ownership Authorization Flow

Resume file access enforces strict authorization barriers to protect student privacy:

```
[ Client Request: GET /api/auth/resume-download/{studentId} ]
                           |
                           v
          [ JwtAuthenticationFilter: Authenticate User ]
                           |
                           v
        +--------------------------------------+
        | Is Requester Role == ROLE_OFFICER?   |
        +--------------------------------------+
           /                                \
     [YES]/                                  \[NO (Student)]
         v                                    v
+---------------------------------+   +---------------------------------+
| Has student applied to an       |   | Does Requester ID match         |
| active/accessible drive?        |   | target studentId?               |
+---------------------------------+   +---------------------------------+
     /                       \             /                       \
[YES]                         [NO]    [YES]                         [NO (Cross-Student)]
  |                             |       |                             |
  v                             v       v                             v
[Stream PDF]           [403 Forbidden] [Stream PDF]           [403 Forbidden]
```

- **Student Self-Access:** A student may download or preview only their own resume (`/api/auth/resume` or `/api/auth/resume-download/{ownId}`).
- **Cross-Student Isolation:** If Student A attempts to access `/api/auth/resume-download/{studentB_id}`, the service detects the identity mismatch and immediately returns `403 Forbidden`.
- **Officer Access:** Placement Officers can access candidate resumes exclusively for students who have submitted applications to placement drives.
- **Physical Storage:** Resumes are stored on the local filesystem via `ResumeStorageService` with unique UUID-prefixed file names, preventing directory traversal and filename collisions.

---

### 6. Core Business Logic & Data Flow

#### A. Automated Drive Eligibility Engine & Application Flow
```
Student Views Placement Drive
              |
              v
Backend reads Drive Eligibility Requirements:
  - minCgpa (Double)
  - allowedBranches (Set<String>)
  - maxBacklogs (Integer)
  - passingYear (Integer)
              |
              v
Backend compares Student Profile attributes:
  - Student CGPA >= drive.minCgpa ?
  - Student Branch IN drive.allowedBranches ?
  - Student Backlogs <= drive.maxBacklogs ?
  - Student PassingYear == drive.passingYear ?
              |
       +------+------+
       |             |
 [YES: Eligible]  [NO: Ineligible]
       |             |
 Returns Drive with  Returns Drive with
 `isEligible: true`  `isEligible: false` & detailed failure reasons
       |
 Student Clicks "Apply"
       |
       v
 Backend checks for Duplicate:
 ApplicationRepository.findByDriveIdAndStudentId(driveId, studentId)
       |
       +---- Already Exists: Reject (400 "Already applied")
       |
       +---- Does Not Exist:
             1. Create Application { status: APPLIED }
             2. Insert initial ApplicationTimeline record
             3. Generate Notification for student
             4. Commit Transaction
```

#### B. Placement Drive Collection Reconciliation (Duplicate Key Protection)
When updating a placement drive (e.g. changing commencement dates or editing branch checklists), Hibernate collection updates are managed via in-place reconciliation rather than destructive `.clear()` operations:
- Existing child entities in `drive_allowed_branches` matching the update payload are retained.
- Obsolete branches are removed using `removeIf`.
- Newly added branches are instantiated and appended.
- This prevents `Duplicate entry for key 'drive_allowed_branches.uk_drive_branch'` errors caused by Hibernate's insert-before-delete `ActionQueue` execution order.

---

### 7. REST API Endpoint Specification

The backend exposes RESTful endpoints mapped under `/api`:

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| **POST** | `/api/auth/register` | Public | Register new student account and academic profile |
| **POST** | `/api/auth/login` | Public | Authenticate user and return signed JWT token |
| **GET** | `/api/auth/me` | Authenticated | Retrieve authenticated user profile and roles |
| **PUT** | `/api/auth/profile` | Authenticated | Update user profile, skills, and academic details |
| **POST** | `/api/auth/resume-upload` | `ROLE_STUDENT` | Upload resume PDF file (Multipart) |
| **DELETE**| `/api/auth/resume` | `ROLE_STUDENT` | Remove uploaded resume file and reference |
| **GET** | `/api/auth/resume` | `ROLE_STUDENT` | Download authenticated student's own resume PDF |
| **GET** | `/api/auth/resume-download/{id}` | Officer / Owner | Download student resume (enforces ownership authorization) |
| **POST** | `/api/ai/parse-resume` | `ROLE_STUDENT` | Parse uploaded resume PDF and extract skill suggestions |
| **GET** | `/api/companies` | Authenticated | List all registered hiring companies |
| **POST** | `/api/companies` | `ROLE_OFFICER` | Register a new recruiting company |
| **PUT** | `/api/companies/{id}` | `ROLE_OFFICER` | Update company information |
| **DELETE**| `/api/companies/{id}` | `ROLE_OFFICER` | Delete company with relational cascade checks |
| **GET** | `/api/drives` | Authenticated | List placement drives with computed eligibility badges |
| **GET** | `/api/drives/{id}` | Authenticated | Fetch single drive details and eligibility checklist |
| **POST** | `/api/drives` | `ROLE_OFFICER` | Create new placement drive with branch & CGPA rules |
| **PUT** | `/api/drives/{id}` | `ROLE_OFFICER` | Update placement drive details and schedules |
| **DELETE**| `/api/drives/{id}` | `ROLE_OFFICER` | Delete placement drive and associated child records |
| **POST** | `/api/applications/apply/{driveId}` | `ROLE_STUDENT` | Apply for placement drive with duplicate prevention |
| **POST** | `/api/applications/withdraw/{id}` | `ROLE_STUDENT` | Withdraw application prior to drive finalization |
| **GET** | `/api/applications/my-applications`| `ROLE_STUDENT` | View student's submitted applications & timeline |
| **GET** | `/api/applications/drive/{driveId}`| `ROLE_OFFICER` | View all applicant submissions for a drive |
| **PUT** | `/api/applications/{id}/status` | `ROLE_OFFICER` | Update applicant recruitment stage & remarks |
| **GET** | `/api/applications/stats` | Authenticated | Aggregate placement statistics and analytics |
| **GET** | `/api/students` | `ROLE_OFFICER` | Retrieve master student roster with placement statuses |
| **GET** | `/api/notifications` | Authenticated | List in-app notifications for authenticated user |
| **PUT** | `/api/notifications/{id}/read` | Authenticated | Mark a notification as read |
| **GET** | `/api/health` | Public | Backend health and readiness probe |

---

### 8. Database Architecture & Historical Migration

#### A. Active Relational Schema (MySQL 8.0)
The relational database `placement_portal_java` enforces relational consistency:
- **`users`:** Stores authentication credentials, hashed passwords, roles (`STUDENT`, `OFFICER`), and resume storage paths.
- **`student_profiles` / `student_skills`:** Normalized tables holding student academic indicators (CGPA, branch, backlogs, graduation year) and technical skills.
- **`companies`:** Corporate recruiter details and industry domains.
- **`placement_drives`:** Core recruitment drive information (title, salary package CTC, minimum CGPA, maximum backlogs, commencement dates).
- **`drive_allowed_branches`:** Child table with composite unique key `(drive_id, branch)` defining academic eligibility.
- **`drive_required_skills`:** Child table with composite unique key `(drive_id, skill)` defining prerequisite candidate skills.
- **`applications`:** Links students to drives with composite unique key `(drive_id, student_id)` and status enumerations.
- **`application_timelines`:** Audit log tracking timestamped status changes and officer feedback.
- **`notifications`:** In-app notification queue for students.

#### B. Historical Migration Process (MongoDB to MySQL)
During early rapid prototyping, the system utilized a document-oriented MongoDB database. To establish enterprise transactional integrity, strict schema validation, and relational foreign-key consistency suitable for institutional deployment, the project completed a formal migration:
1. **Schema Mapping:** Document collections (`users`, `companies`, `placementdrives`, `applications`) were mapped to 3NF normalized MySQL relational tables.
2. **Data Parity & Reconciliation:** Migration scripts located in `migration-tools/` extracted MongoDB BSON records, transformed ObjectId references into auto-increment integer foreign keys, and validated 100% record parity.
3. **Database Setup Notes:** Detailed SQL initialization scripts, user grant permissions, and verification logs are maintained in `database-notes/`.
4. **Current Status:** MongoDB is completely decommissioned from runtime execution. The legacy Node.js backend in `server/` is archived strictly for historical audit and rollback reference.
