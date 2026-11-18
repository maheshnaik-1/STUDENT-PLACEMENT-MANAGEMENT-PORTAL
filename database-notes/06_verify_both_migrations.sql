SELECT
    'placement_portal_java' AS database_name,
    version,
    description,
    success
FROM placement_portal_java.flyway_schema_history

UNION ALL

SELECT
    'placement_portal_java_test' AS database_name,
    version,
    description,
    success
FROM placement_portal_java_test.flyway_schema_history;