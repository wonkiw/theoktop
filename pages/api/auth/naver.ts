import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = process.env.NAVER_CLIENT_ID
  const redirectUri =
    process.env.NAVER_REDIRECT_URI || 'https://theoktop.com/api/auth/naver-callback'

  if (req.query.debug === '1') {
    return res.status(200).json({
      clientId: clientId ? clientId.substring(0, 4) + '...' : 'NOT SET',
      redirectUri,
      keys: Object.keys(process.env).filter(k => k.startsWith('NAVER')),
    })
  }

  if (!clientId) {
    return res.redirect('/login?error=naver_config_missing')
  }

  const state = crypto.randomBytes(16).toString('hex')

  res.setHeader(
    'Set-Cookie',
    `naver_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
  )

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  })

  res.redirect(`https://nid.naver.com/oauth2.0/authorize?${params}`)
}
