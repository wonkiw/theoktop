import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient, supabaseAdmin } from '../../../lib/supabaseServer'
import { pool } from '../../../lib/db'

async function getUid(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (user) return user.id
  }
  const supabase = createApiSupabaseClient(req, res)
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user.id ?? null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' })
  }

  const uid = await getUid(req, res)
  if (!uid) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })
  }

  const client = await pool.connect()
  try {
    let { rows: userRows } = await client.query(
      'SELECT id FROM users WHERE supabase_uid = $1',
      [uid]
    )
    // DB에 유저가 없으면 자동 생성 (OAuth/소셜 로그인 후 콜백이 누락된 경우 복구)
    if (userRows.length === 0) {
      const { data: { user: sbUser } } = await supabaseAdmin.auth.admin.getUserById(uid)
        .catch(() => ({ data: { user: null } }))
      if (sbUser) {
        const email = sbUser.email ?? ''
        const name  = sbUser.user_metadata?.full_name ?? sbUser.user_metadata?.name ?? email
        const { rows: inserted } = await client.query(
          `INSERT INTO users (supabase_uid, email, name, role, provider)
           VALUES ($1, $2, $3, 'user', $4)
           ON CONFLICT (supabase_uid) DO UPDATE SET updated_at = NOW()
           RETURNING id`,
          [sbUser.id, email, name, sbUser.app_metadata?.provider ?? 'email']
        )
        userRows = inserted
      } else {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' })
      }
    }

    const { rows } = await client.query(
      `SELECT
         o.id, o.building_address, o.building_detail,
         o.order_type, o.description, o.status, o.created_at,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT(
               'id',        d.id,
               'file_name', d.file_name,
               'file_url',  d.file_url,
               'file_type', d.file_type
             )
           ) FILTER (WHERE d.id IS NOT NULL),
           '[]'
         ) AS documents
       FROM orders o
       LEFT JOIN documents d ON d.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userRows[0].id]
    )

    return res.status(200).json({ success: true, orders: rows })
  } catch (err) {
    console.error('의뢰 목록 조회 실패:', err)
    return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
  } finally {
    client.release()
  }
}
