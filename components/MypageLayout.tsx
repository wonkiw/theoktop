import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import PremiumBadge from './PremiumBadge'

export default function MypageLayout({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail?: string
}) {
  const [userName, setUserName] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          setUserName(data.name)
          setIsPremium(data.membership_tier === 'premium')
        })
        .catch(() => {})
    })
  }, [])

  const handleLogout = () => {
    window.location.href = '/api/auth/logout'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#fff',
        borderBottom: '1px solid #eee',
        padding: '0 24px',
        height: '112px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <a href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#555',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 500,
        }}>
          ← 메인으로
        </a>

        <img src="/logo-light.png" alt="THE OKTOP" style={{ height: '56px', width: 'auto' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {userName && (
            <span style={{ fontSize: '13px', color: '#555' }}>
              {userName}님 {isPremium && <PremiumBadge />}
            </span>
          )}
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '13px',
              color: '#555',
              cursor: 'pointer',
            }}
          >
            로그아웃
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {children}
      </main>
    </div>
  )
}
