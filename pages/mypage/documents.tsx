import { useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { createSSRSupabaseClient } from '@/lib/supabaseServer'
import { getSupabaseClient } from '@/lib/supabase'
import MypageLayout from '@/components/MypageLayout'

interface Document {
  id: string
  file_name: string
  file_url: string
  file_type: string
  order_id: number
  building_address: string
  created_at: string
}

const FILE_ICON: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg':      '🖼️',
  'image/jpg':       '🖼️',
  'image/png':       '🖼️',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function DocumentsPage({ userEmail }: { userEmail?: string }) {
  const [docs, setDocs]         = useState<Document[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession()
        const headers: HeadersInit = session ? { Authorization: `Bearer ${session.access_token}` } : {}

        const res = await fetch('/api/orders/list', { headers })
        const data = await res.json()
        if (!res.ok) { setError(data.message ?? '불러오기 실패'); return }

        const allDocs: Document[] = (data.orders ?? []).flatMap((order: {
          id: number
          building_address: string
          documents: { id: string; file_name: string; file_url: string; file_type: string; created_at?: string }[]
          created_at: string
        }) =>
          order.documents.map(doc => ({
            ...doc,
            order_id: order.id,
            building_address: order.building_address,
            created_at: doc.created_at ?? order.created_at,
          }))
        )
        setDocs(allDocs)
      } catch {
        setError('네트워크 오류가 발생했습니다.')
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleDownload = async (docId: string, fileName: string) => {
    setDownloading(docId)
    try {
      const res = await fetch(`/api/documents/download-url?documentId=${docId}`)
      const data = await res.json()
      if (!res.ok) { alert(data.message); return }
      const a = document.createElement('a')
      a.href = data.downloadUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      alert('다운로드 중 오류가 발생했습니다.')
    }
    setDownloading(null)
  }

  return (
    <MypageLayout userEmail={userEmail}>
      <div style={s.container}>
        <div style={s.pageHeader}>
          <div>
            <Link href="/mypage" style={s.back}>← 마이페이지</Link>
            <h1 style={s.title}>문서 관리</h1>
            <p style={s.desc}>업로드하신 서류 목록입니다</p>
          </div>
        </div>

        {loading ? (
          <div style={s.center}>불러오는 중...</div>
        ) : error ? (
          <div style={s.center}>
            <p style={{ color: '#E53935', fontSize: 14 }}>{error}</p>
          </div>
        ) : docs.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyIcon}>📁</p>
            <p style={s.emptyText}>업로드된 서류가 없습니다.</p>
            <Link href="/mypage/new-order" style={s.emptyBtn}>의뢰 등록하기</Link>
          </div>
        ) : (
          <div style={s.list}>
            {docs.map(doc => (
              <div key={doc.id} style={s.card}>
                <span style={s.fileIcon}>{FILE_ICON[doc.file_type] ?? '📎'}</span>
                <div style={s.cardInfo}>
                  <p style={s.fileName}>{doc.file_name}</p>
                  <p style={s.fileMeta}>
                    {doc.building_address} · {formatDate(doc.created_at)}
                  </p>
                </div>
                <button
                  style={s.dlBtn}
                  disabled={downloading === doc.id}
                  onClick={() => handleDownload(doc.id, doc.file_name)}
                >
                  {downloading === doc.id ? '준비 중...' : '다운로드'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MypageLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  try {
    const supabase = createSSRSupabaseClient(ctx)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { redirect: { destination: '/login', permanent: false } }
    return { props: { userEmail: session.user.email ?? '' } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 860, margin: '0 auto', padding: '0 24px 80px' },
  pageHeader: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    padding: '40px 0 32px', gap: 16, flexWrap: 'wrap',
  },
  back:  { fontSize: 13, color: '#888', textDecoration: 'none', display: 'block', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 700, color: '#111', margin: '0 0 6px' },
  desc:  { fontSize: 14, color: '#999', margin: 0 },
  center: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: 200, gap: 16, fontSize: 14, color: '#999',
  },
  empty: {
    background: '#fff', borderRadius: 12, padding: '60px 24px',
    textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
  },
  emptyIcon: { fontSize: 48, margin: '0 0 12px' },
  emptyText: { fontSize: 15, color: '#aaa', marginBottom: 20 },
  emptyBtn: {
    display: 'inline-block', padding: '12px 28px',
    background: '#111', color: '#fff', borderRadius: 8,
    fontSize: 14, fontWeight: 600, textDecoration: 'none',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '16px 20px',
    background: '#fff', borderRadius: 12,
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
    border: '1px solid #f0f0f0',
  },
  fileIcon: { fontSize: 28, flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  fileName: {
    fontSize: 14, fontWeight: 600, color: '#111',
    margin: '0 0 4px',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  fileMeta: { fontSize: 12, color: '#aaa', margin: 0 },
  dlBtn: {
    padding: '8px 16px', background: '#fff',
    border: '1.5px solid #ddd', borderRadius: 8,
    fontSize: 13, fontWeight: 600, color: '#333',
    cursor: 'pointer', flexShrink: 0,
    whiteSpace: 'nowrap',
  },
}
