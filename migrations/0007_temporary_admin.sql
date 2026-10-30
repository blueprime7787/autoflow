CREATE TABLE temporary_admin_sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE INDEX temporary_admin_sessions_expiry ON temporary_admin_sessions(expires);
CREATE TRIGGER revoke_temporary_admin AFTER UPDATE ON users WHEN NEW.hash!=OLD.hash OR NEW.role!=OLD.role OR NEW.active!=OLD.active BEGIN DELETE FROM temporary_admin_sessions WHERE user_id=NEW.id; END;
