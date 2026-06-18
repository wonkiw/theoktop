import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envText = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
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
  // 현재 inquiries 컬럼 및 제약 확인
  const cols = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'inquiries'
    ORDER BY ordinal_position
  `)
  console.log('inquiries 컬럼:')
  cols.rows.forEach(c => console.log(' ', c.column_name + ': ' + c.data_type))

  const constraints = await pool.query(`
    SELECT constraint_name, check_clause
    FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%inquiries%'
  `)
  console.log('\n현재 CHECK 제약:')
  constraints.rows.forEach(c => console.log(' ', c.constraint_name, ':', c.check_clause))

  // 기존 status check 제거 후 재생성
  await pool.query(`ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_status_check`)
  await pool.query(`
    ALTER TABLE inquiries
    ADD CONSTRAINT inquiries_status_check
    CHECK (status IN ('pending', 'reviewing', 'completed', 'cancelled'))
  `)
  console.log('\ninquiries_status_check 제약 재생성 완료: pending, reviewing, completed, cancelled')

  // orders 테이블 컬럼 확인
  const orderCols = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'orders'
    ORDER BY ordinal_position
  `)
  console.log('\norders 컬럼:')
  orderCols.rows.forEach(c => console.log(' ', c.column_name + ': ' + c.data_type))

  await pool.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
