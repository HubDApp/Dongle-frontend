-- Grant full access on all current and future tables to the app user.
-- In production, use narrower grants per table and role.

GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO dongle;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dongle;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON TABLES    TO dongle;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON SEQUENCES TO dongle;
