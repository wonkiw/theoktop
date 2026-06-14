import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import { getSupabaseClient } from '../../lib/supabase'
import { createSSRSupabaseClient } from '../../lib/supabaseServer'
import { getPool } from '../../lib/db'
import Header from '../../components/Header'

type Document = {
  id: string
  file_name: string
  file_url: string
  file_type: string
}

type Order = {
  id: number
  building_address: string
  building_detail: string | null
  order_type: string | null
  description: string | null
  status: 'pending' | 'reviewing' | 'completed' | 'cancelled'
  created_at: string
  documents: Document[]
}

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  pending:   { label: '접수 대기', color: '#f59e0b' },
  reviewing: { label: '검토 중',   color: '#3b82f6' },
  completed: { label: '완료',      color: '#10b981' },
  cancelled: { label: '취소',      color: '#9ca3af' },
}

type Period = 'today' | 'week' | 'month' | 'all'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: '오늘' },
  { key: 'week',  label: '1주일' },
  { key: 'month', label: '1개월' },
  { key: 'all',   label: '전체' },
]

const PAGE_SIZE = 10

function filterByPeriod(orders: Order[], period: Period): Order[] {
  if (period === 'all') return orders
  const now = new Date()
  const from = new Date()
  if (period === 'today') { from.setHours(0, 0, 0, 0) }
  if (period === 'week')  { from.setDate(now.getDate() - 7) }
  if (period === 'month') { from.setMonth(now.getMonth() - 1) }
  return orders.filter(o => new Date(o.created_at) >= from)
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const hms = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
  return `${ymd} ${hms}`
}

