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
  // 기존 email unique 제약 확인
  const constraints = await pool.query(`
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'users'
      AND constraint_type = 'UNIQUE'
  `)
  console.log('기존 UNIQUE 제약:', constraints.rows.map(r => r.constraint_name).join(', ') || '없음')

  // 기존 unique 제약 제거
  await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`)
  console.log('users_email_key 제거 완료')

  // active 회원에게만 email unique 적용 (partial unique index)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_active_unique
    ON users (email)
    WHERE status = 'active' OR status IS NULL
  `)
  console.log('partial unique index 생성 완료 (active/null 상태만 적용)')

  // 결과 확인
  const indexes = await pool.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'users' AND indexname LIKE '%email%'
  `)
  console.log('\n이메일 관련 인덱스:')
  indexes.rows.forEach(r => console.log(' ', r.indexname, '-', r.indexdef))

  await pool.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
