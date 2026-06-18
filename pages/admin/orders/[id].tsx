import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { getSupabaseClient } from '../../../lib/supabase'

interface Document {
  id: number
  file_name: string
  file_url: string
  file_type: string
  viewUrl: string | null
  downloadUrl: string | null
}

interface OrderDetail {
  id: number
  building_address: string
  building_detail: string
  order_type: string
  description: string
  status: string
  admin_memo: string
  created_at: string
  updated_at: string
  name: string
  email: string
  phone: string
  documents: Document[]
}

const STATUS_OPTIONS = [
  { value: 'pending',   label: '대기중' },
  { value: 'reviewing', label: '검토중' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소' },
]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#FFF8E1', color: '#F57F17' },
  reviewing: { bg: '#E3F2FD', color: '#1565C0' },
  completed: { bg: '#E8F5E9', color: '#2E7D32' },
  cancelled: { bg: '#FFEBEE', color: '#C62828' },
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  new: '신규 시공', remodel: '리모델링', consult: '컨설팅 상담',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      background: type === 'success' ? '#1a1a1a' : '#C62828',
      color: '#fff', padding: '12px 24px', borderRadius: 8,
      fontSize: 14, fontWeight: 500, zIndex: 9999,
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      animation: 'fadeIn 0.2s ease',
    }}>
      {message}
    </div>
  )
}

