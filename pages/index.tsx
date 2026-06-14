import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { createSSRSupabaseClient } from '@/lib/supabaseServer'
import { getPool } from '@/lib/db'
import { getSupabaseClient } from '@/lib/supabase'

export default function Home({ role, userEmail }: { role: string | null; userEmail: string | null }) {
  const router = useRouter()

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut()
    router.reload()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      {/* 상단 헤더 */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#fff', borderBottom: '1px solid #eee',
        padding: '0 32px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '3px', color: '#111' }}>
          THE OKTOP
        </span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {role ? (
            <>
              <a
                href="/mypage"
                style={{ padding: '7px 16px', background: '#111', color: '#fff', borderRadius: '6px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
              >
                마이페이지
              </a>
              <button
                onClick={handleLogout}
                style={{ padding: '7px 16px', background: 'none', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', color: '#555', cursor: 'pointer' }}
              >
                로그아웃
              </button>
            </>
          ) : (
            <a
              href="/login"
              style={{ padding: '7px 16px', background: '#111', color: '#fff', borderRadius: '6px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
            >
              로그인
            </a>
          )}
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: 2, color: '#111', marginBottom: 12 }}>THE OKTOP</h1>
          <p style={{ color: '#999', marginBottom: 32, fontSize: 14 }}>부동산 전문 상담 서비스</p>
          {role ? (
            <a
              href="/mypage"
              style={{ display: 'inline-block', padding: '13px 32px', background: '#111', color: '#fff', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}
            >
              마이페이지 바로가기
            </a>
          ) : (
            <a
              href="/login"
              style={{ display: 'inline-block', padding: '13px 32px', background: '#111', color: '#fff', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}
            >
              로그인
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps<{ role: string | null; userEmail: string | null }> = async (ctx) => {
  try {
    const supabase = createSSRSupabaseClient(ctx)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) return { props: { role: null, userEmail: null } }

    try {
      const client = await getPool().connect()
      try {
        const { rows } = await client.query(
          'SELECT role FROM users WHERE supabase_uid = $1',
          [session.user.id]
        )
        const role = rows[0]?.role ?? 'user'
        if (role === 'admin' || role === 'superadmin') {
          return { redirect: { destination: '/admin/dashboard', permanent: false } }
        }
        return { props: { role, userEmail: session.user.email ?? null } }
      } finally {
        client.release()
      }
    } catch (dbErr) {
      return { props: { role: 'user', userEmail: session.user.email ?? null } }
    }
  } catch (err) {
    return { props: { role: null, userEmail: null } }
  }
}
