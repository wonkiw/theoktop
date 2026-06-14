import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const checks = {
    supabaseUrl:  !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey:  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    dbHost:       !!process.env.DATABASE_HOST,
    dbName:       !!process.env.DATABASE_NAME,
    dbUser:       !!process.env.DATABASE_USER,
    dbPassword:   !!process.env.DATABASE_PASSWORD,
  }

  let dbConnected = false
  let dbError: string | null = null
  try {
    const { Pool } = await import('pg')
    const testPool = new Pool({
      host:     process.env.DATABASE_HOST,
      database: process.env.DATABASE_NAME,
      user:     process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      port:     Number(process.env.DATABASE_PORT) || 5432,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    })
    await testPool.query('SELECT 1')
    dbConnected = true
    await testPool.end()
  } catch (err: unknown) {
    dbError = err instanceof Error ? err.message : String(err)
  }

  res.status(200).json({ checks, dbConnected, dbError })
}
