SELECT
    s.schema_name,
    COUNT(t.table_name) AS table_count
FROM (
    SELECT 'placement_portal_java' AS schema_name
    UNION ALL
    SELECT 'placement_portal_java_test'
) AS s
LEFT JOIN information_schema.tables t
    ON t.table_schema = s.schema_name
GROUP BY s.schema_name;