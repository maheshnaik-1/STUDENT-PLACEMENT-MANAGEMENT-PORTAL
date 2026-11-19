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

## 1. Prerequisites

Before starting the application, ensure the following requirements are met:

1. **MySQL 8.0 Service Running:**
   - The MySQL 8.0 service (`MySQL80`) must be active on port `3306`.
   - Verify the service in PowerShell:
     ```powershell
     Get-Service MySQL80
     ```
   - If stopped, start it with administrative privileges:
     ```powershell
     Start-Service MySQL80
     ```
   - Confirm the application database `placement_portal_java` exists.

2. **Required Environment Variables:**
   - `JWT_SECRET`: A secure string of at least 32 characters (256 bits) used for HMAC-SHA token signing.
   - `PLACEMENT_APP_PASSWORD`: The password for the dedicated MySQL application account (`placement_app@localhost`).
   - *(Note: `JWT_EXPIRE_MS` is optional and defaults to `604800000` ms / 7 days).*

> [!IMPORTANT]
> Never hardcode, check in, or commit actual database passwords or JWT secret keys. Provide them only via environment variables in your active terminal session.

---

## 2. Normal Startup Procedure

The application requires two separate terminal windows running concurrently:
- **Terminal 1:** Java Spring Boot Backend
- **Terminal 2:** React Vite Frontend

Both terminals must remain open while using the application.

---

### Step 1: Start the Java Spring Boot Backend (Terminal 1)

1. Open PowerShell and navigate to the `server-java` directory:
   ```powershell
   cd "D:\Student Placement Management Portal\server-java"
   ```

2. Set the required environment variables for your session:
   ```powershell
   $env:JWT_SECRET="<your_jwt_secret>"
   $env:PLACEMENT_APP_PASSWORD="<your_mysql_password>"
   ```

3. Launch the Spring Boot backend using the Maven wrapper:
   ```powershell
   .\mvnw.cmd spring-boot:run
   ```

4. Verify backend startup:
   - The backend runs on port **`5000`**.
   - Watch for the startup message:
     `Started PortalApplication in X.XXX seconds`
   - Keep this terminal running.

---

### Step 2: Start the React Frontend (Terminal 2)

1. Open a second PowerShell terminal and navigate to the `client` directory:
   ```powershell
   cd "D:\Student Placement Management Portal\client"
   ```

2. Start the Vite development server:
   ```powershell
   npm run dev
   ```

3. Verify frontend startup:
   - The development server runs on port **`3000`**.
   - Keep this terminal running.

---

### Step 3: Access the Application

Open your browser and navigate to:
```
http://localhost:3000/login
```

Log in using your existing student or placement officer credentials.

---

## 3. Stopping the Project

To stop the portal:
1. In **Terminal 1** (Backend), press `Ctrl + C` and confirm termination (`Y`) to shut down Spring Boot.
2. In **Terminal 2** (Frontend), press `Ctrl + C` to stop the Vite development server.

---

## 4. Important Warnings

> [!WARNING]
> Please adhere to these operational boundaries:
> 
> 1. **Do NOT start the legacy `server/` backend:** The Node.js/Express application in `server/` is an archived prototype retained solely for historical reference and legacy file continuity. It is not part of the active runtime.
> 2. **Do NOT start MongoDB:** The active application runs exclusively against MySQL 8.0. MongoDB is not required for daily execution.
> 3. **Do NOT run drop, recreate, or seed scripts:** Never run destructive reset scripts or `npm run seed` during normal startup. Existing student accounts, placement drives, applications, and historical audit logs are stored permanently in MySQL.
> 4. **Do NOT commit passwords or secrets:** Never hardcode credentials into `.env`, source files, or configuration templates.
> 5. **Do NOT modify `placement_migrator`:** The `placement_migrator` MySQL account is reserved for schema verification and migration tooling. The running Java backend strictly uses `placement_app`.

---

## 5. Troubleshooting

- **MySQL Access Denied (`placement_app@localhost`):**
  - **Symptom:** Spring Boot startup fails with `Access denied for user 'placement_app'@'localhost' (using password: YES)`.
  - **Resolution:** The value supplied to `$env:PLACEMENT_APP_PASSWORD` in your terminal must match the exact password configured for the `placement_app` user in MySQL. If needed, the password can be re-aligned using a MySQL root session:
    ```sql
    ALTER USER 'placement_app'@'localhost' IDENTIFIED BY '<your_mysql_password>';
    FLUSH PRIVILEGES;
    ```

- **Frontend API Communication Failure (Network Error / 500 / 404):**
  - **Symptom:** Login or data fetching fails in the browser UI.
  - **Resolution:** Ensure the Java Spring Boot backend is completely started on port `5000` before interacting with the frontend. The Vite development proxy (`client/vite.config.js`) redirects all `/api/*` network requests to `http://localhost:5000`.

- **Port Already in Use (`Address already in use: bind`):**
  - **Backend (Port 5000):** Check if another Java instance or legacy server process is already running on port 5000:
    ```powershell
    Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
    ```
  - **Frontend (Port 3000):** If port 3000 is occupied, terminate any zombie node processes before running `npm run dev`.
