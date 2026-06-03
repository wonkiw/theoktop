import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const state = crypto.randomBytes(16).toString('hex')
  const isProduction = process.env.NODE_ENV === 'production'

  res.setHeader(
    'Set-Cookie',
    `naver_oauth_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax${isProduction ? '; Secure' : ''}`
  )

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NAVER_CLIENT_ID!,
    redirect_uri: process.env.NAVER_REDIRECT_URI!,
    state,
  })

  return res.redirect(`https://nid.naver.com/oauth2.0/authorize?${params}`)
}