export default function OrderDetailPage() {
  const router = useRouter()
  const { id }  = router.query

  const [order, setOrder]           = useState<OrderDetail | null>(null)
  const [loading, setLoading]       = useState(true)
  const [token, setToken]           = useState('')

  const [status, setStatus]         = useState('')
  const [memo, setMemo]             = useState('')
  const [feedback, setFeedback]     = useState('')

  const [savingStatus, setSavingStatus]   = useState(false)
  const [savingMemo, setSavingMemo]       = useState(false)
  const [sendingFeedback, setSendingFeedback] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data: { session } } = await getSupabaseClient().auth.getSession()
      if (!session) { router.replace('/admin/login'); return }

      setToken(session.access_token)

      const res = await fetch(`/api/admin/orders/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const { order } = await res.json()
        setOrder(order)
        setStatus(order.status)
        setMemo(order.admin_memo ?? '')
      } else {
        router.replace('/admin/orders')
      }
      setLoading(false)
    }
    load()
  }, [id, router])

  const handleSaveStatus = async () => {
    if (!order || !token) return
    setSavingStatus(true)
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    showToast(res.ok ? '상태가 저장되었습니다.' : '저장에 실패했습니다.', res.ok ? 'success' : 'error')
    if (res.ok) setOrder(prev => prev ? { ...prev, status } : prev)
    setSavingStatus(false)
  }

  const handleSaveMemo = async () => {
    if (!order || !token) return
    setSavingMemo(true)
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ admin_memo: memo }),
    })
    showToast(res.ok ? '메모가 저장되었습니다.' : '저장에 실패했습니다.', res.ok ? 'success' : 'error')
    setSavingMemo(false)
  }

  const handleSendFeedback = async () => {
    if (!order || !token || !feedback.trim()) return
    setSendingFeedback(true)
    const res = await fetch('/api/admin/orders/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ order_id: order.id, content: feedback }),
    })
    if (res.ok) {
      const data = await res.json()
      showToast(data.message ?? '피드백이 저장되었습니다.', 'success')
      setFeedback('')
    } else {
      showToast('발송에 실패했습니다.', 'error')
    }
    setSendingFeedback(false)
  }

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut()
    router.replace('/admin/login')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f4', fontFamily: "'Pretendard', sans-serif" }}>
        <p style={{ color: '#aaa' }}>불러오는 중...</p>
      </div>
    )
  }

  if (!order) return null
  const badge = STATUS_STYLE[order.status] ?? { bg: '#f5f5f5', color: '#777' }

  return (
    <>
      <Head><title>의뢰 #{order.id} | THE OKTOP 관리자</title></Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f4f4; }
        a { text-decoration: none; color: inherit; }
        textarea { resize: vertical; font-family: inherit; }
        select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
        .btn-save:hover:not(:disabled) { opacity: 0.85; }
        .btn-logout:hover { background: #333; }
        .doc-btn:hover { background: #f0f0f0 !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @media (max-width: 900px) {
          .detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={s.root}>

        {/* ── 헤더 ── */}
        <header style={s.header}>
          <div style={s.headerInner}>
            <Link href="/admin/dashboard" style={s.logo}>
              THE OKTOP <span style={s.adminBadge}>관리자</span>
            </Link>
            <button style={s.btnLogout} className="btn-logout" onClick={handleLogout}>로그아웃</button>
          </div>
        </header>

        <main style={s.main}>

          {/* ── 타이틀 ── */}
          <div style={s.titleRow}>
            <Link href="/admin/orders" style={s.breadcrumb}>← 의뢰 목록</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={s.h1}>의뢰 #{order.id}</h1>
              <span style={{ ...s.statusBadge, background: badge.bg, color: badge.color }}>
                {STATUS_OPTIONS.find(o => o.value === order.status)?.label ?? order.status}
              </span>
            </div>
            <p style={s.dateText}>등록 {formatDateTime(order.created_at)}</p>
          </div>

          <div className="detail-grid" style={s.grid}>

            {/* ── 좌측: 정보 ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* 고객 정보 */}
              <section style={s.card}>
                <h2 style={s.cardTitle}>고객 정보</h2>
                <div style={s.infoGrid}>
                  <InfoRow label="이름"     value={order.name} />
                  <InfoRow label="이메일"   value={order.email} />
                  <InfoRow label="전화번호" value={order.phone || '—'} />
                </div>
              </section>

              {/* 의뢰 내용 */}
              <section style={s.card}>
                <h2 style={s.cardTitle}>의뢰 내용</h2>
                <div style={s.infoGrid}>
                  <InfoRow label="의뢰유형" value={ORDER_TYPE_LABEL[order.order_type] ?? order.order_type} />
                  <InfoRow label="건물주소" value={order.building_address} />
                  {order.building_detail && (
                    <InfoRow label="상세주소" value={order.building_detail} />
                  )}
                </div>
                {order.description && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                    <p style={s.label}>문의 내용</p>
                    <p style={{ fontSize: 14, color: '#333', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginTop: 6 }}>
                      {order.description}
                    </p>
                  </div>
                )}
              </section>

              {/* 첨부 파일 */}
              <section style={s.card}>
                <h2 style={s.cardTitle}>첨부 파일 <span style={s.countBadge}>{order.documents.length}</span></h2>
                {order.documents.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#bbb', padding: '8px 0' }}>첨부된 파일이 없습니다.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                    {order.documents.map(doc => (
                      <div key={doc.id} style={s.docRow}>
                        <div style={s.docIcon}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                        <span style={s.docName} title={doc.file_name}>{doc.file_name}</span>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            className="doc-btn"
                            style={s.docBtn}
                            disabled={!doc.viewUrl}
                            onClick={() => doc.viewUrl && window.open(doc.viewUrl, '_blank')}
                          >
                            열람
                          </button>
                          <button
                            className="doc-btn"
                            style={s.docBtn}
                            disabled={!doc.downloadUrl}
                            onClick={() => {
                              if (!doc.downloadUrl) return
                              const a = document.createElement('a')
                              a.href = doc.downloadUrl
                              a.download = doc.file_name
                              a.click()
                            }}
                          >
                            다운로드
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>

            {/* ── 우측: 관리 ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* 상태 변경 */}
              <section style={s.card}>
                <h2 style={s.cardTitle}>상태 변경</h2>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  style={s.select}
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button
                  style={{ ...s.btnSave, marginTop: 10 }}
                  className="btn-save"
                  disabled={savingStatus || status === order.status}
                  onClick={handleSaveStatus}
                >
                  {savingStatus ? '저장 중...' : '상태 저장'}
                </button>
              </section>

              {/* 관리자 메모 */}
              <section style={s.card}>
                <h2 style={s.cardTitle}>
                  관리자 메모
                  <span style={s.privateTag}>비공개</span>
                </h2>
                <textarea
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  placeholder="고객에게 공개되지 않는 내부 메모를 입력하세요."
                  style={s.textarea}
                  rows={5}
                />
                <button
                  style={s.btnSave}
                  className="btn-save"
                  disabled={savingMemo}
                  onClick={handleSaveMemo}
                >
                  {savingMemo ? '저장 중...' : '메모 저장'}
                </button>
              </section>

              {/* 고객 피드백 발송 */}
              <section style={s.card}>
                <h2 style={s.cardTitle}>고객 피드백 발송</h2>
                <p style={s.feedbackDesc}>
                  발송 시 <strong>{order.email}</strong>로 이메일이 발송됩니다.
                </p>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="고객에게 전달할 피드백 내용을 입력하세요."
                  style={{ ...s.textarea, marginTop: 10 }}
                  rows={6}
                />
                <button
                  style={{ ...s.btnSend, opacity: (!feedback.trim() || sendingFeedback) ? 0.5 : 1 }}
                  className="btn-save"
                  disabled={!feedback.trim() || sendingFeedback}
                  onClick={handleSendFeedback}
                >
                  {sendingFeedback ? '발송 중...' : '피드백 발송'}
                </button>
              </section>

            </div>

          </div>
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
      <span style={{ fontSize: 13, color: '#888', width: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, color: '#222', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#f4f4f4', fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" },
  header: { background: '#111', padding: '0 24px' },
  headerInner: { maxWidth: 1200, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 10 },
  adminBadge: { fontSize: 11, fontWeight: 500, background: 'rgba(255,255,255,0.15)', color: '#ccc', padding: '2px 8px', borderRadius: 20 },
  btnLogout: { padding: '7px 16px', background: '#333', color: '#ccc', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', transition: 'background 0.15s' },

  main: { maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' },
  titleRow: { marginBottom: 28 },
  breadcrumb: { fontSize: 13, color: '#888', display: 'block', marginBottom: 10 },
  h1: { fontSize: 22, fontWeight: 700, color: '#111', display: 'inline' },
  statusBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  dateText: { fontSize: 12, color: '#aaa', marginTop: 6 },

  grid: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 },

  card: { background: '#fff', borderRadius: 12, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
  countBadge: { fontSize: 11, fontWeight: 600, background: '#f0f0f0', color: '#666', padding: '2px 7px', borderRadius: 10 },
  privateTag: { fontSize: 11, fontWeight: 500, background: '#FFF3E0', color: '#E65100', padding: '2px 7px', borderRadius: 4 },

  infoGrid: { display: 'flex', flexDirection: 'column' as const },
  label: { fontSize: 12, color: '#aaa', fontWeight: 500 },

  docRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' },
  docIcon: { color: '#888', flexShrink: 0 },
  docName: { fontSize: 13, color: '#333', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  docBtn: { padding: '5px 12px', border: '1.5px solid #e0e0e0', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: '#fff', color: '#555', transition: 'background 0.15s', whiteSpace: 'nowrap' as const },

  select: { width: '100%', padding: '10px 36px 10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff', cursor: 'pointer' },
  textarea: { width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', lineHeight: 1.6, background: '#fff' },
  btnSave: { width: '100%', padding: '11px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' },
  btnSend: { width: '100%', padding: '11px', background: '#1565C0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s', marginTop: 10 },
  feedbackDesc: { fontSize: 13, color: '#888', lineHeight: 1.5 },
}
