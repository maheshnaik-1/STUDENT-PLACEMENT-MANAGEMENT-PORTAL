-- V1__init_schema.sql
-- Initial relational schema for Student Placement Management Portal
-- Targeted for MySQL 8.0.46 InnoDB Engine with UTF-8 (utf8mb4) support

-- 1. Users Table (Students, Placement Officers, Admins)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'officer') NOT NULL DEFAULT 'student',
    roll_no VARCHAR(50) UNIQUE DEFAULT NULL,
    branch VARCHAR(20) DEFAULT 'CSE',
    cgpa DECIMAL(4, 2) DEFAULT 0.00,
    active_backlogs INT DEFAULT 0,
    passing_year INT DEFAULT 2026,
    phone VARCHAR(25) DEFAULT '',
    resume_url VARCHAR(1024) DEFAULT '',
    
    -- Uploaded resume file metadata (v2.1.2-A)
    resume_file_name VARCHAR(255) DEFAULT NULL,
    resume_original_name VARCHAR(255) DEFAULT NULL,
    resume_mime_type VARCHAR(100) DEFAULT NULL,
    resume_size BIGINT DEFAULT NULL,
    resume_path VARCHAR(1024) DEFAULT NULL,
    resume_uploaded_at DATETIME(3) DEFAULT NULL,
    
    -- Academic Details (v2.1.1)
    tenth_percentage DECIMAL(5, 2) DEFAULT NULL,
    twelfth_percentage DECIMAL(5, 2) DEFAULT NULL,
    diploma_percentage DECIMAL(5, 2) DEFAULT NULL,
    current_semester INT DEFAULT NULL,
    gap_years INT DEFAULT 0,
    
    -- Social / Portfolio Links
    github_link VARCHAR(500) DEFAULT '',
    linkedin_link VARCHAR(500) DEFAULT '',
    portfolio_link VARCHAR(500) DEFAULT '',
    
    -- Timestamps
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_users_role (role),
    INDEX idx_users_branch (branch),
    INDEX idx_users_roll_no (roll_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Student Skills Table
CREATE TABLE IF NOT EXISTS student_skills (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    skill VARCHAR(100) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_student_skills_user FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_student_skill (student_id, skill),
    INDEX idx_student_skills_skill (skill)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Student Projects Table
CREATE TABLE IF NOT EXISTS student_projects (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT DEFAULT NULL,
    link VARCHAR(500) DEFAULT '',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_student_projects_user FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_student_projects_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Student Project Tech Stacks Table
CREATE TABLE IF NOT EXISTS student_project_tech_stacks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    tech VARCHAR(100) NOT NULL,
    CONSTRAINT fk_project_tech_project FOREIGN KEY (project_id) REFERENCES student_projects(id) ON DELETE CASCADE,
    INDEX idx_project_tech (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Student Certifications Table
CREATE TABLE IF NOT EXISTS student_certifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    issuer VARCHAR(255) DEFAULT '',
    issue_date VARCHAR(100) DEFAULT '',
    certificate_url VARCHAR(1024) DEFAULT '',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_student_cert_user FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_student_certifications_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    industry VARCHAR(100) NOT NULL,
    website VARCHAR(500) DEFAULT '',
    location VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    contact_email VARCHAR(255) DEFAULT '',
    contact_person VARCHAR(255) DEFAULT '',
    logo_url VARCHAR(1024) DEFAULT '',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_companies_name (name),
    INDEX idx_companies_industry (industry)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Placement Drives Table
CREATE TABLE IF NOT EXISTS placement_drives (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    job_role VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    package_ctc VARCHAR(100) NOT NULL, -- Preserved as String per requirement
    location VARCHAR(255) NOT NULL,
    min_cgpa DECIMAL(4, 2) NOT NULL DEFAULT 6.00,
    max_backlogs INT NOT NULL DEFAULT 0,
    passing_year INT NOT NULL DEFAULT 2026,
    drive_date DATETIME(3) NOT NULL,
    deadline DATETIME(3) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Upcoming',
    created_by BIGINT DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_drives_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_drives_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_drives_company (company_id),
    INDEX idx_drives_status (status),
    INDEX idx_drives_deadline (deadline),
    INDEX idx_drives_drive_date (drive_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Drive Allowed Branches Table
CREATE TABLE IF NOT EXISTS drive_allowed_branches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    drive_id BIGINT NOT NULL,
    branch VARCHAR(50) NOT NULL,
    CONSTRAINT fk_drive_branches_drive FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE,
    UNIQUE KEY uk_drive_branch (drive_id, branch),
    INDEX idx_drive_branches (drive_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Drive Rounds Table
CREATE TABLE IF NOT EXISTS drive_rounds (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    drive_id BIGINT NOT NULL,
    round_order INT NOT NULL DEFAULT 0,
    round_name VARCHAR(100) NOT NULL,
    CONSTRAINT fk_drive_rounds_drive FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE,
    INDEX idx_drive_rounds (drive_id, round_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Drive Required Skills Table
CREATE TABLE IF NOT EXISTS drive_required_skills (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    drive_id BIGINT NOT NULL,
    skill VARCHAR(100) NOT NULL,
    CONSTRAINT fk_drive_skills_drive FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE,
    UNIQUE KEY uk_drive_skill (drive_id, skill),
    INDEX idx_drive_skills (drive_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    drive_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    status VARCHAR(50) NOT NULL DEFAULT 'Applied',
    remarks VARCHAR(1000) DEFAULT 'Application submitted successfully.',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_applications_drive FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE,
    CONSTRAINT fk_applications_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_application_drive_student (drive_id, student_id),
    INDEX idx_applications_drive (drive_id),
    INDEX idx_applications_student (student_id),
    INDEX idx_applications_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Application Status History Table (Audit Trail)
CREATE TABLE IF NOT EXISTS application_status_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    remarks VARCHAR(1000) DEFAULT '',
    changed_by BIGINT DEFAULT NULL,
    changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_history_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_history_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_history_app (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Application Withdrawals Table (Audit & Duplicate-Prevention Archive)
CREATE TABLE IF NOT EXISTS application_withdrawals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    original_application_id BIGINT DEFAULT NULL,
    drive_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    withdrawn_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    previous_status VARCHAR(50) NOT NULL DEFAULT 'Applied',
    reason VARCHAR(500) DEFAULT 'Withdrawn by student',
    CONSTRAINT fk_withdrawals_drive FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE,
    CONSTRAINT fk_withdrawals_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_withdrawals_student (student_id),
    INDEX idx_withdrawals_drive (drive_id),
    INDEX idx_withdrawals_withdrawn_at (withdrawn_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    related_entity_id BIGINT DEFAULT NULL,
    related_entity_type VARCHAR(50) DEFAULT NULL,
    link VARCHAR(500) DEFAULT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at DATETIME(3) DEFAULT NULL,
    metadata_json JSON DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_recipient_created (recipient_id, created_at DESC),
    INDEX idx_notifications_recipient_read (recipient_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Notification Outbox Table (Guaranteed, Idempotent Transactional Outbox)
CREATE TABLE IF NOT EXISTS notification_outbox (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    event_type VARCHAR(50) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id BIGINT NOT NULL,
    payload_json JSON NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    processed_at DATETIME(3) DEFAULT NULL,
    INDEX idx_outbox_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Audit Logs Table (Administrative & Security Event Log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id BIGINT DEFAULT NULL,
    details JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Idempotency Keys Table (Prevents Duplicate Mutation Execution on Retries)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    operation VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    response_payload JSON DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at DATETIME(3) NOT NULL,
    INDEX idx_idempotency_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
