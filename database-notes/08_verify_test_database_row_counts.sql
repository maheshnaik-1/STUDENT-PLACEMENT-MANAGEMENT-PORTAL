SELECT 'users' AS table_name, COUNT(*) AS row_count FROM placement_portal_java_test.users
UNION ALL
SELECT 'companies', COUNT(*) FROM placement_portal_java_test.companies
UNION ALL
SELECT 'placement_drives', COUNT(*) FROM placement_portal_java_test.placement_drives
UNION ALL
SELECT 'applications', COUNT(*) FROM placement_portal_java_test.applications
UNION ALL
SELECT 'notifications', COUNT(*) FROM placement_portal_java_test.notifications
UNION ALL
SELECT 'application_status_history', COUNT(*) FROM placement_portal_java_test.application_status_history;