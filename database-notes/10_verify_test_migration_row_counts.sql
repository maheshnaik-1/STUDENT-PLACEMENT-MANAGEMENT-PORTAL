USE placement_portal_java_test;

SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'placement_drives', COUNT(*) FROM placement_drives
UNION ALL
SELECT 'applications', COUNT(*) FROM applications
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;