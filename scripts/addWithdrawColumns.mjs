import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// .env.local 직접 파싱
const envPath = resolve(process.cwd(), '.env.local')
const envText = readFileSync(envPath, 'utf8')
for (const line of envText.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx < 0) continue
  const key = trimmed.slice(0, idx).trim()
  const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
  if (!process.env[key]) process.env[key] = val
}

const pool = new pg.Pool({
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  port: Number(process.env.DATABASE_PORT) || 5432,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const cols = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `)
  console.log('현재 컬럼:')
  cols.rows.forEach(c => console.log(' ', c.column_name + ': ' + c.data_type))

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS withdraw_reason TEXT
  `)
  console.log('\n컬럼 추가 완료')

  try {
    await pool.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_status_check
      CHECK (status IN ('active', 'withdrawn'))
    `)
    console.log('CHECK constraint 추가 완료')
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('CHECK constraint 이미 존재')
    } else {
      throw e
    }
  }

  const cols2 = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `)
  console.log('\n최종 컬럼:')
  cols2.rows.forEach(c => console.log(' ', c.column_name + ': ' + c.data_type))

  await pool.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