export default function MyPage() {
  const router = useRouter()
  const [token, setToken]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [orders, setOrders]     = useState<Order[]>([])
  const [error, setError]       = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [period, setPeriod]     = useState<Period>('all')
  const [page, setPage]         = useState(1)
  const [typeFilter, setTypeFilter] = useState('전체')
  const [userName, setUserName]  = useState('')

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) return // getServerSideProps에서 처리
      setToken(session.access_token)
      const name =
        session.user.user_metadata?.full_name ??
        session.user.user_metadata?.name ??
        session.user.email?.split('@')[0] ??
        '사용자'
      setUserName(name)
      loadOrders(session.access_token)
    })
  }, [])

  const loadOrders = async (accessToken: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/orders/list', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message ?? '불러오는 중 오류가 발생했습니다.')
      } else {
        setOrders(json.orders ?? [])
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    }
    setLoading(false)
  }

  const orderTypes = useMemo(() => {
    const types = Array.from(new Set(orders.map(o => o.order_type).filter(Boolean))) as string[]
    return ['전체', ...types]
  }, [orders])

  const filtered = useMemo(() => {
    let list = filterByPeriod(orders, period)
    if (typeFilter !== '전체') list = list.filter(o => o.order_type === typeFilter)
    return list
  }, [orders, period, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggle = (id: number) => setExpanded(prev => (prev === id ? null : id))

  const handlePeriod = (p: Period) => { setPeriod(p); setPage(1) }
  const handleType   = (t: string)  => { setTypeFilter(t); setPage(1) }

  const handleDownload = async (docId: string, fileName: string) => {
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
  }

  return (
    <div style={s.page}>
      <Header />
      <div style={s.container}>

        {/* 타이틀 바 */}
        <div style={s.titleBar}>
          <div style={s.titleLeft}>
            <h1 style={s.title}>상담내역</h1>
            {userName && <span style={s.userBadge}>{userName} 님</span>}
          </div>
          <div style={s.titleRight}>
            <Link href="/mypage/new-order"   style={s.newBtn}>+ 새 상담 등록</Link>
            <Link href="/mypage/inquiries" style={s.subBtn}>상담 내역</Link>
          </div>
        </div>

        {/* 종류 필터 */}
        {orderTypes.length > 1 && (
          <div style={s.typeRow}>
            <select
              value={typeFilter}
              onChange={e => handleType(e.target.value)}
              style={s.typeSelect}
            >
              {orderTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {/* 기간 탭 */}
        <div style={s.periodTabs}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              style={{
                ...s.periodTab,
                ...(period === p.key ? s.periodTabActive : {}),
              }}
              onClick={() => handlePeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 목록 */}
        {loading ? (
          <div style={s.center}>불러오는 중...</div>
        ) : error ? (
          <div style={s.center}>
            <p style={s.errText}>{error}</p>
            <button style={s.retryBtn} onClick={() => loadOrders(token)}>다시 시도</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyText}>
              {period !== 'all' ? '해당 기간에 상담 내역이 없습니다.' : '등록된 상담 내역이 없습니다.'}
            </p>
            <Link href="/mypage/new-order" style={s.emptyLink}>첫 상담 신청하기 →</Link>
          </div>
        ) : (
          <div style={s.list}>
            {paged.map((order, idx) => {
              const isOpen = expanded === order.id
              const status = STATUS_INFO[order.status] ?? STATUS_INFO.pending
              const isDone = order.status === 'completed'

              return (
                <div key={order.id} style={{ ...s.row, ...(isOpen ? s.rowOpen : {}) }}>
                  {/* 질문 행 */}
                  <button style={s.rowHeader} onClick={() => toggle(order.id)}>
                    <span style={s.qMark}>Q</span>

                    <div style={s.rowMeta}>
                      <span style={s.rowTitle}>
                        {order.order_type && (
                          <span style={s.typeTag}>[{order.order_type}]</span>
                        )}{' '}
                        {order.building_address}
                        {order.building_detail && ` ${order.building_detail}`}
                      </span>
                      <span style={s.rowDate}>등록일 {formatDateTime(order.created_at)}</span>
                    </div>

                    <div style={s.rowRight}>
                      <span style={{ ...s.statusDot, background: status.color }} />
                      <span style={s.rowStatus}>{status.label}</span>
                      <span style={{ ...s.answerBtn, ...(isDone ? s.answerBtnDone : {}) }}>
                        {isDone ? '답변완료' : '처리중'}
                      </span>
                      <span style={{ ...s.chevron, transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </div>
                  </button>

                  {/* 펼친 상세 */}
                  {isOpen && (
                    <div style={s.rowBody}>
                      {/* Q 내용 */}
                      <div style={s.qSection}>
                        <div style={s.sectionLabel}>상담 내용</div>
                        {order.description ? (
                          <p style={s.descText}>{order.description}</p>
                        ) : (
                          <p style={s.noDesc}>입력된 상담 내용이 없습니다.</p>
                        )}
                      </div>

                      {/* 첨부 서류 */}
                      {order.documents.length > 0 && (
                        <div style={s.docSection}>
                          <div style={s.sectionLabel}>첨부 서류</div>
                          <div style={s.docList}>
                            {order.documents.map(doc => (
                              <div key={doc.id} style={s.docItem}>
                                <span style={s.docIcon}>📎</span>
                                <span style={s.docName}>{doc.file_name}</span>
                                <button
                                  style={s.dlBtn}
                                  onClick={() => handleDownload(doc.id, doc.file_name)}
                                >
                                  다운로드
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* A: 답변 */}
                      <div style={{ ...s.aSection, ...(isDone ? s.aSectionDone : {}) }}>
                        <span style={{ ...s.aMark, ...(isDone ? s.aMarkDone : {}) }}>A</span>
                        <div style={s.aBody}>
                          {isDone ? (
                            <>
                              <p style={s.aTitle}>상담 처리가 완료되었습니다.</p>
                              <p style={s.aDesc}>담당자가 연락드릴 예정입니다. 추가 문의사항은 아래 문의하기를 이용해주세요.</p>
                            </>
                          ) : order.status === 'reviewing' ? (
                            <>
                              <p style={s.aTitle}>검토 중입니다.</p>
                              <p style={s.aDesc}>현재 담당자가 상담 내용을 검토하고 있습니다. 빠른 시일 내에 연락드리겠습니다.</p>
                            </>
                          ) : order.status === 'cancelled' ? (
                            <p style={s.aTitle}>취소된 상담입니다.</p>
                          ) : (
                            <>
                              <p style={s.aTitle}>접수가 완료되었습니다.</p>
                              <p style={s.aDesc}>담당자 확인 후 연락드리겠습니다. 평일 09:00 – 18:00 운영합니다.</p>
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 페이지네이션 */}
        {!loading && !error && totalPages > 1 && (
          <div style={s.pagination}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                style={{ ...s.pageBtn, ...(page === p ? s.pageBtnActive : {}) }}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* 하단 바로가기 */}
        <div style={s.bottomNav}>
          <Link href="/mypage/inquiries" style={s.bottomLink}>💬 상담 내역</Link>
          <Link href="/mypage/orders"    style={s.bottomLink}>📋 의뢰 현황</Link>
          <Link href="/mypage/documents" style={s.bottomLink}>📁 문서 관리</Link>
        </div>

      </div>
    </div>
  )
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f7f8fa',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  container: {
    maxWidth: 860,
    margin: '0 auto',
    padding: '0 20px 80px',
  },

  // 타이틀
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '32px 0 20px',
    borderBottom: '2px solid #111',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  titleLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: 800, color: '#111', margin: 0 },
  userBadge: {
    fontSize: 13, color: '#666', background: '#f0f0f0',
    padding: '3px 10px', borderRadius: 20,
  },
  titleRight: { display: 'flex', gap: 10 },
  newBtn: {
    padding: '9px 18px',
    background: '#111', color: '#fff',
    border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 600, textDecoration: 'none',
    cursor: 'pointer',
  },
  subBtn: {
    padding: '9px 18px',
    background: '#fff', color: '#555',
    border: '1.5px solid #ddd', borderRadius: 8,
    fontSize: 13, fontWeight: 500, textDecoration: 'none',
  },

  // 필터
  typeRow: { marginBottom: 12 },
  typeSelect: {
    padding: '8px 12px',
    border: '1.5px solid #ddd', borderRadius: 8,
    fontSize: 13, background: '#fff', color: '#333',
    cursor: 'pointer', outline: 'none',
    minWidth: 120,
  },
  periodTabs: {
    display: 'flex',
    marginBottom: 20,
    border: '1px solid #ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  periodTab: {
    flex: 1, padding: '10px 0',
    background: '#fff', color: '#555',
    border: 'none', borderRight: '1px solid #ddd',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    transition: 'background 0.15s',
  },
  periodTabActive: {
    background: '#111', color: '#fff', fontWeight: 700,
  },

  // 목록
  list: { display: 'flex', flexDirection: 'column', gap: 2 },
  row: {
    background: '#fff',
    border: '1px solid #e8e8e8',
    borderRadius: 0,
    overflow: 'hidden',
    transition: 'border-color 0.15s',
  },
  rowOpen: { borderColor: '#bbb' },

  rowHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    background: 'none', border: 'none',
    cursor: 'pointer', textAlign: 'left',
  },
  qMark: {
    fontSize: 15, fontWeight: 800, color: '#111',
    background: '#f0f0f0', borderRadius: 4,
    padding: '2px 8px', flexShrink: 0,
  },
  rowMeta: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  rowTitle: {
    fontSize: 14, fontWeight: 600, color: '#111',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  typeTag: { color: '#555', fontWeight: 400 },
  rowDate:  { fontSize: 11, color: '#aaa' },
  rowRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  statusDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  rowStatus: { fontSize: 11, color: '#888', whiteSpace: 'nowrap' },
  answerBtn: {
    padding: '3px 10px',
    border: '1px solid #ccc', borderRadius: 4,
    fontSize: 11, color: '#888', background: '#fafafa',
    whiteSpace: 'nowrap',
  },
  answerBtnDone: {
    border: '1px solid #10b981', color: '#10b981', background: '#f0fdf4',
  },
  chevron: {
    fontSize: 14, color: '#bbb', flexShrink: 0,
    display: 'inline-block', transition: 'transform 0.2s',
  },

  // 펼친 상세
  rowBody: {
    borderTop: '1px solid #f0f0f0',
    padding: '0 20px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  qSection: {
    paddingTop: 16,
    paddingLeft: 40,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: 700, color: '#aaa',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  descText: {
    fontSize: 13, color: '#333', lineHeight: 1.7, margin: 0,
    whiteSpace: 'pre-wrap',
  },
  noDesc: { fontSize: 13, color: '#bbb', margin: 0 },

  docSection: { paddingLeft: 40 },
  docList: { display: 'flex', flexDirection: 'column', gap: 6 },
  docItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px',
    background: '#fafafa', borderRadius: 6,
    border: '1px solid #efefef',
  },
  docIcon: { fontSize: 15, flexShrink: 0 },
  docName: {
    flex: 1, fontSize: 12, color: '#444',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  dlBtn: {
    padding: '4px 10px', background: '#fff',
    border: '1px solid #ddd', borderRadius: 4,
    fontSize: 11, color: '#555', cursor: 'pointer', flexShrink: 0,
  },

  // 답변 섹션
  aSection: {
    display: 'flex', gap: 16,
    padding: '16px',
    background: '#f8f8f8', borderRadius: 8,
    marginLeft: 40,
  },
  aSectionDone: { background: '#f0fdf4' },
  aMark: {
    fontSize: 15, fontWeight: 800, color: '#888',
    background: '#e8e8e8', borderRadius: 4,
    padding: '2px 8px', flexShrink: 0, height: 'fit-content',
  },
  aMarkDone: { background: '#d1fae5', color: '#059669' },
  aBody: { display: 'flex', flexDirection: 'column', gap: 6 },
  aTitle: { fontSize: 13, fontWeight: 700, color: '#333', margin: 0 },
  aDesc:  { fontSize: 12, color: '#666', lineHeight: 1.6, margin: 0 },

  // 상태
  center: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: 200, gap: 16,
    fontSize: 14, color: '#999',
  },
  errText: { color: '#E53935', fontSize: 14, margin: 0 },
  retryBtn: {
    padding: '8px 20px', background: '#111', color: '#fff',
    border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer',
  },
  empty: {
    padding: '60px 20px', textAlign: 'center',
    background: '#fff', borderRadius: 8,
    border: '1px solid #e8e8e8',
  },
  emptyText: { fontSize: 14, color: '#aaa', marginBottom: 16 },
  emptyLink: { fontSize: 13, color: '#111', fontWeight: 700, textDecoration: 'underline' },

  // 페이지네이션
  pagination: {
    display: 'flex', justifyContent: 'center',
    gap: 6, marginTop: 24,
  },
  pageBtn: {
    width: 34, height: 34,
    background: '#fff', color: '#555',
    border: '1px solid #ddd', borderRadius: 6,
    fontSize: 13, cursor: 'pointer',
  },
  pageBtnActive: {
    background: '#111', color: '#fff', border: '1px solid #111', fontWeight: 700,
  },

  // 하단 바로가기
  bottomNav: {
    display: 'flex', gap: 16, justifyContent: 'center',
    marginTop: 40, paddingTop: 24, borderTop: '1px solid #ebebeb',
    flexWrap: 'wrap',
  },
  bottomLink: {
    fontSize: 13, color: '#666', textDecoration: 'none', fontWeight: 500,
    padding: '8px 16px', borderRadius: 20,
    border: '1px solid #e0e0e0', background: '#fff',
  },
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createSSRSupabaseClient(ctx)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { redirect: { destination: '/login?redirect=/mypage', permanent: false } }
  }

  const client = await getPool().connect()
  try {
    const { rows } = await client.query(
      'SELECT role FROM users WHERE supabase_uid = $1',
      [session.user.id]
    )
    if (!rows.length) {
      return { redirect: { destination: '/login', permanent: false } }
    }
    const role = rows[0].role as string
    if (role === 'admin' || role === 'superadmin') {
      return { redirect: { destination: '/admin/dashboard', permanent: false } }
    }
  } finally {
    client.release()
  }

  return { props: {} }
}
