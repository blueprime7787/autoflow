import sqlite3, pathlib, json
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON')
for p in sorted(pathlib.Path('migrations').glob('*.sql')): c.executescript(p.read_text(encoding='utf-8'))
def insert(id,t,k,d):c.execute('INSERT INTO records(id,tenant_id,kind,data) VALUES(?,?,?,?)',(id,t,k,json.dumps(d)))
def blocked(fn):
 try:fn()
 except sqlite3.IntegrityError:return
 raise AssertionError('expected constraint failure')
insert('c','a','customer',{'name':'A'});blocked(lambda:insert('q','b','quote',{'customerId':'c'}));print('PASS cross-tenant DB reference')
insert('q','a','quote',{'customerId':'c','status':'pending'});c.commit()
blocked(lambda:c.execute("INSERT INTO actions(tenant_id,record_id,action,actor,expected_version) VALUES('a','q','approve','x',0)"));print('PASS stale version DB guard')
insert('o','a','order',{'total':100});insert('r1','a','receipt',{'orderId':'o','amount':80,'status':'confirmed'});insert('r2','a','receipt',{'orderId':'o','amount':50,'status':'pending'});c.commit()
blocked(lambda:c.execute("UPDATE records SET data=json_set(data,'$.status','confirmed') WHERE id='r2'"));print('PASS payment aggregate DB guard')
blocked(lambda:insert('bad','a','receipt',{'orderId':'missing','amount':1}));print('PASS missing order DB reference')
blocked(lambda:insert('neg','a','receipt',{'orderId':'o','amount':-1}));print('PASS negative receipt DB guard')

blocked(lambda:c.execute("UPDATE revisions SET data='{}'"));print('PASS immutable quote revisions')
blocked(lambda:c.execute("DELETE FROM revisions"));print('PASS quote revision deletion blocked')
c.execute("INSERT INTO users(id,tenant_id,email,name,role,salt,hash) VALUES('u','a','u@test.invalid','u','admin','salt','hash')")
blocked(lambda:c.execute("UPDATE users SET role='staff' WHERE id='u'"));print('PASS last administrator DB guard')
c.execute("INSERT INTO sessions VALUES('session','u',9999999999999)")
c.execute("UPDATE users SET hash='newhash' WHERE id='u'")
assert c.execute('SELECT count(*) FROM sessions').fetchone()[0]==0
print('PASS credential change revokes sessions in DB')
