SHOW GRANTS FOR 'placement_migrator'@'localhost';

SHOW GRANTS FOR 'placement_app'@'localhost';

SELECT SCHEMA_NAME
FROM INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME IN (
    'placement_portal_java',
    'placement_portal_java_test'
);