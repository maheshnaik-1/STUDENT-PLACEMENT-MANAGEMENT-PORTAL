SELECT
    TABLE_NAME,
    TABLE_ROWS
FROM information_schema.tables
WHERE TABLE_SCHEMA = 'placement_portal_java_test'
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;