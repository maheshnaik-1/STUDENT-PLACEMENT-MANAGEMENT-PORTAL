SELECT User, Host
FROM mysql.user
WHERE User IN ('root', 'placement_app', 'placement_migrator');