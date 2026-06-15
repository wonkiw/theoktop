const fs = require('fs'), path = require('path')
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
env.split('\n').forEach(function(line) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
})
const { Pool } = require('pg')
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  ssl: { rejectUnauthorized: false }
})
async function main() {
  // 1. inquiries 테이블에 신규 컬럼 추가
  const alterStmts = [
    'ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS building_address TEXT',
    'ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS inquiry_type VARCHAR(100)',
    'ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()',
    'ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS answered_at TIMESTAMP',
  ]
  for (const sql of alterStmts) {
    try {
      await pool.query(sql)
      console.log('OK:', sql.substring(0, 60))
    } catch(e) {
      console.log('SKIP:', e.message)
    }
  }

  // 2. inquiry_replies 테이블 생성 (inquiries.id가 INTEGER이므로 FK도 INTEGER)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inquiry_replies (
      id SERIAL PRIMARY KEY,
      inquiry_id INTEGER REFERENCES inquiries(id) ON DELETE CASCADE,
      author_id UUID REFERENCES users(id),
      author_role VARCHAR(20),
      content TEXT NOT NULL DEFAULT '',
      file_url TEXT,
      file_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  console.log('OK: CREATE TABLE inquiry_replies')

  // 3. 결과 확인
  const cols = await pool.query(
    'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1',
    ['inquiries']
  )
  console.log('\ninquiries 최종 컬럼:')
  cols.rows.forEach(function(r) { console.log(' ', r.column_name, ':', r.data_type) })

  const rep = await pool.query(
    'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
    ['inquiry_replies']
  )
  console.log('\ninquiry_replies 컬럼:', rep.rows.map(function(r) { return r.column_name }).join(', '))

  await pool.end()
  console.log('\n마이그레이션 완료')
}
main().catch(function(e) { console.error('ERROR:', e.message); process.exit(1) })
