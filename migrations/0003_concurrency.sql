ALTER TABLE actions ADD COLUMN expected_version INTEGER;
CREATE TRIGGER action_version BEFORE INSERT ON actions BEGIN
SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM records WHERE tenant_id=NEW.tenant_id AND id=NEW.record_id AND version=NEW.expected_version) THEN RAISE(ABORT,'stale version') END;
END;
