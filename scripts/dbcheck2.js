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
  const cols = await pool.query(
    'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1',
    ['inquiries']
  )
  console.log('inquiries schema:')
  cols.rows.forEach(function(r) { console.log(' ', r.column_name, ':', r.data_type) })

  const rows = await pool.query('SELECT * FROM inquiries LIMIT 2')
  console.log('inquiries 데이터:', JSON.stringify(rows.rows, null, 2))

  await pool.end()
}
main().catch(function(e) { console.error(e.message); process.exit(1) })
