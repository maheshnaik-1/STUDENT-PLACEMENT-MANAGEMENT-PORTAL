# B.TECH COMPUTER SCIENCE & ENGINEERING
## MINI PROJECT REPORT (10 MARKS EVALUATION)

---

# STUDENT PLACEMENT MANAGEMENT PORTAL

**A Complete Full-Stack Web Application for Campus Recruitment, Automated Eligibility Matching, and Selection Lifecycle Tracking**

---

### Project Metadata
- **Academic Program:** Bachelor of Technology (B.Tech) in Computer Science & Engineering
- **Course Component:** CSE Mini Project Evaluation
- **Team Size:** 7 Members
- **Technology Stack:** MongoDB, Express.js, React.js, Node.js (MERN)

---

## 1. ABSTRACT
The **Student Placement Management Portal** is a centralized web application designed to automate and streamline the end-to-end campus placement and training processes in engineering institutions. Traditionally, training and placement cells rely on manual spreadsheets, Google Forms, and physical notice boards, leading to communication delays, duplicate registrations, and human errors in verifying student eligibility criteria (CGPA cutoffs, allowed branches, backlog limits).

This project implements a secure, role-based architecture serving two primary stakeholders: **Graduating Students** and the **Training & Placement Officer (TPO)**. The system features an **Automated Eligibility Engine** that dynamically evaluates student qualifications against company placement drive criteria, provides instant visual feedback, strictly prevents duplicate submissions, and offers real-time status progression tracking from initial application to final offer letter issuance.

---

## 2. PROBLEM STATEMENT & OBJECTIVES

### 2.1 Existing System Drawbacks
1. **Manual Eligibility Verification:** Placement staff manually cross-reference student spreadsheets against company criteria, which is prone to errors.
2. **Lack of Real-Time Tracking:** Students lack visibility into their interview stage progression (Shortlisted, Technical Round, HR Round, Offer).
3. **Redundant & Duplicate Applications:** Without database-level uniqueness constraints, students repeatedly apply for the same drive.
4. **Scattered Company Information:** Details regarding package (CTC), drive dates, and selection rounds are fragmented across emails.

### 2.2 Project Objectives
- Build an automated campus recruitment portal using the **MERN** stack.
- Implement **JWT (JSON Web Token)** authentication and role-based route guards.
- Provide a responsive, modern user interface for students to browse eligible placement drives and track application status.
- Equip the Placement Officer with complete **CRUD** controls over companies, placement drives, applicant review, status progression, and analytics export (CSV / Print).

---

## 3. SYSTEM REQUIREMENTS SPECIFICATION (SRS)

### 3.1 Functional Requirements

#### A. Authentication & Security Module
- **Student Registration:** Captures name, email, roll number, engineering branch, CGPA, active backlogs, passing batch year, technical skills, and resume URL.
- **Role-Based Login:** Separate login flows for Student and Placement Officer with encrypted password verification using `bcryptjs`.
- **Stateless Session Management:** Signed JWT tokens sent via HTTP `Authorization: Bearer` headers.

#### B. Student Module
- **Student Dashboard:** KPI overview showing available drives, drives eligible for the student, active applications, and received offers.
- **Available Drives Directory:** Search and filter drives with dynamic *"✓ Eligible"* and *"✕ Ineligible"* badges detailing exact reasons if not eligible.
- **Placement Drive Details:** Comprehensive job description, CTC package breakdown, selection rounds timeline, and 1-click application submission.
- **My Applications Tracker:** Real-time table displaying application submission date, recruitment stage badge, and officer feedback remarks.
- **Academic Profile Management:** Ability to update CGPA, active backlogs, contact number, skills, and resume portfolio link.

