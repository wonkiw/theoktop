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

const SEED = [
  ['privacy_policy', '(내용 미등록)'],
  ['terms_of_service', '(내용 미등록)'],
  ['contact_phone', '010-7300-3509'],
  ['contact_email', 'hanielkim@naver.com'],
  ['sns_instagram', 'https://www.instagram.com/the.oktop/'],
  ['sns_youtube', 'https://www.youtube.com/channel/UC_fEEvFzdqO20bZfmaMA_eQ'],
  ['sns_message', 'cs@theoktop.com'],
]

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)
  console.log('site_settings 테이블 준비 완료')

  for (const [key, value] of SEED) {
    await pool.query(
      `INSERT INTO site_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      [key, value]
    )
  }
  console.log('초기 데이터 삽입 완료 (기존 값은 보존됨)')

  const { rows } = await pool.query('SELECT key, value, updated_at FROM site_settings ORDER BY key')
  console.log('\n현재 site_settings:')
  rows.forEach(r => console.log(' ', r.key, '=', r.value))

  await pool.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
