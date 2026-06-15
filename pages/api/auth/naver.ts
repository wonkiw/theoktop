import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = process.env.NAVER_CLIENT_ID
  const redirectUri = process.env.NAVER_REDIRECT_URI

  if (!clientId) {
    return res.status(500).json({
      error: 'NAVER_CLIENT_ID가 설정되지 않았습니다',
      env: Object.keys(process.env).filter(k => k.startsWith('NAVER')),
    })
  }

  const state = crypto.randomBytes(16).toString('hex')

  res.setHeader(
    'Set-Cookie',
    `naver_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
  )

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri || 'https://theoktop.com/api/auth/naver-callback',
    state,
  })

  res.redirect(`https://nid.naver.com/oauth2.0/authorize?${params}`)
}
