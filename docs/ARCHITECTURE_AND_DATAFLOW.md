# STUDENT PLACEMENT MANAGEMENT PORTAL
## System Architecture & Data Flow Specification

### 1. High-Level System Architecture

```
+-------------------------------------------------------------+
|                      Client Layer (React.js)                 |
|  - React 18 SPA (Vite Bundler)                              |
|  - Role-Based Protected Routing (React Router v6)           |
|  - AuthContext & NotificationContext State Management        |
|  - Responsive Vanilla CSS Design System                     |
+-------------------------------------------------------------+
                              |
                              | HTTP / REST API (JSON)
                              | Authorization: Bearer <JWT>
                              v
+-------------------------------------------------------------+
|                   Backend API Layer (Node.js/Express)        |
|  - Express Server & Routing Engine                          |
|  - Middleware: JWT Token Auth, Role Guards, Error Handlers  |
|  - Controllers: Auth, Companies, Drives, Applications, Stats|
|  - Automated Eligibility Evaluation Engine                   |
+-------------------------------------------------------------+
                              |
                              | Mongoose ODM (Object Data Modeling)
                              | Schema Validations & Query Pipelines
                              v
+-------------------------------------------------------------+
|                    Database Layer (MongoDB)                 |
|  - Collections: Users, Companies, PlacementDrives, Apps     |
|  - Compound Indexes: { drive: 1, student: 1 } (Unique)      |
+-------------------------------------------------------------+
```

---

### 2. Core Data Flow & Business Logic

#### A. Student Drive Eligibility & Application Flow
```
Student Browses Placement Drive
               |
               v
Backend reads Drive Eligibility:
  - minCGPA
  - allowedBranches
  - maxBacklogs
  - passingYear
               |
               v
Backend compares Student Profile:
  - Student CGPA >= minCGPA ?
  - Student Branch IN allowedBranches ?
  - Student Backlogs <= maxBacklogs ?
  - Student Batch == passingYear ?
               |
    +----------+----------+
    |                     |
[YES: Eligible]      [NO: Ineligible]
    |                     |
Returns Drive with        Returns Drive with
`isEligible: true`        `isEligible: false` & detailed reasons
    |
Student clicks Apply
    |
Backend checks Duplicate:
Application.findOne({ drive, student })
    |
    +---- Exists: Reject (400 "Already applied")
    |
    +---- Not exists: Create Application { status: "Applied" }
```

---

### 3. REST API Endpoint Mapping

| Method | Endpoint | Access | Description |
|---|---|---|---|
| **POST** | `/api/auth/register` | Public | Register new student profile with academic stats |
| **POST** | `/api/auth/login` | Public | Authenticate student or placement officer |
| **GET** | `/api/auth/me` | Private | Fetch logged-in user profile |
| **PUT** | `/api/auth/profile` | Private | Update student academic details / officer profile |
| **GET** | `/api/companies` | Public/Auth | List all companies with drive counts |
| **POST** | `/api/companies` | Officer | Register new recruiting company |
| **PUT** | `/api/companies/:id` | Officer | Update company information |
| **DELETE** | `/api/companies/:id` | Officer | Delete company and cascade related drives |
| **GET** | `/api/drives` | Public/Auth | List placement drives with computed student eligibility |
| **GET** | `/api/drives/:id` | Public/Auth | Get full drive details & eligibility checklist |
| **POST** | `/api/drives` | Officer | Create new placement drive with eligibility rules |
| **PUT** | `/api/drives/:id` | Officer | Update placement drive |
| **DELETE** | `/api/drives/:id` | Officer | Delete placement drive & attached applications |
| **POST** | `/api/applications/apply/:driveId` | Student | Apply for placement drive (with duplicate check) |
| **GET** | `/api/applications/my-applications` | Student | View student's personal applications & status |
| **GET** | `/api/applications/drive/:driveId` | Officer | View all applicants for a drive with student profiles |
| **PUT** | `/api/applications/:id/status` | Officer | Update applicant selection stage & feedback remarks |
| **GET** | `/api/applications/stats` | Public/Auth | Aggregate placement analytics & KPI metrics |
| **GET** | `/api/students` | Officer | View master student roster with placement statuses |
