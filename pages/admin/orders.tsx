import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { getSupabaseClient } from '../../lib/supabase'

interface Order {
  id: number
  building_address: string
  order_type: string
  status: string
  created_at: string
  customer_name: string
}

const PAGE_SIZE = 20

const STATUS_TABS = [
  { key: 'all',       label: '전체' },
  { key: 'pending',   label: '대기중' },
  { key: 'reviewing', label: '검토중' },
  { key: 'completed', label: '완료' },
  { key: 'cancelled', label: '취소' },
]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#FFF8E1', color: '#F57F17' },
  reviewing: { bg: '#E3F2FD', color: '#1565C0' },
  completed: { bg: '#E8F5E9', color: '#2E7D32' },
  cancelled: { bg: '#FFEBEE', color: '#C62828' },
}

const STATUS_LABEL: Record<string, string> = {
  pending: '대기중', reviewing: '검토중', completed: '완료', cancelled: '취소',
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  new: '신규 시공', remodel: '리모델링', consult: '컨설팅 상담',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

export default function AdminOrders() {
  const router = useRouter()
  const [orders, setOrders]           = useState<Order[]>([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(true)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchOrders = useCallback(async (pg: number, status: string, q: string) => {
    setLoading(true)
    const { data: { session } } = await getSupabaseClient().auth.getSession()
    if (!session) { router.replace('/admin/login'); return }

    const params = new URLSearchParams({ page: String(pg), status })
    if (q) params.set('search', q)

    const res = await fetch(`/api/admin/orders/list?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setOrders(data.orders)
      setTotal(data.total)
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchOrders(page, statusFilter, search)
  }, [page, statusFilter, search, fetchOrders])

  const handleSearchChange = (v: string) => {
    setSearchInput(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(v)
      setPage(1)
    }, 400)
  }

  const handleTabChange = (key: string) => {
    setStatusFilter(key)
    setPage(1)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut()
    router.replace('/admin/login')
  }

  return (
    <>
      <Head><title>의뢰 관리 | THE OKTOP 관리자</title></Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f4f4; }
        a { text-decoration: none; color: inherit; }
        .order-row { cursor: pointer; transition: background 0.1s; }
        .order-row:hover { background: #f9f9f9 !important; }
        .tab-btn:hover { color: #111 !important; }
        .btn-logout:hover { background: #333; }
        .page-btn:hover:not(:disabled) { background: #f0f0f0; }
        @media (max-width: 900px) {
          .orders-table th:nth-child(2),
          .orders-table td:nth-child(2) { display: none; }
        }
        @media (max-width: 640px) {
          .orders-table th:nth-child(4),
          .orders-table td:nth-child(4) { display: none; }
        }
      `}</style>

      <div style={s.root}>

        {/* ── 헤더 ── */}
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

          {/* ── 타이틀 ── */}
          <div style={s.titleRow}>
            <Link href="/admin/dashboard" style={s.breadcrumb}>← 대시보드</Link>
            <h1 style={s.h1}>의뢰 관리</h1>
            <p style={s.totalCount}>총 {total.toLocaleString()}건</p>
          </div>

          {/* ── 검색 + 필터 ── */}
          <div style={s.toolbar}>
            <div style={s.searchWrap}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="고객명, 건물주소 검색"
                style={s.searchInput}
              />
            </div>

            <div style={s.tabs} role="tablist">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={statusFilter === tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className="tab-btn"
                  style={{
                    ...s.tab,
                    ...(statusFilter === tab.key ? s.tabActive : {}),
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── 테이블 ── */}
          <div style={s.tableWrap}>
            <table style={s.table} className="orders-table">
              <thead>
                <tr>
                  {['번호', '고객명', '건물주소', '의뢰유형', '상태', '등록일'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} style={s.td}>
                          <div style={s.skeletonCell} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...s.td, textAlign: 'center', padding: '40px', color: '#aaa' }}>
                      조회된 의뢰가 없습니다.
                    </td>
                  </tr>
                ) : (
                  orders.map((o, idx) => {
                    const badge = STATUS_STYLE[o.status] ?? { bg: '#f5f5f5', color: '#777' }
                    return (
                      <tr
                        key={o.id}
                        className="order-row"
                        style={s.tr}
                        onClick={() => router.push(`/admin/orders/${o.id}`)}
                      >
                        <td style={{ ...s.td, color: '#aaa', fontSize: 12 }}>
                          #{(page - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td style={{ ...s.td, fontWeight: 600 }}>{o.customer_name}</td>
                        <td style={{ ...s.td, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.building_address}
                        </td>
                        <td style={s.td}>
                          {ORDER_TYPE_LABEL[o.order_type] ?? o.order_type}
                        </td>
                        <td style={s.td}>
                          <span style={{
                            ...s.badge,
                            background: badge.bg,
                            color: badge.color,
                          }}>
                            {STATUS_LABEL[o.status] ?? o.status}
                          </span>
                        </td>
                        <td style={{ ...s.td, color: '#888', fontSize: 13 }}>
                          {formatDate(o.created_at)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── 페이지네이션 ── */}
          {totalPages > 1 && (
            <div style={s.pagination}>
              <button
                style={s.pageBtn}
                className="page-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← 이전
              </button>
              <span style={s.pageInfo}>{page} / {totalPages}</span>
              <button
                style={s.pageBtn}
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                다음 →
              </button>
            </div>
          )}

        </main>
      </div>
    </>
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
  titleRow: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24, flexWrap: 'wrap' as const },
  breadcrumb: { fontSize: 13, color: '#888', whiteSpace: 'nowrap' as const },
  h1: { fontSize: 24, fontWeight: 700, color: '#111' },
  totalCount: { fontSize: 13, color: '#aaa', marginLeft: 'auto' },

  toolbar: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' as const },
  searchWrap: { position: 'relative' as const, flex: '1 1 240px' },
  searchInput: { width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' },

  tabs: { display: 'flex', gap: 4, flexShrink: 0 },
  tab: { padding: '7px 14px', border: '1.5px solid #e0e0e0', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#fff', color: '#888', transition: 'all 0.15s' },
  tabActive: { background: '#111', color: '#fff', borderColor: '#111' },

  tableWrap: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '13px 16px', textAlign: 'left' as const, fontSize: 12, fontWeight: 600, color: '#888', borderBottom: '1px solid #f0f0f0', background: '#fafafa', whiteSpace: 'nowrap' as const },
  td: { padding: '14px 16px', fontSize: 14, color: '#333', borderBottom: '1px solid #f5f5f5' },
  tr: { background: '#fff' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  skeletonCell: { height: 14, borderRadius: 4, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%' },

  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 24 },
  pageBtn: { padding: '8px 20px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: '#fff', color: '#333', transition: 'background 0.15s' },
  pageInfo: { fontSize: 14, color: '#888' },
}
