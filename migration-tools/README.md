# Student Placement Management Portal - Data Migration Tools

Standalone, repeatable, and reversible migration runner that transfers existing live MongoDB data (`placement_portal`) into the relational MySQL 8.0.46 schema (`placement_portal_java` or `placement_portal_java_test`).

---

## 1. Directory Structure

```text
migration-tools/
├── package.json        # Isolated dependencies (mysql2, dotenv)
├── config.js          # Central config with safety interlocks and defaults
├── logger.js          # Standardized logging with automatic secret redaction
├── mappings.js        # Relational mappings, type conversions, and unmapped fields
├── validator.js       # Preflight integrity checks (uniqueness, FKs, enums, lengths)
├── migrator.js        # Core extraction, deterministic ID mapping, and transactional runner
├── reconciler.js      # Post-migration row-count and referential integrity validator
├── migrate.js         # Main CLI entrypoint
└── README.md          # Documentation and execution instructions
```

---

## 2. Safety Guarantees

1. **Dry-Run by Default:**
   If invoked with no flags or `--dry-run`, the runner connects to MongoDB strictly in read-only mode, builds deterministic in-memory ID mappings, validates all constraints, and generates an execution forecast. **No MySQL writes or connections occur.**
2. **Double Opt-In for Writes:**
   To perform live database writes, the runner requires **both** `--execute` and `--confirm-write` (or `CONFIRM_MIGRATION_WRITE=true`). Attempting `--execute` without confirmation immediately halts execution.
3. **Safe Target Database Default:**
   The runner defaults to `placement_portal_java_test`. Target database must be explicitly specified to write to production/development `placement_portal_java`.
4. **All-or-Nothing Transactions:**
   Live writes are executed inside a single MySQL transaction (`START TRANSACTION`). If any batch or constraint fails, an immediate `ROLLBACK` is executed, leaving the target database completely clean.
5. **Pre-Write Collision Prevention (All 13 Populated Tables):**
   Before starting the write transaction, the runner queries `SELECT COUNT(*)` across every single target table to be populated: `users`, `companies`, `student_skills`, `student_projects`, `student_project_tech_stacks`, `student_certifications`, `placement_drives`, `drive_allowed_branches`, `drive_rounds`, `drive_required_skills`, `applications`, `application_status_history`, and `notifications`. If ANY table contains $> 0$ rows, migration aborts immediately before initiating the transaction.
   The 5 remaining Flyway V1 tables (`application_withdrawals`, `notification_outbox`, `audit_logs`, `idempotency_keys`, `system_settings`) are documented architectural runtime tables not populated from MongoDB.
6. **Credential & Password Hash Redaction:**
   The logger automatically filters out connection strings, credentials, and BCrypt hashes (`$2b$10$...`). User password hashes are preserved and transferred directly via parameterized queries without logging.
7. **Read-Only Source Database:**
   The original MongoDB database is accessed strictly via read queries (`find()`, `countDocuments()`). Zero inserts, updates, or deletions are executed on MongoDB.

---

## 3. Usage Commands

### A. Non-Destructive Dry-Run (Simulation)
Reads live MongoDB data, validates constraints, and displays intended row counts without writing to MySQL:
```powershell
cd "d:\Student Placement Management Portal\migration-tools"
node migrate.js --dry-run
```

### B. Live Migration into Test Database (`placement_portal_java_test`)
```powershell
$env:PLACEMENT_APP_PASSWORD = "YourMysqlAppPassword"
cd "d:\Student Placement Management Portal\migration-tools"
node migrate.js --execute --confirm-write --target-db=placement_portal_java_test
```

### C. Live Migration into Development Database (`placement_portal_java`)
```powershell
$env:PLACEMENT_APP_PASSWORD = "YourMysqlAppPassword"
cd "d:\Student Placement Management Portal\migration-tools"
node migrate.js --execute --confirm-write --target-db=placement_portal_java
```

### D. Standalone Post-Migration Verification
Runs post-migration reconciliation queries against the specified target database:
```powershell
$env:PLACEMENT_APP_PASSWORD = "YourMysqlAppPassword"
cd "d:\Student Placement Management Portal\migration-tools"
node migrate.js --verify-only --target-db=placement_portal_java
```

---

## 4. Expected Row Counts

| Order | Target MySQL Table | Source Origin | Expected Rows |
| :---: | :--- | :--- | :---: |
| 1 | `users` | `users` root documents | 6 |
| 2 | `student_skills` | `users.skills[]` | 38 |
| 3 | `student_projects` | `users.projects[]` | 1 |
| 4 | `student_project_tech_stacks` | `users.projects[].techStack[]` | 4 |
| 5 | `student_certifications` | `users.certifications[]` | 1 |
| 6 | `companies` | `companies` root documents | 6 |
| 7 | `placement_drives` | `placementdrives` root documents | 7 |
| 8 | `drive_allowed_branches` | `placementdrives.eligibility.allowedBranches[]` | 27 |
| 9 | `drive_rounds` | `placementdrives.rounds[]` | 24 |
| 10 | `drive_required_skills` | `placementdrives.requiredSkills[]` | 18 |
| 11 | `applications` | `applications` root documents | 12 |
| 12 | `application_status_history` | `applications.statusHistory[]` | 2 |
| 13 | `application_withdrawals` | Architectural table (empty) | 0 |
| 14 | `notifications` | `notifications` root documents | 22 |
| 15-18| `notification_outbox`, `audit_logs`, `idempotency_keys`, `system_settings` | Runtime tables | 0 |
| **TOTAL** | **All 18 Tables** | | **166** |
