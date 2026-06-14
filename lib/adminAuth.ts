import { supabaseAdmin } from './supabaseServer'
import { getPool } from './db'

export interface AdminUser {
  id: number
  role: 'admin' | 'superadmin'
  name: string
  email: string
}

export async function requireAdmin(authHeader: string | undefined): Promise<AdminUser | null> {
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const { rows } = await getPool().query(
    'SELECT id, role, name, email FROM users WHERE supabase_uid = $1',
    [user.id]
  )
  if (!rows.length || !['admin', 'superadmin'].includes(rows[0].role)) return null

  return rows[0] as AdminUser
}
