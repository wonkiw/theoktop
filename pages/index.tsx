import type { GetServerSideProps } from 'next'
import { createSSRSupabaseClient } from '../lib/supabaseServer'
import { getPool } from '../lib/db'

export default function Home({ error }: { error?: boolean }) {
  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f7f8fa' }}>
        <div style={{ textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#333', marginBottom: 8 }}>서버 오류가 발생했습니다</h2>
          <p style={{ color: '#999', marginBottom: 20 }}>잠시 후 다시 시도해주세요</p>
          <a href="/login" style={{ color: '#111', fontWeight: 600 }}>로그인</a>
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f7f8fa' }}>
      <p style={{ color: '#999', fontSize: 14, fontFamily: 'sans-serif' }}>이동 중...</p>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps<{ error?: boolean }> = async (ctx) => {
  try {
    const supabase = createSSRSupabaseClient(ctx)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return { redirect: { destination: '/login', permanent: false } }
    }

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
      return { redirect: { destination: '/mypage', permanent: false } }
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('[index] error:', err)
    return { props: { error: true } }
  }
}
