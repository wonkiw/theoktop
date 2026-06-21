import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { getSupabaseClient } from '../../lib/supabase'
import PremiumBadge from '../../components/PremiumBadge'

/* ── Types ── */
interface UserRow {
  id: string
  name: string
  email: string
  phone: string | null
  provider: string
  role: string
  created_at: string
  order_count: number
  inquiry_count: number
  status: string | null
  withdrawn_at: string | null
  withdraw_reason: string | null
  is_rejoined: boolean
  membership_tier: string
  premium_since: string | null
  premium_upgraded_by: string | null
}

interface Order {
  id: number
  building_address: string
  order_type: string
  status: string
  created_at: string
}

interface Document {
  id: number
  file_name: string
  file_url: string
  file_type: string
  order_id: number
  viewUrl: string | null
  downloadUrl: string | null
}

interface UserDetail {
  user: UserRow
  orders: Order[]
  documents: Document[]
}

/* ── Constants ── */
const PAGE_SIZE = 30

const PROVIDER_LABEL: Record<string, string> = {
  email:  '이메일',
  google: '구글',
  kakao:  '카카오',
  naver:  '네이버',
  oauth:  'OAuth',
}

function getProviderLabel(provider: string) {
  return PROVIDER_LABEL[provider] ?? provider
}

const PROVIDER_STYLE: Record<string, { bg: string; color: string }> = {
  email:  { bg: '#F5F5F5', color: '#555' },
  google: { bg: '#FCE8E6', color: '#C62828' },
  kakao:  { bg: '#FFFDE7', color: '#F57F17' },
  naver:  { bg: '#E8F5E9', color: '#2E7D32' },
  oauth:  { bg: '#EDE7F6', color: '#4527A0' },
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#FFF8E1', color: '#F57F17' },
  reviewing: { bg: '#E3F2FD', color: '#1565C0' },
  completed: { bg: '#E8F5E9', color: '#2E7D32' },
  cancelled: { bg: '#FFEBEE', color: '#C62828' },
}

const STATUS_LABEL: Record<string, string> = {
  pending: '대기중', reviewing: '검토중', completed: '완료', cancelled: '취소',
}

