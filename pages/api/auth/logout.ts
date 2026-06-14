import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabaseRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] ?? ''

  const cookiesToClear = [
    'sb-access-token',
    'sb-refresh-token',
    `sb-${supabaseRef}-auth-token`,
    `sb-${supabaseRef}-auth-token.0`,
    `sb-${supabaseRef}-auth-token.1`,
    'supabase-auth-token',
  ]

  const expiredCookies = cookiesToClear.map(
    name => `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
  )

  res.setHeader('Set-Cookie', expiredCookies)
  res.writeHead(302, { Location: '/' })
  res.end()
}
