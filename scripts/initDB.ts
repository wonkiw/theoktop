import { getPool } from '../lib/db'

const tables: { sql: string; name: string }[] = [
  {
    name: 'users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        supabase_uid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100),
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'user'
          CHECK (role IN ('superadmin', 'admin', 'user')),
        provider VARCHAR(50) DEFAULT 'email',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    name: 'orders',
    sql: `
      CREATE TABLE IF NOT EXISTS orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        building_address TEXT NOT NULL,
        building_detail TEXT,
        order_type VARCHAR(100),
        description TEXT,
        status VARCHAR(30) DEFAULT 'pending'
          CHECK (status IN ('pending', 'reviewing', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    name: 'documents',
    sql: `
      CREATE TABLE IF NOT EXISTS documents (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id UUID REFERENCES orders(id),
        user_id UUID REFERENCES users(id),
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(50),
        uploaded_at TIMESTAMP DEFAULT NOW()
      );
    `,
  },
]

async function initDB() {
  const client = await getPool().connect()
  try {
    for (const table of tables) {
      await client.query(table.sql)
      console.log(`${table.name} 테이블 생성 완료`)
    }
    console.log('\n모든 테이블 생성 완료')
  } catch (err) {
    console.error('테이블 생성 실패:', err)
    process.exit(1)
  } finally {
    client.release()
    await getPool().end()
  }
}

initDB()
