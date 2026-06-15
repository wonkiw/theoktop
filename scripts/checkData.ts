import { getPool } from '../lib/db'

async function checkData() {
  const pool = getPool()

  const tables = ['users', 'inquiries', 'inquiry_replies']

  for (const table of tables) {
    try {
      const { rows } = await pool.query(
        `SELECT COUNT(*) as count FROM ${table}`
      )
      console.log(`${table}: ${rows[0].count}건`)

      if (table === 'users') {
        const { rows: users } = await pool.query(
          'SELECT id, email, name, role, provider, supabase_uid FROM users LIMIT 5'
        )
        console.log('users 샘플:', JSON.stringify(users, null, 2))
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.log(`${table} 오류:`, message)
    }
  }

  process.exit(0)
}

checkData()
