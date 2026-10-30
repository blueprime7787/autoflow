CREATE TABLE bootstrap_lock(id INTEGER PRIMARY KEY CHECK(id=1));
CREATE TRIGGER bootstrap_once BEFORE INSERT ON bootstrap_lock BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM users) THEN RAISE(ABORT,'bootstrap already initialized') END;
END;
INSERT INTO bootstrap_lock(id) SELECT 1 WHERE EXISTS(SELECT 1 FROM users);
