import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '@/lib/supabaseServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createApiSupabaseClient(req, res)
    await supabase.auth.signOut()
  } catch (err) {
    console.error('[logout]', err)
  }
  res.redirect(302, '/')
}
