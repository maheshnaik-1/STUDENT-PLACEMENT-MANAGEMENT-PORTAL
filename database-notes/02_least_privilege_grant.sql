REVOKE ALL PRIVILEGES ON placement_portal_java.*
FROM 'placement_migrator'@'localhost';

REVOKE ALL PRIVILEGES ON placement_portal_java_test.*
FROM 'placement_migrator'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, DROP, ALTER, INDEX, REFERENCES, LOCK TABLES
ON placement_portal_java.*
TO 'placement_migrator'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, DROP, ALTER, INDEX, REFERENCES, LOCK TABLES
ON placement_portal_java_test.*
TO 'placement_migrator'@'localhost';

SHOW GRANTS FOR 'placement_migrator'@'localhost';