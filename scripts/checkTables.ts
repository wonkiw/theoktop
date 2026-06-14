/**
 * RDS theoktop DB 테이블 확인 스크립트
 * 실행: npx ts-node -P tsconfig.json scripts/checkTables.ts
 */
import { getPool } from '../lib/db'
import type { PoolClient } from 'pg'

const TABLES = ['inquiries', 'inquiry_replies'] as const

const CREATE_SQL: Record<typeof TABLES[number], string> = {
  inquiries: `
    CREATE TABLE IF NOT EXISTS inquiries (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER NOT NULL REFERENCES users(id),
      title            VARCHAR(255) NOT NULL,
      content          TEXT NOT NULL,
      inquiry_type     VARCHAR(100),
      building_address VARCHAR(255),
      answer           TEXT,
      status           VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      answered_at      TIMESTAMP WITH TIME ZONE,
      answered_by      INTEGER REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON inquiries(user_id);
    CREATE INDEX IF NOT EXISTS idx_inquiries_status  ON inquiries(status);
  `,
  inquiry_replies: `
    CREATE TABLE IF NOT EXISTS inquiry_replies (
      id           SERIAL PRIMARY KEY,
      inquiry_id   INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
      user_id      INTEGER REFERENCES users(id),
      content      TEXT NOT NULL,
      is_admin     BOOLEAN NOT NULL DEFAULT FALSE,
      file_url     TEXT,
      file_name    VARCHAR(255),
      file_key     VARCHAR(500),
      created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_inquiry_replies_inquiry_id ON inquiry_replies(inquiry_id);
  `,
}

const EXTRA_COLUMNS: { table: 'inquiries'; column: string; definition: string }[] = [
  { table: 'inquiries', column: 'inquiry_type',     definition: 'VARCHAR(100)' },
  { table: 'inquiries', column: 'building_address', definition: 'VARCHAR(255)' },
]

async function tableExists(client: PoolClient, name: string): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     )`,
    [name]
  )
  return rows[0].exists
}

async function columnExists(client: PoolClient, table: string, column: string): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT EXISTS (
       SELECT FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     )`,
    [table, column]
  )
  return rows[0].exists
}

async function main() {
  console.log('=== theoktop DB 테이블 확인 ===\n')
  const client = await getPool().connect()
  try {
    for (const table of TABLES) {
      const exists = await tableExists(client, table)
      if (exists) {
        console.log(`✅  ${table} 테이블 존재`)
      } else {
        console.log(`❌  ${table} 테이블 없음 → 생성 중...`)
        await client.query(CREATE_SQL[table])
        console.log(`✅  ${table} 테이블 생성 완료`)
      }
    }

    console.log('')
    for (const { table, column, definition } of EXTRA_COLUMNS) {
      const exists = await columnExists(client, table, column)
      if (exists) {
        console.log(`✅  ${table}.${column} 컬럼 존재`)
      } else {
        console.log(`⚠️   ${table}.${column} 컬럼 없음 → 추가 중...`)
        await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`)
        console.log(`✅  ${table}.${column} 컬럼 추가 완료`)
      }
    }

    console.log('\n모든 테이블·컬럼 확인 완료.')
  } finally {
    client.release()
    await getPool().end()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
