import psycopg2
import uuid
from datetime import datetime

conn = psycopg2.connect(
    host="theoktop-db.cluster-cngm6kk6grax.ap-northeast-2.rds.amazonaws.com",
    port=5432,
    dbname="theoktop-db",
    user="theoktop_admin",
    password="hs3509^^",
    connect_timeout=30,
)
conn.autocommit = False
cur = conn.cursor()

# users
cur.execute("""
CREATE TABLE IF NOT EXISTS users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      VARCHAR(255) NOT NULL UNIQUE,
    name       VARCHAR(100),
    phone      VARCHAR(30),
    role       VARCHAR(20) NOT NULL DEFAULT 'user'
                   CHECK (role IN ('superadmin', 'admin', 'user')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
""")

# pages
cur.execute("""
CREATE TABLE IF NOT EXISTS pages (
    id         SERIAL PRIMARY KEY,
    slug       VARCHAR(255) NOT NULL UNIQUE,
    title      VARCHAR(255),
    content    TEXT,
    image_url  TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);
""")

# inquiries
cur.execute("""
CREATE TABLE IF NOT EXISTS inquiries (
    id         SERIAL PRIMARY KEY,
    user_id    UUID REFERENCES users(id),
    title      VARCHAR(255),
    content    TEXT,
    answer     TEXT,
    status     VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'answered')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
""")

# superadmin 계정 insert
cur.execute("""
INSERT INTO users (id, email, name, role)
VALUES (%s, %s, %s, %s)
ON CONFLICT (email) DO UPDATE
    SET role = 'superadmin';
""", (str(uuid.uuid4()), "wonki8899@gmail.com", "관리자", "superadmin"))

conn.commit()
print("완료: 테이블 생성 및 superadmin 계정 등록 성공")

cur.execute("SELECT id, email, role, created_at FROM users WHERE email = 'wonki8899@gmail.com';")
row = cur.fetchone()
print(f"  ID: {row[0]}")
print(f"  Email: {row[1]}")
print(f"  Role: {row[2]}")
print(f"  Created: {row[3]}")

cur.close()
conn.close()