#### C. Placement Officer Module
- **Officer Dashboard:** Executive summary displaying total registered companies, active drives, total applications processed, placed students, and placement rate %.
- **Company Management:** Register new recruiting partners, edit contact HR details, and delete companies with cascading relationship handling.
- **Placement Drive Management:** Post new placement drives with custom eligibility thresholds (min CGPA, allowed branches checklist, maximum backlog ceiling, target batch).
- **Applicant Evaluation Console:** Review all applicants for a specific drive, view full student academic profiles, update recruitment status (Applied → Shortlisted → Technical Round → Interview → Selected → Rejected), add customized remarks, and export candidate rosters to CSV.
- **Placement Reports & Analytics:** Department-wise placement distribution, top hiring companies, and a master student placement status roster with CSV export and print view.

### 3.2 Non-Functional Requirements
- **Performance:** Sub-100ms API response time via MongoDB indexing.
- **Usability:** Responsive layout with Google Fonts (Inter / Outfit), clear color-coded status badges, and animated toast feedback.
- **Security:** Hashed passwords (10 salt rounds), route protection middleware, and parameterized database queries preventing SQL/NoSQL injection.

---

## 4. SYSTEM ARCHITECTURE & DESIGN

### 4.1 Architecture Diagram
```
+-------------------------------------------------------------+
|                      React.js Frontend                      |
|  - React 18 SPA with Vite Bundler                          |
|  - Context API (AuthContext, NotificationContext)           |
|  - Protected Route Guards (Student / Officer)              |
+-------------------------------------------------------------+
                              |
                              | REST API (HTTP JSON + Bearer JWT)
                              v
+-------------------------------------------------------------+
|                   Node.js / Express Backend                 |
|  - Express Router & Controllers                             |
|  - JWT Authentication & Authorization Middleware            |
|  - Automated Eligibility Matching Engine                   |
+-------------------------------------------------------------+
                              |
                              | Mongoose ODM
                              v
+-------------------------------------------------------------+
|                      MongoDB Database                       |
|  - Collections: Users, Companies, PlacementDrives, Apps     |
|  - Compound Unique Index: { drive: 1, student: 1 }          |
+-------------------------------------------------------------+
```

### 4.2 Database Schema & ER Model

#### 1. `Users` Collection
| Field | Type | Constraints | Description |
|---|---|---|---|
| `_id` | ObjectId | Primary Key | Unique User ID |
| `name` | String | Required | Full Name |
| `email` | String | Required, Unique | College Email |
| `password` | String | Required, Hashed | Bcrypt Password (select: false) |
| `role` | String | 'student' \| 'officer' | User Role |
| `rollNo` | String | Unique (Sparse) | College Roll Number (e.g. 22CS101) |
| `branch` | String | Enum (CSE, IT, etc.) | Engineering Department |
| `cgpa` | Number | Min: 0, Max: 10 | Cumulative GPA |
| `activeBacklogs`| Number | Min: 0 | Number of standing backlogs |
| `passingYear` | Number | Default: 2026 | Graduation Year |
| `skills` | [String] | Array | Key Technical Competencies |
| `resumeUrl` | String | URL | Resume / Portfolio Link |

#### 2. `Companies` Collection
| Field | Type | Constraints | Description |
|---|---|---|---|
| `_id` | ObjectId | Primary Key | Unique Company ID |
| `name` | String | Required, Unique | Company Name (e.g. Google India) |
| `industry` | String | Required | Domain (e.g. Product, Cloud) |
| `location` | String | Required | Headquarters / City |
| `description` | String | Required | Company Overview |
| `contactEmail` | String | Valid Email | Recruiter Contact Email |
| `contactPerson`| String | Text | Campus HR Name |

#### 3. `PlacementDrives` Collection
| Field | Type | Constraints | Description |
|---|---|---|---|
| `_id` | ObjectId | Primary Key | Unique Drive ID |
| `company` | ObjectId | Ref: 'Company' | Associated Company |
| `title` | String | Required | Role Headline (e.g. SDE-1) |
| `jobRole` | String | Required | Designation |
| `packageCTC` | String | Required | Salary Offered (e.g. 28 LPA) |
| `location` | String | Required | Work Location |
| `eligibility` | Object | Subdocument | `{ minCGPA, allowedBranches, maxBacklogs, passingYear }` |
| `driveDate` | Date | Required | Scheduled Drive Date |
| `deadline` | Date | Required | Application Deadline |
| `status` | String | Enum | 'Upcoming', 'Ongoing', 'Completed', 'Cancelled' |
| `rounds` | [String] | Array | Selection Stages |

