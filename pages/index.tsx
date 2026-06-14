import type { GetServerSideProps } from 'next'
import { createSSRSupabaseClient } from '../lib/supabaseServer'
import { pool } from '../lib/db'

export default function Home() {
  return null
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createSSRSupabaseClient(ctx)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } }
  }

  const client = await pool.connect()
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
}
