ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1));
ALTER TABLE users ADD COLUMN must_change INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
CREATE TABLE login_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TRIGGER last_admin BEFORE UPDATE ON users WHEN OLD.role='admin' AND OLD.active=1 AND (NEW.role!='admin' OR NEW.active=0) BEGIN
 SELECT CASE WHEN (SELECT count(*) FROM users WHERE tenant_id=OLD.tenant_id AND role='admin' AND active=1 AND id!=OLD.id)=0 THEN RAISE(ABORT,'last active administrator') END;
END;
CREATE TRIGGER revoke_sessions AFTER UPDATE ON users WHEN NEW.hash!=OLD.hash OR NEW.role!=OLD.role OR NEW.active!=OLD.active BEGIN DELETE FROM sessions WHERE user_id=NEW.id; END;
CREATE TABLE revisions(tenant_id TEXT NOT NULL,record_id TEXT NOT NULL,revision INTEGER NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(tenant_id,record_id,revision),FOREIGN KEY(tenant_id,record_id) REFERENCES records(tenant_id,id));
INSERT INTO revisions(tenant_id,record_id,revision,data) SELECT tenant_id,id,COALESCE(json_extract(data,'$.revision'),1),data FROM records WHERE kind='quote';
CREATE TRIGGER quote_initial AFTER INSERT ON records WHEN NEW.kind='quote' BEGIN INSERT INTO revisions(tenant_id,record_id,revision,data) VALUES(NEW.tenant_id,NEW.id,COALESCE(json_extract(NEW.data,'$.revision'),1),NEW.data); END;
CREATE TRIGGER quote_revision AFTER UPDATE ON records WHEN NEW.kind='quote' AND COALESCE(json_extract(NEW.data,'$.revision'),1)!=COALESCE(json_extract(OLD.data,'$.revision'),1) BEGIN INSERT INTO revisions(tenant_id,record_id,revision,data) VALUES(NEW.tenant_id,NEW.id,json_extract(NEW.data,'$.revision'),NEW.data); END;
CREATE TRIGGER revisions_immutable BEFORE UPDATE ON revisions BEGIN SELECT RAISE(ABORT,'immutable revision'); END;
CREATE TRIGGER revisions_no_delete BEFORE DELETE ON revisions BEGIN SELECT RAISE(ABORT,'immutable revision'); END;
CREATE TABLE mutations(tenant_id TEXT NOT NULL,record_id TEXT NOT NULL,expected_version INTEGER NOT NULL,PRIMARY KEY(tenant_id,record_id,expected_version));
CREATE TRIGGER mutation_guard BEFORE INSERT ON mutations BEGIN SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM records WHERE tenant_id=NEW.tenant_id AND id=NEW.record_id AND version=NEW.expected_version) THEN RAISE(ABORT,'stale version') END; END;
DROP TRIGGER action_state;
DROP TRIGGER action_version;
ALTER TABLE actions RENAME TO legacy_actions;
CREATE TABLE actions(tenant_id TEXT NOT NULL,record_id TEXT NOT NULL,action TEXT NOT NULL,actor TEXT NOT NULL,created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,expected_version INTEGER,revision INTEGER NOT NULL DEFAULT 1,note TEXT NOT NULL DEFAULT '',UNIQUE(tenant_id,record_id,action,expected_version),FOREIGN KEY(tenant_id,record_id) REFERENCES records(tenant_id,id));
INSERT INTO actions(tenant_id,record_id,action,actor,created,expected_version) SELECT tenant_id,record_id,action,actor,created,expected_version FROM legacy_actions;
DROP TABLE legacy_actions;
CREATE TRIGGER action_state BEFORE INSERT ON actions BEGIN
SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM records WHERE tenant_id=NEW.tenant_id AND id=NEW.record_id AND ((NEW.action='submit' AND json_extract(data,'$.status')='draft') OR (NEW.action='reject' AND json_extract(data,'$.status')='pending') OR (NEW.action='approve' AND json_extract(data,'$.status')='pending') OR (NEW.action='send' AND json_extract(data,'$.status')='approved') OR (NEW.action='order' AND json_extract(data,'$.status')='sent') OR (NEW.action='deliver' AND json_extract(data,'$.status')='confirmed'))) THEN RAISE(ABORT,'invalid transition') END;
END;
CREATE TRIGGER action_version BEFORE INSERT ON actions BEGIN
SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM records WHERE tenant_id=NEW.tenant_id AND id=NEW.record_id AND version=NEW.expected_version) THEN RAISE(ABORT,'stale version') END;
END;
