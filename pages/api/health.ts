import type { NextApiRequest, NextApiResponse } from 'next'
import { Pool } from 'pg'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const envVars = {
    DATABASE_HOST: process.env.DATABASE_HOST || 'NOT_SET',
    DATABASE_NAME: process.env.DATABASE_NAME || 'NOT_SET',
    DATABASE_USER: process.env.DATABASE_USER || 'NOT_SET',
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD ? 'SET' : 'NOT_SET',
    DATABASE_PORT: process.env.DATABASE_PORT || 'NOT_SET',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT_SET',
    NAVER_MAP_KEY: process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'NOT_SET',
    ALL_DB_KEYS: Object.keys(process.env).filter(k =>
      k.startsWith('DATABASE') ||
      k.startsWith('NEXT_PUBLIC') ||
      k.startsWith('NAVER')
    ),
  }

  let dbConnected = false
  let dbError = null

  try {
    const pool = new Pool({
      host: process.env.DATABASE_HOST,
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      port: Number(process.env.DATABASE_PORT) || 5432,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    })
    await pool.query('SELECT 1')
    dbConnected = true
    await pool.end()
  } catch (err: any) {
    dbError = err.message
  }

  res.status(200).json({
    timestamp: new Date().toISOString(),
    envVars,
    dbConnected,
    dbError
  })
}
