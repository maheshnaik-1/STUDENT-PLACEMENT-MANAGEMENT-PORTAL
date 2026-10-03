# STUDENT PLACEMENT MANAGEMENT PORTAL
## Complete Faculty Viva Questions & Answers Bank (For 7-Member Group)

This viva preparation guide covers the complete technical architecture, design decisions, source code explanations, and role-specific questions for our 7-member B.Tech CSE team.

---

### Part 1: Architecture & Technology Stack

#### Q1. What is the architecture of this project and why was MERN stack chosen?
**Answer:**
The project follows a **3-tier client-server architecture**:
1. **Presentation Layer (Frontend):** React.js (Single Page Application via Vite) for a fast, reactive UI.
2. **Application / Business Logic Layer (Backend):** Node.js and Express.js REST API providing stateless endpoints, JWT authentication, and business rule evaluation.
3. **Data Layer (Database):** MongoDB with Mongoose ODM for flexible document storage, schema validation, and indexing.

**Why MERN:**
- End-to-end JavaScript eliminates serialization/deserialization mismatch between frontend and backend.
- JSON-native data flow across the entire stack.
- Non-blocking asynchronous I/O in Node.js handles multiple concurrent campus applicants efficiently.

#### Q2. How is communication established between React and Express?
**Answer:**
The React frontend communicates with Express via asynchronous HTTP requests (`fetch` API encapsulated inside our `api.js` service).
- For local development, Vite proxies `/api` requests to `http://localhost:5000` to prevent CORS issues.
- Every authenticated request includes an `Authorization: Bearer <JWT_TOKEN>` header.

---

### Part 2: Authentication & Security

#### Q3. How is user authentication handled? Why is JWT used?
**Answer:**
We use **JSON Web Tokens (JWT)** for stateless session management:
1. When a student or officer logs in with valid credentials, the server signs a JWT payload containing the user's MongoDB `_id` using a server-side secret key (`process.env.JWT_SECRET`) with an expiration of 7 days.
2. The client stores the token in `localStorage` and attaches it in the `Authorization` header for subsequent requests.
3. The `protect` middleware on the backend intercepts incoming requests, verifies the token signature using `jwt.verify()`, retrieves the user document (excluding password), and attaches it to `req.user`.

#### Q4. How is password security implemented?
**Answer:**
- Passwords are never stored in plaintext.
- We use `bcryptjs` with 10 salt rounds inside a Mongoose `pre('save')` hook on the `User` model.
- When logging in, `bcrypt.compare(enteredPassword, hashedPassword)` verifies the match.
- In the User schema, `password` is marked with `select: false` so database queries never leak password hashes by default.

#### Q5. How does Role-Based Access Control (RBAC) work?
**Answer:**
We have two user roles: `student` and `officer`.
- In the backend, the `authorize('officer')` middleware checks `req.user.role` after token validation. If a student attempts to create a drive or company, the server returns HTTP 403 Forbidden.
- In the frontend, `<ProtectedRoute allowedRole="student" />` guards routes and prevents unauthorized navigation.

---

### Part 3: Business Logic & Core Algorithms

#### Q6. How does the Automated Eligibility Verification Engine work?
**Answer:**
When a student views or applies for a placement drive, the system compares the student's academic profile against the drive's eligibility criteria:
1. **CGPA Check:** `student.cgpa >= drive.eligibility.minCGPA`
2. **Branch Check:** `drive.eligibility.allowedBranches.includes(student.branch)`
3. **Backlog Check:** `student.activeBacklogs <= drive.eligibility.maxBacklogs`
4. **Passing Year Check:** `student.passingYear === drive.eligibility.passingYear`

If all 4 conditions pass, `isEligible = true`. If any fail, the engine generates specific user-friendly failure explanations (e.g., *"CGPA too low: 6.8 vs 7.5 required"* or *"Branch MECH not eligible"*).

#### Q7. How does the system prevent duplicate applications?
**Answer:**
We enforce duplicate prevention at two distinct layers:
1. **Application Logic Layer (Controller):** Before creating an application, `Application.findOne({ drive: driveId, student: studentId })` checks if an application exists. If found, it returns HTTP 400.
2. **Database Layer (Mongoose Index):** A compound unique index `applicationSchema.index({ drive: 1, student: 1 }, { unique: true })` guarantees at the database engine level that no duplicate pair can ever be inserted.

