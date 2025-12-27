-- ============================================
-- Fix: Spalte granted_by umbenennen zu granted_by_id
-- ============================================

USE facility_master;

-- Prüfe ob granted_by existiert und benenne um
ALTER TABLE user_project_access
CHANGE COLUMN IF EXISTS granted_by granted_by_id CHAR(36);

-- Alternativ: Falls granted_by_id noch nicht existiert, hinzufügen
ALTER TABLE user_project_access
ADD COLUMN IF NOT EXISTS granted_by_id CHAR(36);

-- Foreign Key hinzufügen (falls noch nicht vorhanden)
-- Erst prüfen ob Constraint existiert, dann hinzufügen
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'facility_master'
    AND TABLE_NAME = 'user_project_access'
    AND CONSTRAINT_NAME = 'fk_upa_granted_by'
);

SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE user_project_access ADD CONSTRAINT fk_upa_granted_by FOREIGN KEY (granted_by_id) REFERENCES users(id) ON DELETE SET NULL',
    'SELECT ''Foreign key already exists'' as status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Fix completed! Spalte granted_by_id ist jetzt vorhanden.' as Status;
