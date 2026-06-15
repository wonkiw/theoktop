// Load .env.local manually
const fs = require('fs')
const envPath = require('path').join(__dirname, '..', '.env.local')
fs.readFileSync(envPath, 'utf8').split('\n').forEach(function(line) {
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
  const tables = ['users', 'inquiries', 'inquiry_replies']
  for (const t of tables) {
    try {
      const r = await pool.query('SELECT COUNT(*) as count FROM ' + t)
      console.log(t + ': ' + r.rows[0].count + '건')
      if (t === 'users') {
        const u = await pool.query('SELECT id, email, name, role, provider FROM users LIMIT 5')
        console.log('users 샘플:', JSON.stringify(u.rows, null, 2))
      }
      if (t === 'inquiries') {
        const c = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position', ['inquiries'])
        console.log('inquiries 컬럼:', c.rows.map(function(x) { return x.column_name }).join(', '))
      }
    } catch(e) {
      console.log(t + ' 오류:', e.message)
    }
  }
  await pool.end()
}
main()