---

### Part 4: Database Design & Mongoose

#### Q8. What collections/models exist in the database and how are they linked?
**Answer:**
We designed 4 MongoDB collections:
1. **Users (`User.js`):** Stores both students and placement officers with role differentiation and academic fields (rollNo, branch, cgpa, backlogs, skills, resumeUrl).
2. **Companies (`Company.js`):** Stores company name, industry, website, location, HR contact details, and logo.
3. **PlacementDrives (`PlacementDrive.js`):** Links to a company via `company: { type: ObjectId, ref: 'Company' }`, jobRole, packageCTC, driveDate, deadline, and embedded `eligibility` subdocument.
4. **Applications (`Application.js`):** Acts as a junction collection linking `drive` (ref: PlacementDrive) and `student` (ref: User), storing `status`, `remarks`, and `appliedAt`.

#### Q9. Why did you use Mongoose `populate()`?
**Answer:**
`populate()` in Mongoose performs reference population (similar to a SQL `JOIN`). For example, when fetching a student's applications, we populate `drive` and nested `company` so the frontend receives the full company name, package, and logo in a single API round-trip.

---

### Part 5: Team Member Role Distribution & Viva Answers

#### Member 1: Authentication & Security Lead
- **Files:** `server/models/User.js`, `server/controllers/authController.js`, `server/middleware/authMiddleware.js`, `client/src/context/AuthContext.jsx`
- **Key Viva Answer:** *"I designed the JWT authentication workflow, bcrypt password hashing with salt rounds, and the custom `protect` and `authorize` Express middleware to secure endpoints based on user roles."*

#### Member 2: Company Management Module Lead
- **Files:** `server/models/Company.js`, `server/controllers/companyController.js`, `server/routes/companyRoutes.js`, `client/src/pages/officer/ManageCompanies.jsx`, `client/src/components/officer/CompanyFormModal.jsx`
- **Key Viva Answer:** *"I implemented company registration, directory search, updates, and cascading deletion logic ensuring that if a company is removed, all linked placement drives and applications are safely handled."*

#### Member 3: Placement Drive Management Lead
- **Files:** `server/models/PlacementDrive.js`, `server/controllers/driveController.js`, `server/routes/driveRoutes.js`, `client/src/pages/officer/ManageDrives.jsx`, `client/src/components/officer/DriveFormModal.jsx`
- **Key Viva Answer:** *"I built the Placement Drive creation and scheduling system with dynamic eligibility criteria inputs (min CGPA, branch checkboxes, backlog limits, and recruitment rounds)."*

#### Member 4: Student Module & Eligibility Engine Lead
- **Files:** `client/src/pages/student/AvailableDrives.jsx`, `client/src/pages/student/DriveDetails.jsx`, `client/src/components/student/DriveCard.jsx`
- **Key Viva Answer:** *"I implemented the live eligibility checker that compares a student's academic profile in real-time with drive requirements and renders instant visual feedback with exact reasons if ineligible."*

#### Member 5: Application Tracking & Status Management Lead
- **Files:** `server/models/Application.js`, `server/controllers/applicationController.js`, `client/src/pages/student/MyApplications.jsx`, `client/src/components/common/StatusBadge.jsx`
- **Key Viva Answer:** *"I created the application submission pipeline with duplicate prevention, the candidate status lifecycle (Applied -> Shortlisted -> Tech Round -> Interview -> Selected), and status badge UI."*

#### Member 6: Officer Applicant Review & Candidate Evaluation Lead
- **Files:** `client/src/pages/officer/DriveApplicants.jsx`, `client/src/components/officer/StatusUpdateModal.jsx`
- **Key Viva Answer:** *"I built the officer candidate evaluation console allowing placement officers to review student profiles, resumes, update selection stages with feedback remarks, and export candidate rosters to CSV."*

#### Member 7: Placement Analytics & Reporting Lead
- **Files:** `server/controllers/studentController.js`, `client/src/pages/officer/PlacementReports.jsx`, `client/src/pages/officer/OfficerDashboard.jsx`
- **Key Viva Answer:** *"I designed the aggregate analytics engine calculating placement rate %, department-wise placement distributions, company offer counts, and the master printable student placement roster."*
