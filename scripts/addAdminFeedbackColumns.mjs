import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

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
  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS admin_feedback TEXT,
    ADD COLUMN IF NOT EXISTS admin_feedback_at TIMESTAMP
  `)
  console.log('admin_feedback, admin_feedback_at 컬럼 추가 완료')

  const cols = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'orders'
    ORDER BY ordinal_position
  `)
  console.log('\norders 현재 컬럼:')
  cols.rows.forEach(c => console.log(' ', c.column_name + ': ' + c.data_type))

  await pool.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