#### 4. `Applications` Collection
| Field | Type | Constraints | Description |
|---|---|---|---|
| `_id` | ObjectId | Primary Key | Unique Application ID |
| `drive` | ObjectId | Ref: 'PlacementDrive'| Associated Placement Drive |
| `student` | ObjectId | Ref: 'User' | Applying Student |
| `appliedAt` | Date | Default: Date.now | Timestamp |
| `status` | String | Enum | 'Applied', 'Shortlisted', 'Technical Round', 'Interview', 'Selected', 'Rejected' |
| `remarks` | String | Text | Officer Feedback & Evaluation Notes |

*Note: Compound Unique Index `{ drive: 1, student: 1 }` prevents duplicate student submissions.*

---

## 5. KEY IMPLEMENTATION DETAILS

### 5.1 Eligibility Verification Algorithm
```javascript
const checkStudentEligibility = (student, drive) => {
  const reasons = [];
  let isEligible = true;

  const { minCGPA, allowedBranches, maxBacklogs, passingYear } = drive.eligibility;

  if (minCGPA && (student.cgpa || 0) < minCGPA) {
    isEligible = false;
    reasons.push(`CGPA requirement not met (Your CGPA: ${student.cgpa}, Required: ${minCGPA})`);
  }

  if (allowedBranches && allowedBranches.length > 0 && !allowedBranches.includes(student.branch)) {
    isEligible = false;
    reasons.push(`Branch '${student.branch}' not eligible (Allowed: ${allowedBranches.join(', ')})`);
  }

  if (maxBacklogs !== undefined && (student.activeBacklogs || 0) > maxBacklogs) {
    isEligible = false;
    reasons.push(`Active backlogs (${student.activeBacklogs}) exceeds limit (${maxBacklogs})`);
  }

  return { isEligible, reasons };
};
```

---

## 6. TEST CASES & VERIFICATION

| Test Case ID | Test Scenario | Input Data | Expected Result | Pass/Fail |
|---|---|---|---|---|
| **TC-01** | Student Registration | Valid Roll No, Branch, CGPA: 8.85 | Account created; JWT issued; redirected to Dashboard | **PASS** |
| **TC-02** | Duplicate Roll Number Registration | Duplicate Roll No: 22CS101 | Server returns 400 with duplicate error message | **PASS** |
| **TC-03** | Officer Login | officer@college.edu / Officer@123 | Authenticated; redirected to Officer Dashboard | **PASS** |
| **TC-04** | Ineligible Drive Application | Student (CGPA: 6.4) applies to Google (Min: 8.0) | System rejects with *"CGPA requirement not met"* | **PASS** |
| **TC-05** | Duplicate Application Prevention | Student applies twice to same drive | System blocks with *"Already applied"* | **PASS** |
| **TC-06** | Officer Status Update | Change status to 'Selected' with remarks | Application updated; student sees offer announcement | **PASS** |
| **TC-07** | Export CSV | Click 'Export CSV' in Applicant list | Downloads valid `.csv` with all applicant details | **PASS** |

---

## 7. CONCLUSION & FUTURE ENHANCEMENTS

### 7.1 Conclusion
The **Student Placement Management Portal** provides a dependable, scalable, and modern solution for college recruitment management. It eliminates manual overhead, enforces strict eligibility rules, ensures complete transparency for students, and empowers placement officers with rich candidate review and analytics tools.

### 7.2 Future Enhancements
1. **Automated Resume Parsing:** Utilizing NLP to match student skill keywords against job descriptions.
2. **Automated Email/SMS Notifications:** Integrated Nodemailer / Twilio triggers when recruitment stages update.
3. **Online Assessment Integration:** Embedded coding challenge editor for preliminary screening rounds.

---
*Report prepared for 10-Marks Mini Project Source-Code & Viva Evaluation.*