const TIER_LABEL: Record<string, string> = { general: '일반', premium: '프리미엄' }
const TIER_STYLE: Record<string, { bg: string; color: string }> = {
  general: { bg: '#F5F5F5', color: '#777' },
  premium: { bg: '#FFF8E1', color: '#B8860B' },
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  new: '신규 시공', remodel: '리모델링', consult: '컨설팅 상담',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

/* ── User Detail Modal ── */
function UserModal({
  userId,
  token,
  onClose,
  onChanged,
}: {
  userId: string
  token: string
  onClose: () => void
  onChanged: () => void
}) {
  const [detail, setDetail]   = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tierSaving, setTierSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const [forceWithdrawReason, setForceWithdrawReason] = useState('')
  const [withdrawSaving, setWithdrawSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setDetail(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId, token])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const provStyle = detail ? (PROVIDER_STYLE[detail.user.provider] ?? PROVIDER_STYLE.email) : PROVIDER_STYLE.email

  const handleToggleTier = async () => {
    if (!detail) return
    const nextTier = detail.user.membership_tier === 'premium' ? 'general' : 'premium'
    setTierSaving(true)
    setActionError('')
    try {
      const res = await fetch(`/api/admin/users/${userId}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier: nextTier }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.message ?? '등급 변경에 실패했습니다.')
        return
      }
      setDetail(prev => prev ? { ...prev, user: { ...prev.user, ...data.user } } : prev)
      onChanged()
    } catch {
      setActionError('네트워크 오류가 발생했습니다.')
    } finally {
      setTierSaving(false)
    }
  }

  const handleForceWithdraw = async () => {
    setWithdrawSaving(true)
    setActionError('')
    try {
      const res = await fetch(`/api/admin/users/${userId}/force-withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: forceWithdrawReason }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.message ?? '강제 탈퇴에 실패했습니다.')
        return
      }
      onChanged()
      onClose()
    } catch {
      setActionError('네트워크 오류가 발생했습니다.')
    } finally {
      setWithdrawSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />

      <div style={ms.panel}>
        {/* Header */}
        <div style={ms.header}>
          {loading || !detail ? (
            <div style={{ flex: 1 }}>
              <div style={{ ...ms.skel, width: 120, height: 20, marginBottom: 8 }} />
              <div style={{ ...ms.skel, width: 200, height: 14 }} />
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2 style={ms.userName}>
                  {detail.user.name}
                  {detail.user.membership_tier === 'premium' && <PremiumBadge style={{ marginLeft: 6 }} />}
                </h2>
                <span style={{ ...ms.provBadge, background: provStyle.bg, color: provStyle.color }}>
                  {PROVIDER_LABEL[detail.user.provider] ?? detail.user.provider}
                </span>
              </div>
              <p style={ms.userEmail}>{detail.user.email}</p>
            </div>
          )}
          <button style={ms.closeBtn} onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <div style={ms.body}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[200, 150, 180, 160].map((w, i) => <div key={i} style={{ ...ms.skel, width: w, height: 14 }} />)}
            </div>
          ) : !detail ? (
            <p style={{ fontSize: 14, color: '#aaa', textAlign: 'center', padding: 32 }}>불러오기 실패</p>
          ) : (
            <>
              {/* 기본 정보 */}
              <section style={ms.section}>
                <p style={ms.sectionLabel}>기본 정보</p>
                <div style={ms.infoCard}>
                  {[
                    ['이름',     detail.user.name],
                    ['이메일',   detail.user.email],
                    ['전화번호', detail.user.phone ?? '—'],
                    ['가입방법', PROVIDER_LABEL[detail.user.provider] ?? detail.user.provider],
                    ['가입일',   formatDate(detail.user.created_at)],
                    ['의뢰 수',  `${detail.orders.length}건`],
                  ].map(([label, value]) => (
                    <div key={label} style={ms.infoRow}>
                      <span style={ms.infoLabel}>{label}</span>
                      <span style={ms.infoValue}>{value}</span>
                    </div>
                  ))}
                  <div style={ms.infoRow}>
                    <span style={ms.infoLabel}>등급</span>
                    <span style={ms.infoValue}>
                      <span style={{
                        ...ms.badge,
                        ...(TIER_STYLE[detail.user.membership_tier] ?? TIER_STYLE.general),
                      }}>
                        {TIER_LABEL[detail.user.membership_tier] ?? detail.user.membership_tier}
                      </span>
                      {detail.user.premium_since && (
                        <span style={{ fontSize: 12, color: '#aaa', marginLeft: 8 }}>
                          ({formatDate(detail.user.premium_since)}부터, {detail.user.premium_upgraded_by ?? '—'} 승급)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </section>

              {/* 관리 액션 */}
              {detail.user.status !== 'withdrawn' && (
                <section style={ms.section}>
                  <p style={ms.sectionLabel}>관리</p>
                  {actionError && (
                    <p style={{ fontSize: 12, color: '#E53935', marginBottom: 8 }}>{actionError}</p>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginBottom: showWithdrawConfirm ? 12 : 0 }}>
                    <button
                      onClick={handleToggleTier}
                      disabled={tierSaving}
                      style={ms.actionBtn}
                    >
                      {tierSaving
                        ? '처리 중...'
                        : detail.user.membership_tier === 'premium' ? '일반으로 강등' : '프리미엄으로 승급'}
                    </button>
                    <button
                      onClick={() => setShowWithdrawConfirm(v => !v)}
                      style={{ ...ms.actionBtn, color: '#E53935', borderColor: '#FFCDD2' }}
                    >
                      강제 탈퇴
                    </button>
                  </div>

                  {showWithdrawConfirm && (
                    <div style={{ background: '#FFF5F5', border: '1px solid #FFCDD2', borderRadius: 8, padding: 12 }}>
                      <input
                        type="text"
                        value={forceWithdrawReason}
                        onChange={e => setForceWithdrawReason(e.target.value)}
                        placeholder="탈퇴 사유 (선택)"
                        style={ms.reasonInput}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          onClick={handleForceWithdraw}
                          disabled={withdrawSaving}
                          style={{ ...ms.actionBtn, background: '#E53935', color: '#fff', border: 'none' }}
                        >
                          {withdrawSaving ? '처리 중...' : '탈퇴 확정'}
                        </button>
                        <button
                          onClick={() => { setShowWithdrawConfirm(false); setForceWithdrawReason('') }}
                          style={ms.actionBtn}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* 의뢰 목록 */}
              <section style={ms.section}>
                <p style={ms.sectionLabel}>
                  의뢰 목록
                  <span style={ms.countChip}>{detail.orders.length}</span>
                </p>
                {detail.orders.length === 0 ? (
                  <p style={ms.empty}>등록된 의뢰가 없습니다.</p>
                ) : (
                  <div style={ms.miniTable}>
                    <div style={ms.miniThead}>
                      {['건물주소', '유형', '상태', '등록일'].map(h => (
                        <span key={h} style={ms.miniTh}>{h}</span>
                      ))}
                    </div>
                    {detail.orders.map(o => {
                      const badge = STATUS_STYLE[o.status] ?? { bg: '#f5f5f5', color: '#777' }
                      return (
                        <div key={o.id} style={ms.miniRow}>
                          <span style={{ ...ms.miniTd, flex: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                            {o.building_address}
                          </span>
                          <span style={ms.miniTd}>{ORDER_TYPE_LABEL[o.order_type] ?? o.order_type}</span>
                          <span style={ms.miniTd}>
                            <span style={{ ...ms.badge, background: badge.bg, color: badge.color }}>
                              {STATUS_LABEL[o.status] ?? o.status}
                            </span>
                          </span>
                          <span style={{ ...ms.miniTd, color: '#888' }}>{formatDate(o.created_at)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* 파일 목록 */}
              <section style={ms.section}>
                <p style={ms.sectionLabel}>
                  업로드 파일
                  <span style={ms.countChip}>{detail.documents.length}</span>
                </p>
                {detail.documents.length === 0 ? (
                  <p style={ms.empty}>업로드된 파일이 없습니다.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detail.documents.map(doc => (
                      <div key={doc.id} style={ms.docRow}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" style={{ flexShrink: 0 }}>
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={ms.docName} title={doc.file_name}>{doc.file_name}</p>
                          <p style={ms.docMeta}>의뢰 #{doc.order_id}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            style={ms.docBtn}
                            disabled={!doc.viewUrl}
                            onClick={() => doc.viewUrl && window.open(doc.viewUrl, '_blank')}
                          >
                            열람
                          </button>
                          <button
                            style={ms.docBtn}
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
            </>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Main Page ── */
export default function AdminUsers() {
  const router = useRouter()
  const [activeTab, setActiveTab]   = useState<'active' | 'withdrawn'>('active')
  const [users, setUsers]           = useState<UserRow[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [token, setToken]           = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchUsers = useCallback(async (tk: string, q: string, pg: number, tab: 'active' | 'withdrawn') => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(pg), status: tab })
    if (q) params.set('search', q)
    const res = await fetch(`/api/admin/users/list?${params}`, {
      headers: { Authorization: `Bearer ${tk}` },
    })
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users)
      setTotal(data.total)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/admin/login'); return }
      setToken(session.access_token)
      fetchUsers(session.access_token, '', 1, 'active')
    })
  }, [router, fetchUsers])

  useEffect(() => {
    if (!token) return
    fetchUsers(token, search, page, activeTab)
  }, [search, page, activeTab, token, fetchUsers])

  const handleTabChange = (tab: 'active' | 'withdrawn') => {
    setActiveTab(tab)
    setPage(1)
    setSearch('')
    setSearchInput('')
  }

  const handleSearchChange = (v: string) => {
    setSearchInput(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1) }, 400)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut()
    router.replace('/admin/login')
  }

  return (
    <>
      <Head><title>회원 관리 | THE OKTOP 관리자</title></Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f4f4; }
        a { text-decoration: none; color: inherit; }
        .user-row:hover { background: #f9f9f9 !important; }
        .btn-logout:hover { background: #333; }
        .page-btn:hover:not(:disabled) { background: #f0f0f0; }
        .doc-btn-hover:hover { background: #f0f0f0 !important; }
      `}</style>

      <div style={s.root}>

        {/* ── 헤더 ── */}
        <header style={s.header}>
          <div style={s.headerInner}>
            <Link href="/admin/dashboard" style={s.logo}>
              THE OKTOP <span style={s.adminBadge}>관리자</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link href="/" style={s.btnHome}>메인페이지로 이동</Link>
              <button style={s.btnLogout} className="btn-logout" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          </div>
        </header>

        <main style={s.main}>

          {/* ── 타이틀 ── */}
          <div style={s.titleRow}>
            <Link href="/admin/dashboard" style={s.breadcrumb}>← 대시보드</Link>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <h1 style={s.h1}>회원 관리</h1>
              <span style={s.totalText}>총 {total.toLocaleString()}명</span>
            </div>
          </div>

          {/* ── 탭 ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => handleTabChange('active')}
              style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid',
                borderColor: activeTab === 'active' ? '#111' : '#ddd',
                background: activeTab === 'active' ? '#111' : '#fff',
                color: activeTab === 'active' ? '#fff' : '#333',
                fontSize: 14, cursor: 'pointer', fontWeight: activeTab === 'active' ? 600 : 400,
              }}
            >
              활성 회원
            </button>
            <button
              onClick={() => handleTabChange('withdrawn')}
              style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid',
                borderColor: activeTab === 'withdrawn' ? '#e74c3c' : '#ddd',
                background: activeTab === 'withdrawn' ? '#e74c3c' : '#fff',
                color: activeTab === 'withdrawn' ? '#fff' : '#333',
                fontSize: 14, cursor: 'pointer', fontWeight: activeTab === 'withdrawn' ? 600 : 400,
              }}
            >
              탈퇴 회원
            </button>
          </div>

          {/* ── 검색 ── */}
          <div style={s.searchWrap}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="이름, 이메일 검색"
              style={s.searchInput}
            />
          </div>

          {/* ── 테이블 ── */}
          <div style={s.tableWrap}>
            {activeTab === 'active' ? (
              <table style={s.table}>
                <thead>
                  <tr>
                    {['이름', '이메일', '전화번호', '가입방법', '등급', '가입일', '의뢰 수'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {[100, 200, 130, 70, 70, 100, 50].map((w, j) => (
                          <td key={j} style={s.td}>
                            <div style={{ height: 14, width: w, borderRadius: 4, background: 'linear-gradient(90deg,#eee 25%,#f5f5f5 50%,#eee 75%)', backgroundSize: '200% 100%' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ ...s.td, textAlign: 'center', padding: '48px', color: '#bbb' }}>
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    users.map(u => {
                      const prov = PROVIDER_STYLE[u.provider] ?? PROVIDER_STYLE.email
                      const tier = TIER_STYLE[u.membership_tier] ?? TIER_STYLE.general
                      const isPremium = u.membership_tier === 'premium'
                      return (
                        <tr
                          key={u.id}
                          className="user-row"
                          style={{ ...s.tr, cursor: 'pointer' }}
                          onClick={() => setSelectedId(u.id)}
                        >
                          <td style={{ ...s.td, fontWeight: 600 }}>
                            {isPremium && <PremiumBadge style={{ marginRight: 4 }} />}
                            {u.name}
                            {u.is_rejoined && (
                              <span style={{ ...s.badge, marginLeft: 6, background: '#FFF3E0', color: '#E65100' }}>
                                재가입
                              </span>
                            )}
                          </td>
                          <td style={{ ...s.td, color: '#555' }}>{u.email}</td>
                          <td style={{ ...s.td, color: '#888' }}>{u.phone ?? '—'}</td>
                          <td style={s.td}>
                            <span style={{ ...s.badge, background: prov.bg, color: prov.color }}>
                              {getProviderLabel(u.provider)}
                            </span>
                          </td>
                          <td style={s.td}>
                            <span style={{ ...s.badge, background: tier.bg, color: tier.color }}>
                              {TIER_LABEL[u.membership_tier] ?? u.membership_tier}
                            </span>
                          </td>
                          <td style={{ ...s.td, color: '#888', fontSize: 13 }}>{formatDate(u.created_at)}</td>
                          <td style={{ ...s.td, textAlign: 'center' as const }}>
                            {u.order_count > 0 ? (
                              <span style={{ ...s.badge, background: '#EDE7F6', color: '#4527A0' }}>
                                {u.order_count}건
                              </span>
                            ) : (
                              <span style={{ color: '#ccc', fontSize: 13 }}>—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    {['이름', '이메일', '가입방법', '탈퇴 날짜', '탈퇴 사유', '의뢰 수', '문의 수'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {[100, 200, 70, 100, 150, 50, 50].map((w, j) => (
                          <td key={j} style={s.td}>
                            <div style={{ height: 14, width: w, borderRadius: 4, background: 'linear-gradient(90deg,#eee 25%,#f5f5f5 50%,#eee 75%)', backgroundSize: '200% 100%' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ ...s.td, textAlign: 'center', padding: '48px', color: '#bbb' }}>
                        탈퇴 회원이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id} style={s.tr}>
                        <td style={{ ...s.td, fontWeight: 600 }}>{u.name || '—'}</td>
                        <td style={{ ...s.td, color: '#555' }}>{u.email}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, ...(PROVIDER_STYLE[u.provider] ?? PROVIDER_STYLE.email) }}>
                            {getProviderLabel(u.provider)}
                          </span>
                        </td>
                        <td style={{ ...s.td, color: '#888', fontSize: 13 }}>
                          {u.withdrawn_at ? formatDate(u.withdrawn_at) : '—'}
                        </td>
                        <td style={{ ...s.td, color: '#666', fontSize: 13, maxWidth: 200 }}>
                          {u.withdraw_reason || '—'}
                        </td>
                        <td style={{ ...s.td, textAlign: 'center' as const }}>
                          {u.order_count > 0
                            ? <span style={{ ...s.badge, background: '#EDE7F6', color: '#4527A0' }}>{u.order_count}건</span>
                            : <span style={{ color: '#ccc', fontSize: 13 }}>—</span>}
                        </td>
                        <td style={{ ...s.td, textAlign: 'center' as const }}>
                          {u.inquiry_count > 0
                            ? <span style={{ ...s.badge, background: '#E3F2FD', color: '#1565C0' }}>{u.inquiry_count}건</span>
                            : <span style={{ color: '#ccc', fontSize: 13 }}>—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* ── 페이지네이션 ── */}
          {totalPages > 1 && (
            <div style={s.pagination}>
              <button
                style={s.pageBtn} className="page-btn"
                disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              >← 이전</button>
              <span style={s.pageInfo}>{page} / {totalPages}</span>
              <button
                style={s.pageBtn} className="page-btn"
                disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              >다음 →</button>
            </div>
          )}

        </main>
      </div>

      {/* ── 상세 모달 ── */}
      {selectedId !== null && (
        <UserModal
          userId={selectedId}
          token={token}
          onClose={() => setSelectedId(null)}
          onChanged={() => fetchUsers(token, search, page, activeTab)}
        />
      )}
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
  btnHome: { padding: '7px 16px', background: '#333', color: '#ccc', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', transition: 'background 0.15s', textDecoration: 'none' },

  main: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px 64px' },
  titleRow: { marginBottom: 24 },
  breadcrumb: { fontSize: 13, color: '#888', display: 'block', marginBottom: 10 },
  h1: { fontSize: 24, fontWeight: 700, color: '#111' },
  totalText: { fontSize: 13, color: '#aaa' },

  searchWrap: { position: 'relative' as const, marginBottom: 16, maxWidth: 360 },
  searchInput: { width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' },

  tableWrap: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '13px 16px', textAlign: 'left' as const, fontSize: 12, fontWeight: 600, color: '#888', borderBottom: '1px solid #f0f0f0', background: '#fafafa', whiteSpace: 'nowrap' as const },
  td: { padding: '13px 16px', fontSize: 14, color: '#333', borderBottom: '1px solid #f5f5f5' },
  tr: { background: '#fff', transition: 'background 0.1s' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },

  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 24 },
  pageBtn: { padding: '8px 20px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: '#fff', color: '#333', transition: 'background 0.15s' },
  pageInfo: { fontSize: 14, color: '#888' },
}

/* ── Modal Styles ── */
const ms: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: '100%', maxWidth: 680, maxHeight: '88vh',
    background: '#fff', borderRadius: 16, zIndex: 1001,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
  },
  header: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '24px 24px 20px', borderBottom: '1px solid #f0f0f0',
  },
  userName: { fontSize: 18, fontWeight: 700, color: '#111' },
  userEmail: { fontSize: 13, color: '#aaa', marginTop: 4 },
  provBadge: { display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  closeBtn: { flexShrink: 0, width: 32, height: 32, border: 'none', background: '#f5f5f5', borderRadius: '50%', fontSize: 14, cursor: 'pointer', color: '#666' },

  body: { flex: 1, overflowY: 'auto' as const, padding: 24 },

  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: '#888', letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 },
  countChip: { fontSize: 11, fontWeight: 600, background: '#f0f0f0', color: '#666', padding: '1px 7px', borderRadius: 9 },

  infoCard: { background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 10, overflow: 'hidden' },
  infoRow: { display: 'flex', gap: 12, padding: '10px 16px', borderBottom: '1px solid #f0f0f0' },
  infoLabel: { fontSize: 13, color: '#888', width: 72, flexShrink: 0 },
  infoValue: { fontSize: 14, color: '#222', fontWeight: 500 },

  miniTable: { border: '1px solid #f0f0f0', borderRadius: 10, overflow: 'hidden' },
  miniThead: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '8px 12px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' },
  miniTh: { fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase' as const },
  miniRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 12px', borderBottom: '1px solid #f5f5f5', alignItems: 'center' },
  miniTd: { fontSize: 13, color: '#333' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 },

  docRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' },
  docName: { fontSize: 13, color: '#333', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  docMeta: { fontSize: 11, color: '#bbb', marginTop: 2 },
  docBtn: { padding: '5px 11px', border: '1.5px solid #e0e0e0', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: '#fff', color: '#555', whiteSpace: 'nowrap' as const },

  empty: { fontSize: 13, color: '#bbb', padding: '12px 0' },
  skel: { borderRadius: 4, background: 'linear-gradient(90deg,#eee 25%,#f5f5f5 50%,#eee 75%)', backgroundSize: '200% 100%' },

  actionBtn: {
    padding: '8px 14px', border: '1.5px solid #ddd', borderRadius: 8,
    fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#fff', color: '#333',
  },
  reasonInput: {
    width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6,
    fontSize: 13, outline: 'none', boxSizing: 'border-box' as const,
  },
}
