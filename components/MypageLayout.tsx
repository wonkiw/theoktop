import Link from 'next/link'
import { useRouter } from 'next/router'
import { getSupabaseClient } from '@/lib/supabase'

export default function MypageLayout({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail?: string
}) {
  const router = useRouter()

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut()
    router.push('/')
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
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#555',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 500,
        }}>
          ← 메인으로
        </Link>

        <span style={{
          fontSize: '16px',
          fontWeight: 700,
          letterSpacing: '2px',
          color: '#111',
        }}>
          THE OKTOP
        </span>

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
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {children}
      </main>
    </div>
  )
}
