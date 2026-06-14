import { useRouter } from 'next/router'
import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { createSSRSupabaseClient } from '../../../lib/supabaseServer'
import { getPool } from '../../../lib/db'
import Header from '../../../components/Header'

interface InquiryItem {
  id: number
  title: string
  inquiry_type: string | null
  building_address: string | null
  status: 'pending' | 'reviewing' | 'completed'
  created_at: string
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: '대기중', bg: '#FFF8E1', color: '#F57F17' },
  reviewing: { label: '검토중', bg: '#E3F2FD', color: '#1565C0' },
  completed: { label: '완료',   bg: '#E8F5E9', color: '#2E7D32' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function InquiriesIndex({ inquiries }: { inquiries: InquiryItem[] }) {
  const router = useRouter()

  return (
    <div style={s.page}>
      <Header />
      <div style={s.container}>

        <div style={s.pageHeader}>
          <div>
            <Link href="/mypage" style={s.back}>← 마이페이지</Link>
            <h1 style={s.title}>상담 내역</h1>
            <p style={s.desc}>접수하신 상담 내역을 확인하세요</p>
          </div>
          <Link href="/mypage/new-inquiry" style={s.newBtn}>+ 새 상담 신청</Link>
        </div>

        {inquiries.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyText}>아직 상담 신청이 없습니다.</p>
            <Link href="/mypage/new-inquiry" style={s.emptyBtn}>첫 상담 신청하기</Link>
          </div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['상담유형', '건물주소 / 제목', '접수일', '상태'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inquiries.map(inq => {
                  const st = STATUS_MAP[inq.status] ?? STATUS_MAP.pending
                  return (
                    <tr
                      key={inq.id}
                      style={s.tr}
                      onClick={() => router.push(`/mypage/inquiries/${inq.id}`)}
                    >
                      <td style={{ ...s.td, color: '#666' }}>
                        {inq.inquiry_type ?? '일반'}
                      </td>
                      <td style={{ ...s.td, fontWeight: 600, color: '#111' }}>
                        {inq.building_address ?? inq.title}
                      </td>
                      <td style={{ ...s.td, color: '#888', whiteSpace: 'nowrap' }}>
                        {formatDate(inq.created_at)}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  try {
    const supabase = createSSRSupabaseClient(ctx)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { redirect: { destination: '/login?redirect=/mypage/inquiries', permanent: false } }
    }

    const client = await getPool().connect()
    try {
      const { rows: userRows } = await client.query(
        'SELECT id FROM users WHERE supabase_uid = $1',
        [session.user.id]
      )
      if (!userRows.length) return { redirect: { destination: '/login', permanent: false } }

      const { rows } = await client.query(
        `SELECT id, title, inquiry_type, building_address, status, created_at
         FROM inquiries
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userRows[0].id]
      )
      return { props: { inquiries: JSON.parse(JSON.stringify(rows)) } }
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('[mypage/inquiries] getServerSideProps error:', err)
    return { props: { inquiries: [] } }
  }
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f7f8fa',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  container: { maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' },

  pageHeader: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    padding: '40px 0 32px', gap: 16, flexWrap: 'wrap',
  },
  back:  { fontSize: 13, color: '#888', textDecoration: 'none', display: 'block', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 700, color: '#111', margin: '0 0 6px' },
  desc:  { fontSize: 14, color: '#999', margin: 0 },
  newBtn: {
    padding: '11px 22px',
    background: '#111', color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
  },

  tableWrap: {
    background: '#fff', borderRadius: 12, overflow: 'hidden',
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: {
    padding: '13px 20px', textAlign: 'left' as const,
    fontSize: 12, fontWeight: 600, color: '#888',
    borderBottom: '1px solid #f0f0f0', background: '#fafafa',
  },
  td: { padding: '16px 20px', fontSize: 14, color: '#333', borderBottom: '1px solid #f5f5f5' },
  tr: { background: '#fff', cursor: 'pointer', transition: 'background 0.1s' },
  badge: {
    display: 'inline-block', padding: '4px 12px',
    borderRadius: 20, fontSize: 12, fontWeight: 600,
  },

  empty: {
    background: '#fff', borderRadius: 12, padding: '60px 24px',
    textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
    marginTop: 8,
  },
  emptyText: { fontSize: 15, color: '#aaa', marginBottom: 20 },
  emptyBtn: {
    display: 'inline-block', padding: '12px 28px',
    background: '#111', color: '#fff', borderRadius: 8,
    fontSize: 14, fontWeight: 600, textDecoration: 'none',
  },
}
