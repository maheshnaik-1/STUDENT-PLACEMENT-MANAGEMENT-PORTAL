# Student Placement Management Portal
> **B.Tech CSE Mini Project** — Complete Full-Stack Web Application (MERN Stack)

A complete, modern college placement management system connecting students and placement officers with automated eligibility matching, role-based dashboards, and live recruitment stage tracking.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (Tested on v25.8.0)
- **MongoDB**: Running locally at `mongodb://127.0.0.1:27017`

### 2. Start the Application
Both the backend and frontend are already configured. You can start both concurrently with one command:

```bash
# In the root folder:
npm run dev
```

Or run them individually:
```bash
# Start Backend (Port 5000)
npm run server

# Start Frontend (Port 3000)
npm run client
```

- **Frontend URL:** [http://localhost:3000](http://localhost:3000)
- **Backend API URL:** [http://localhost:5000](http://localhost:5000)

---

## 🔑 Demo Login Credentials (Viva Ready)

The database includes realistic seed data with top recruiters and sample students. You can also use the **1-Click Quick Autofill Buttons** on the Login page!

### 1. Training & Placement Officer (TPO)
- **Email:** `officer@college.edu`
- **Password:** `Officer@123`
- **Role:** `officer`

### 2. Sample Students
| Student Name | Department | CGPA | Backlogs | Email | Password |
|---|---|---|---|---|---|
| **Rahul Verma** | CSE | 8.85 | 0 | `rahul.cse@college.edu` | `Student@123` |
| **Priya Nair** | IT | 7.65 | 0 | `priya.it@college.edu` | `Student@123` |
| **Sneha Kulkarni** | AI&DS | 9.20 | 0 | `sneha.aids@college.edu` | `Student@123` |
| **Arjun Patel** | ECE | 6.40 | 1 | `arjun.ece@college.edu` | `Student@123` |
| **Vikram Singh** | MECH | 7.10 | 0 | `vikram.mech@college.edu` | `Student@123` |

To re-seed the database at any time:
```bash
npm run seed
```

---

## 🌟 Feature Checklist

### Student Features
- [x] Student registration with academic profile (CGPA, Branch, Backlogs, Passing Year, Skills, Resume link)
- [x] Student login & profile management with instant eligibility recalculation
- [x] Browse available placement drives with company information, package CTC, and deadlines
- [x] **Automated Eligibility Engine**: Live green/red badges indicating whether student meets drive criteria with exact reasons if ineligible
- [x] 1-Click application submission with duplicate prevention
- [x] My Applications Tracker with color-coded stage badges: `Applied` → `Shortlisted` → `Tech Round` → `Interview` → `Selected` / `Rejected`
- [x] View Placement Officer feedback and offer letter notices

### Placement Officer Features
- [x] Placement Officer executive dashboard with live KPI counters
- [x] Company management (Add, View, Edit, Delete with cascade handling)
- [x] Create and schedule placement drives with custom eligibility thresholds (min CGPA, branch checkboxes, max backlogs)
- [x] Candidate evaluation console: View applicants for each drive with full academic details & resume links
- [x] Update applicant recruitment stage with custom officer remarks
- [x] Export applicant rosters to CSV
- [x] Placement analytics & printable Master Student Placement Status Report

---

## 📁 Project Structure

```
Student Placement Management Portal/
├── client/                      # React Frontend (Vite)
│   ├── src/
│   │   ├── components/          # Reusable UI & Modals
│   │   ├── context/             # AuthContext & NotificationContext
│   │   ├── pages/               # Student & Officer Views
│   │   ├── services/            # Centralized API client
│   │   ├── App.jsx              # Main router
│   │   └── index.css            # Custom responsive CSS design system
├── server/                      # Node.js & Express Backend
│   ├── config/                  # MongoDB connection
│   ├── controllers/             # Business logic controllers
│   ├── middleware/              # JWT auth & error handlers
│   ├── models/                  # Mongoose schemas (User, Company, Drive, App)
│   ├── routes/                  # Express REST routes
│   ├── seed/                    # Database seeder
│   └── server.js                # Server entrypoint
├── docs/                        # Project Documentation
│   ├── PROJECT_REPORT.md        # 10-Marks Mini Project Report
│   ├── VIVA_QUESTIONS_AND_ANSWERS.md # 7-Member Group Viva Question Bank
│   └── ARCHITECTURE_AND_DATAFLOW.md  # Architecture & API Specs
└── README.md
```

---

## 📄 Documentation & Viva Prep
All evaluation materials are prepared and ready in the `docs/` folder:
1. [`docs/PROJECT_REPORT.md`](file:///d:/Student%20Placement%20Management%20Portal/docs/PROJECT_REPORT.md) — Hardcopy submission report.
2. [`docs/VIVA_QUESTIONS_AND_ANSWERS.md`](file:///d:/Student%20Placement%20Management%20Portal/docs/VIVA_QUESTIONS_AND_ANSWERS.md) — Viva question bank for all 7 team members.
3. [`docs/ARCHITECTURE_AND_DATAFLOW.md`](file:///d:/Student%20Placement%20Management%20Portal/docs/ARCHITECTURE_AND_DATAFLOW.md) — Architectural and data flow specification.
