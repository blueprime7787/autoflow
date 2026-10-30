CREATE TABLE users(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','staff')),salt TEXT NOT NULL,hash TEXT NOT NULL);
CREATE TABLE sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE records(id TEXT NOT NULL,tenant_id TEXT NOT NULL,kind TEXT NOT NULL,data TEXT NOT NULL CHECK(json_valid(data)),version INTEGER NOT NULL DEFAULT 1,created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(tenant_id,id));
CREATE INDEX records_scope ON records(tenant_id,kind,created);
CREATE TABLE files(id TEXT NOT NULL,tenant_id TEXT NOT NULL,object_key TEXT UNIQUE NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,PRIMARY KEY(tenant_id,id));
CREATE TABLE actions(tenant_id TEXT NOT NULL,record_id TEXT NOT NULL,action TEXT NOT NULL,actor TEXT NOT NULL,created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(tenant_id,record_id,action),FOREIGN KEY(tenant_id,record_id) REFERENCES records(tenant_id,id));
CREATE TABLE audit(id INTEGER PRIMARY KEY AUTOINCREMENT,tenant_id TEXT NOT NULL,user_id TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE settings(tenant_id TEXT PRIMARY KEY,data TEXT NOT NULL CHECK(json_valid(data)));
