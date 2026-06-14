import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

interface Inquiry {
  id: number
  title: string
  content: string
  answer: string | null
  status: 'pending' | 'answered'
  created_at: string
  answered_at: string | null
  customer_name: string
  customer_email: string
}

const TABS = [
  { key: 'pending',  label: '미답변' },
  { key: 'answered', label: '답변완료' },
  { key: 'all',      label: '전체' },
]

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

/* ── Toast ── */
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      background: type === 'success' ? '#1a1a1a' : '#C62828',
      color: '#fff', padding: '12px 24px', borderRadius: 8,
      fontSize: 14, fontWeight: 500, zIndex: 9999,
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  )
}

/* ── Modal ── */
function InquiryModal({
  inquiry,
  token,
  onClose,
  onReplied,
}: {
  inquiry: Inquiry
  token: string
  onClose: () => void
  onReplied: (id: number) => void
}) {
  const [answer, setAnswer]     = useState(inquiry.answer ?? '')
  const [sending, setSending]   = useState(false)
  const [toast, setToast]       = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const isPending               = inquiry.status === 'pending'

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleReply = async () => {
    if (!answer.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/inquiries/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inquiry_id: inquiry.id, answer }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(data.emailSent ? '답변이 발송되었습니다.' : '저장되었으나 이메일 발송에 실패했습니다.', data.emailSent ? 'success' : 'error')
        setTimeout(() => { onReplied(inquiry.id); onClose() }, 1500)
      } else {
        showToast(data.message ?? '발송에 실패했습니다.', 'error')
      }
    } catch {
      showToast('네트워크 오류가 발생했습니다.', 'error')
    }
    setSending(false)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }}
      />

      <div style={ms.panel}>
        <div style={ms.header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{
                ...ms.statusBadge,
                background: isPending ? '#FFF8E1' : '#E8F5E9',
                color:      isPending ? '#F57F17' : '#2E7D32',
              }}>
                {isPending ? '미답변' : '답변완료'}
              </span>
              <span style={ms.idText}>#{inquiry.id}</span>
            </div>
            <h2 style={ms.title} title={inquiry.title}>{inquiry.title}</h2>
            <p style={ms.meta}>
              {inquiry.customer_name} &middot; {inquiry.customer_email} &middot; {formatDateTime(inquiry.created_at)}
            </p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <div style={ms.body}>
          <section style={ms.section}>
            <p style={ms.sectionLabel}>문의 내용</p>
            <div style={ms.contentBox}>{inquiry.content}</div>
          </section>

          <section style={ms.section}>
            <p style={ms.sectionLabel}>
              {isPending ? '답변 작성' : '등록된 답변'}
              {!isPending && inquiry.answered_at && (
                <span style={{ fontWeight: 400, color: '#aaa', marginLeft: 8 }}>
                  {formatDateTime(inquiry.answered_at)}
                </span>
              )}
            </p>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              readOnly={!isPending}
              placeholder={isPending ? '고객에게 전달할 답변을 입력하세요.' : ''}
              style={{
                ...ms.textarea,
                background:  isPending ? '#fff' : '#fafafa',
                color:       isPending ? '#222' : '#555',
                cursor:      isPending ? 'text' : 'default',
                borderColor: isPending ? '#e0e0e0' : '#f0f0f0',
              }}
              rows={8}
            />
          </section>
        </div>

        {isPending && (
          <div style={ms.footer}>
            <p style={ms.emailNote}>
              발송 시 <strong>{inquiry.customer_email}</strong>로 이메일이 전송됩니다.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={ms.btnCancel} onClick={onClose}>취소</button>
              <button
                style={{
                  ...ms.btnSend,
                  opacity: (!answer.trim() || sending) ? 0.5 : 1,
                  cursor:  (!answer.trim() || sending) ? 'not-allowed' : 'pointer',
                }}
                disabled={!answer.trim() || sending}
                onClick={handleReply}
              >
                {sending ? '발송 중...' : '답변 저장 + 이메일 발송'}
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}

/* ── Main Page ── */
export default function AdminInquiries() {
  const router = useRouter()
  const [inquiries, setInquiries]   = useState<Inquiry[]>([])
  const [pendingCount, setPending]  = useState(0)
  const [tab, setTab]               = useState<'pending' | 'answered' | 'all'>('pending')
  const [loading, setLoading]       = useState(true)
  const [token, setToken]           = useState('')
  const [selected, setSelected]     = useState<Inquiry | null>(null)
  const [toast, setToast]           = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchList = useCallback(async (tk: string, status: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/inquiries/list?status=${status}`, {
      headers: { Authorization: `Bearer ${tk}` },
    })
    if (res.ok) {
      const data = await res.json()
      setInquiries(data.inquiries)
      setPending(data.pendingCount)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/admin/login'); return }
      setToken(session.access_token)
      fetchList(session.access_token, tab)
    })
  }, [router, fetchList, tab])

  const handleTabChange = (key: 'pending' | 'answered' | 'all') => {
    setTab(key)
  }

  const handleReplied = (id: number) => {
    setInquiries(prev =>
      prev.map(q => q.id === id ? { ...q, status: 'answered', answered_at: new Date().toISOString() } : q)
    )
    setPending(p => Math.max(0, p - 1))
    showToast('답변이 등록되었습니다.', 'success')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  return (
    <>
      <Head><title>문의 관리 | THE OKTOP 관리자</title></Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f4f4; }
        a { text-decoration: none; color: inherit; }
        .row-btn:hover { background: #f9f9f9 !important; }
        .btn-logout:hover { background: #333; }
        textarea { font-family: inherit; }
      `}</style>

      <div style={s.root}>

        <header style={s.header}>
          <div style={s.headerInner}>
            <Link href="/admin/dashboard" style={s.logo}>
              THE OKTOP <span style={s.adminBadge}>관리자</span>
            </Link>
            <button style={s.btnLogout} className="btn-logout" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </header>

        <main style={s.main}>

          <div style={s.titleRow}>
            <Link href="/admin/dashboard" style={s.breadcrumb}>← 대시보드</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={s.h1}>문의 관리</h1>
              {pendingCount > 0 && (
                <span style={s.pendingBadge}>{pendingCount}</span>
              )}
            </div>
          </div>

          <div style={s.tabBar} role="tablist">
            {TABS.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => handleTabChange(t.key as 'pending' | 'answered' | 'all')}
                style={{
                  ...s.tab,
                  ...(tab === t.key ? s.tabActive : {}),
                }}
              >
                {t.label}
                {t.key === 'pending' && pendingCount > 0 && (
                  <span style={{
                    ...s.tabBadge,
                    background: tab === 'pending' ? 'rgba(255,255,255,0.25)' : '#FFF3E0',
                    color:      tab === 'pending' ? '#fff' : '#E65100',
                  }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['고객명', '문의 제목', '등록일', '상태'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {[120, 400, 140, 80].map((w, j) => (
                        <td key={j} style={s.td}>
                          <div style={{ height: 14, width: w, borderRadius: 4, background: 'linear-gradient(90deg,#eee 25%,#f5f5f5 50%,#eee 75%)', backgroundSize: '200% 100%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ ...s.td, textAlign: 'center', padding: '48px', color: '#bbb', fontSize: 14 }}>
                      {tab === 'pending' ? '미답변 문의가 없습니다.' : tab === 'answered' ? '답변된 문의가 없습니다.' : '문의가 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  inquiries.map(q => {
                    const isPending = q.status === 'pending'
                    return (
                      <tr
                        key={q.id}
                        className="row-btn"
                        style={{ ...s.tr, cursor: 'pointer' }}
                        onClick={() => setSelected(q)}
                      >
                        <td style={{ ...s.td, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {q.customer_name}
                        </td>
                        <td style={s.td}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isPending && <span style={s.dot} />}
                            <span style={{ color: isPending ? '#111' : '#555', fontWeight: isPending ? 600 : 400 }}>
                              {q.title}
                            </span>
                          </span>
                        </td>
                        <td style={{ ...s.td, color: '#888', fontSize: 13, whiteSpace: 'nowrap' }}>
                          {formatDateTime(q.created_at)}
                        </td>
                        <td style={s.td}>
                          <span style={{
                            ...s.badge,
                            background: isPending ? '#FFF8E1' : '#E8F5E9',
                            color:      isPending ? '#F57F17' : '#2E7D32',
                          }}>
                            {isPending ? '미답변' : '답변완료'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

        </main>
      </div>

      {selected && (
        <InquiryModal
          inquiry={selected}
          token={token}
          onClose={() => setSelected(null)}
          onReplied={handleReplied}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}

/* ── Page Styles ── */
const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#f4f4f4', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif" },
  header: { background: '#111', padding: '0 24px' },
  headerInner: { maxWidth: 1100, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 10 },
  adminBadge: { fontSize: 11, fontWeight: 500, background: 'rgba(255,255,255,0.15)', color: '#ccc', padding: '2px 8px', borderRadius: 20 },
  btnLogout: { padding: '7px 16px', background: '#333', color: '#ccc', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', transition: 'background 0.15s' },

  main: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px 64px' },
  titleRow: { marginBottom: 24 },
  breadcrumb: { fontSize: 13, color: '#888', display: 'block', marginBottom: 10 },
  h1: { fontSize: 24, fontWeight: 700, color: '#111', display: 'inline' },
  pendingBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 24, padding: '0 8px', background: '#E53935', color: '#fff', borderRadius: 12, fontSize: 12, fontWeight: 700 },

  tabBar: { display: 'flex', gap: 4, marginBottom: 16 },
  tab: { padding: '8px 20px', border: '1.5px solid #e0e0e0', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#fff', color: '#888', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 },
  tabActive: { background: '#111', color: '#fff', borderColor: '#111' },
  tabBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, fontSize: 11, fontWeight: 700 },

  tableWrap: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '13px 16px', textAlign: 'left' as const, fontSize: 12, fontWeight: 600, color: '#888', borderBottom: '1px solid #f0f0f0', background: '#fafafa' },
  td: { padding: '14px 16px', fontSize: 14, color: '#333', borderBottom: '1px solid #f5f5f5' },
  tr: { background: '#fff', transition: 'background 0.1s' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  dot: { width: 6, height: 6, borderRadius: '50%', background: '#F57F17', flexShrink: 0 },
}

/* ── Modal Styles ── */
const ms: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    maxWidth: 640,
    maxHeight: '90vh',
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    zIndex: 1001,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '24px 24px 20px',
    borderBottom: '1px solid #f0f0f0',
  },
  statusBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  idText: { fontSize: 12, color: '#aaa' },
  title: { fontSize: 17, fontWeight: 700, color: '#111', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  meta: { fontSize: 12, color: '#aaa', marginTop: 4 },
  closeBtn: { flexShrink: 0, width: 32, height: 32, border: 'none', background: '#f5f5f5', borderRadius: '50%', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' },

  body: { flex: 1, overflowY: 'auto' as const, padding: 24 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontWeight: 600, color: '#888', letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 10, display: 'flex', alignItems: 'center' },
  contentBox: { background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '14px 16px', fontSize: 14, color: '#333', lineHeight: 1.75, whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const },
  textarea: { width: '100%', padding: '12px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, lineHeight: 1.7, outline: 'none', resize: 'vertical' as const },

  footer: { padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' as const },
  emailNote: { fontSize: 12, color: '#aaa' },
  btnCancel: { padding: '10px 20px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: '#fff', color: '#666' },
  btnSend: { padding: '10px 24px', background: '#1565C0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, transition: 'opacity 0.15s' },
}
