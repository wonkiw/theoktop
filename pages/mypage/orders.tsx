import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '../../components/Header'

type Document = {
  id: string
  file_name: string
  file_url: string
  file_type: string
}

type Order = {
  id: string
  building_address: string
  building_detail: string | null
  order_type: string | null
  description: string | null
  status: 'pending' | 'reviewing' | 'completed' | 'cancelled'
  created_at: string
  admin_feedback: string | null
  admin_feedback_at: string | null
  documents: Document[]
}

const STATUS_MAP: Record<Order['status'], { label: string; bg: string; color: string; border: string }> = {
  pending:   { label: '대기중', bg: '#FFFDE7', color: '#F57F17', border: '#FBC02D' },
  reviewing: { label: '검토중', bg: '#E3F2FD', color: '#1565C0', border: '#42A5F5' },
  completed: { label: '완료',   bg: '#E8F5E9', color: '#2E7D32', border: '#66BB6A' },
  cancelled: { label: '취소',   bg: '#FFEBEE', color: '#C62828', border: '#EF9A9A' },
}

const FILE_TYPE_ICON: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg':      '🖼️',
  'image/jpg':       '🖼️',
  'image/png':       '🖼️',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function OrdersPage() {
  const [orders, setOrders]   = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/orders/list')
      .then(r => r.json())
      .then(data => {
        if (data.success) setOrders(data.orders)
        else setError(data.message)
      })
      .catch(() => setError('불러오는 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  const toggleExpand = (id: string) =>
    setExpandedId(prev => (prev === id ? null : id))

  const handleDownload = async (documentId: string, fileName: string) => {
    setDownloading(documentId)
    try {
      const res = await fetch(`/api/documents/download-url?documentId=${documentId}`)
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
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return <div style={s.page}><div style={s.center}>불러오는 중...</div></div>
  }

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.center}>
          <p style={s.errText}>{error}</p>
          <Link href="/mypage" style={s.backLink}>마이페이지로 돌아가기</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <Header />
      <div style={s.container}>

        {/* Sub-nav */}
        <div style={s.header}>
          <Link href="/mypage" style={s.backLink}>← 마이페이지</Link>
        </div>

        <div style={s.titleRow}>
          <h2 style={s.pageTitle}>의뢰 현황</h2>
          <Link href="/mypage/new-order" style={s.newBtn}>+ 새 의뢰 등록</Link>
        </div>

        {orders.length === 0 ? (
          <div style={s.empty}>
            <span style={s.emptyIcon}>📋</span>
            <p style={s.emptyText}>등록된 의뢰가 없습니다.</p>
            <Link href="/mypage/new-order" style={s.emptyLink}>첫 의뢰 등록하기</Link>
          </div>
        ) : (
          <div style={s.list}>
            {orders.map(order => {
              const status = STATUS_MAP[order.status] ?? STATUS_MAP.pending
              const isOpen = expandedId === order.id

              return (
                <div key={order.id} style={s.card}>
                  {/* 카드 헤더 */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(order.id)}
                    style={s.cardHeader}
                  >
                    <div style={s.cardMain}>
                      <div style={s.addressRow}>
                        <span style={s.address}>{order.building_address}</span>
                        {order.building_detail && (
                          <span style={s.detail}>{order.building_detail}</span>
                        )}
                      </div>
                      <div style={s.badgeRow}>
                        {order.order_type && (
                          <span style={s.typeBadge}>{order.order_type}</span>
                        )}
                        <span
                          style={{
                            ...s.statusBadge,
                            background: status.bg,
                            color: status.color,
                            border: `1px solid ${status.border}`,
                          }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <span style={s.date}>{formatDate(order.created_at)}</span>
                    </div>
                    <span style={{ ...s.chevron, transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                      ▾
                    </span>
                  </button>

                  {/* 펼쳐진 상세 */}
                  {isOpen && (
                    <div style={s.cardBody}>
                      {order.description && (
                        <div style={s.detailSection}>
                          <p style={s.detailLabel}>의뢰 내용</p>
                          <p style={s.detailValue}>{order.description}</p>
                        </div>
                      )}

                      {order.admin_feedback && (
                        <div style={s.detailSection}>
                          <p style={s.detailLabel}>담당자 피드백</p>
                          <div style={s.feedbackBox}>
                            <p style={s.feedbackText}>{order.admin_feedback}</p>
                            {order.admin_feedback_at && (
                              <p style={s.feedbackDate}>{formatDate(order.admin_feedback_at)}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div style={s.detailSection}>
                        <p style={s.detailLabel}>첨부 문서</p>
                        {order.documents.length === 0 ? (
                          <p style={s.noDoc}>첨부된 문서가 없습니다.</p>
                        ) : (
                          <ul style={s.docList}>
                            {order.documents.map(doc => (
                              <li key={doc.id} style={s.docItem}>
                                <span style={s.docIcon}>
                                  {FILE_TYPE_ICON[doc.file_type] ?? '📎'}
                                </span>
                                <span style={s.docName}>{doc.file_name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(doc.id, doc.file_name)}
                                  style={s.dlBtn}
                                  disabled={downloading === doc.id}
                                >
                                  {downloading === doc.id ? '준비 중...' : '다운로드'}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f7f7f7',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '0 24px 80px',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: 16,
    fontSize: 15,
    color: '#999',
  },
  errText: { color: '#E53935', fontSize: 14, margin: 0 },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 0',
    borderBottom: '1px solid #ebebeb',
    marginBottom: 40,
  },
  logo: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 2,
    color: '#111',
    textDecoration: 'none',
  },
  backLink: {
    fontSize: 13,
    color: '#555',
    textDecoration: 'none',
    fontWeight: 500,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111',
    margin: 0,
  },
  newBtn: {
    padding: '9px 18px',
    background: '#111',
    color: '#fff',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '80px 0',
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: '#aaa', margin: 0 },
  emptyLink: {
    padding: '10px 24px',
    background: '#111',
    color: '#fff',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  cardHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    gap: 12,
  },
  cardMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  addressRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  address: {
    fontSize: 15,
    fontWeight: 700,
    color: '#111',
  },
  detail: {
    fontSize: 13,
    color: '#888',
  },
  badgeRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 99,
    background: '#f0f0f0',
    color: '#555',
    border: '1px solid #e0e0e0',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 99,
  },
  date: {
    fontSize: 12,
    color: '#bbb',
  },
  chevron: {
    fontSize: 16,
    color: '#bbb',
    flexShrink: 0,
    transition: 'transform 0.2s',
    display: 'inline-block',
  },
  cardBody: {
    borderTop: '1px solid #f0f0f0',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  detailSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#aaa',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    margin: 0,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 1.7,
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  noDoc: {
    fontSize: 13,
    color: '#bbb',
    margin: 0,
  },
  docList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  docItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: '#fafafa',
    borderRadius: 8,
    border: '1px solid #efefef',
  },
  docIcon: { fontSize: 18, flexShrink: 0 },
  docName: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dlBtn: {
    padding: '5px 14px',
    background: '#fff',
    color: '#111',
    border: '1.5px solid #ddd',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
  feedbackBox: {
    background: '#EFF6FF',
    borderLeft: '4px solid #3B82F6',
    borderRadius: '0 8px 8px 0',
    padding: '14px 16px',
  },
  feedbackText: {
    fontSize: 14,
    color: '#1e3a5f',
    lineHeight: 1.75,
    margin: '0 0 8px',
    whiteSpace: 'pre-wrap',
  },
  feedbackDate: {
    fontSize: 12,
    color: '#93c5fd',
    margin: 0,
  },
}
