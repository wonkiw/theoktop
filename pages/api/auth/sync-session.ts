import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '../../../lib/supabaseServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' })
  }

  const { access_token, refresh_token } = req.body
  if (!access_token || !refresh_token) {
    return res.status(400).json({ success: false, message: '토큰이 필요합니다.' })
  }

  const supabase = createApiSupabaseClient(req, res)
  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })

  if (error || !data.session) {
    return res.status(401).json({ success: false, message: '세션 설정에 실패했습니다.' })
  }

  return res.status(200).json({ success: true })
}
