# Student Placement Management Portal — Project Run Guide

This guide describes how to run the **active production architecture** of the Student Placement Management Portal locally.

---

## Active Architecture Overview

- **Frontend:** React 18 Single Page Application powered by Vite (Port `3000`)
- **Backend:** Java Spring Boot 3.4.3 REST API running on Java 21+ (Port `5000`)
- **Database:** MySQL 8.0 relational database (`placement_portal_java`) (Port `3306`)
- **Active Backend Directory:** `server-java/`
- **Frontend Directory:** `client/`
- **Legacy Prototype Backend:** `server/` (Node.js/Express + MongoDB — **DO NOT** use for normal startup)

---

### Quick Start — Run the Project

**Step 1 — Start MySQL**
- Make sure MySQL 8.0 service is running.
- Database: `placement_portal_java`
- MySQL port: `3306`

**Step 2 — Start Backend**
Open **Terminal 1**:

```powershell
cd "D:\Student Placement Management Portal\server-java"

$env:JWT_SECRET="MyPlacementPortalJWTSecretKey2026Secure"
$env:PLACEMENT_APP_PASSWORD="<YOUR_ACTUAL_PLACEMENT_APP_PASSWORD>"

.\mvnw.cmd spring-boot:run
```

Wait until the terminal shows:

```text
Tomcat started on port 5000 (http)
Started PortalApplication
```

Only after these messages appear should the backend be considered ready.

**Step 3 — Start Frontend**
Open **Terminal 2** and leave Terminal 1 running:

```powershell
cd "D:\Student Placement Management Portal\client"
npm run dev
```

The frontend runs on:

```text
http://localhost:3000
```

**Step 4 — Open the Portal**

Open:

```text
http://localhost:3000/login
```

**Step 5 — While Using the Project**
- Keep Terminal 1 (backend) open.
- Keep Terminal 2 (frontend) open.
- Do not close either terminal while using the application.

---

### Stopping the Project

To stop the portal:
1. In **Terminal 1** (Backend), press `Ctrl + C` and confirm termination (`Y`) to shut down Spring Boot.
2. In **Terminal 2** (Frontend), press `Ctrl + C` to stop the Vite development server.

---

### Important — Do NOT Do These

- Do NOT start the old `server/` Node.js backend.
- Do NOT start MongoDB.
- Do NOT run `npm run seed`.
- Do NOT drop, recreate, or reset the MySQL database during normal startup.
- Do NOT commit actual passwords or JWT secrets to Git.
- Do NOT modify `placement_migrator` credentials/permissions just to start the application.

---

### If Backend Does Not Start

Check the final error message in Terminal 1.

Common cases:

**MySQL authentication error**
```text
Access denied for user 'placement_app'@'localhost'
```
→ The `PLACEMENT_APP_PASSWORD` value does not match the current MySQL password for `placement_app`.

**JWT secret error**
```text
JWT_SECRET must be at least 32 characters
```
→ Set a JWT secret of at least 32 characters before starting the backend.

**Port 5000 already in use**
→ Check whether another Spring Boot instance is already running before starting another one.
