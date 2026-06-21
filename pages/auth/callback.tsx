import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSupabaseClient } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = getSupabaseClient()

      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Auth callback error:', error)
        router.replace('/login?error=auth_failed')
        return
      }

      if (data.session) {
        try {
          const { user } = data.session
          const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.user_metadata?.preferred_username ||
            ''
          const provider = user.app_metadata?.provider || 'oauth'

          const syncRes = await fetch('/api/auth/sync-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({
              supabase_uid: user.id,
              email: user.email || '',
              name,
              provider,
            }),
          })

          if (syncRes.status === 409) {
            const syncData = await syncRes.json()
            if (syncData.withdrawn) {
              router.replace(
                `/register?from=rejoin&email=${encodeURIComponent(user.email || '')}&name=${encodeURIComponent(name)}`
              )
              return
            }
          }
        } catch (err) {
          console.error('Sync user error:', err)
        }

        const meRes = await fetch('/api/auth/me')
        if (meRes.ok) {
          const me = await meRes.json()
          if (me.role === 'admin' || me.role === 'superadmin') {
            router.replace('/admin/dashboard')
          } else {
            router.replace('/mypage')
          }
        } else {
          router.replace('/mypage')
        }
      } else {
        router.replace('/login?error=no_session')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#D4AF37',
      fontSize: '16px',
      fontFamily: 'sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '16px', fontSize: '24px' }}>⟳</div>
        <div>로그인 처리 중...</div>
      </div>
    </div>
  )
}
