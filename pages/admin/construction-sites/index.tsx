import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { getSupabaseClient } from '../../../lib/supabase'

interface SiteImage { url: string; order: number }

interface Site {
  id: number
  title: string
  address: string | null
  progress_rate: number | null
  construction_status: string
  is_featured_on_main: boolean
  status: string
  created_at: string
  images: SiteImage[]
}

const CONSTRUCTION_STATUS_LABEL: Record<string, string> = { ongoing: '시공중', completed: '완공' }
const CONSTRUCTION_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ongoing: { bg: '#E3F2FD', color: '#1565C0' },
  completed: { bg: '#E8F5E9', color: '#2E7D32' },
}
const PUBLISH_STATUS_LABEL: Record<string, string> = { published: '공개', draft: '비공개' }
const PUBLISH_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  published: { bg: '#E8F5E9', color: '#2E7D32' },
  draft: { bg: '#F5F5F5', color: '#777' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function ConstructionSitesAdmin() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')

  const fetchSites = useCallback(async (tk: string) => {
    setLoading(true)
    const res = await fetch('/api/admin/construction-sites', {
      headers: { Authorization: `Bearer ${tk}` },
    })
    if (res.ok) {
      const data = await res.json()
      setSites(data.sites)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/admin/login'); return }
      setToken(session.access_token)
      fetchSites(session.access_token)
    })
  }, [router, fetchSites])

  const handleToggleFeatured = async (site: Site) => {
    setSites(prev => prev.map(s => s.id === site.id ? { ...s, is_featured_on_main: !s.is_featured_on_main } : s))
    const res = await fetch(`/api/admin/construction-sites/${site.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_featured_on_main: !site.is_featured_on_main }),
    })
    if (!res.ok) {
      // 실패 시 롤백
      setSites(prev => prev.map(s => s.id === site.id ? { ...s, is_featured_on_main: site.is_featured_on_main } : s))
      alert('메인노출 변경에 실패했습니다.')
    }
  }

  const handleDelete = async (site: Site) => {
    if (!confirm(`"${site.title}"을 삭제하시겠습니까? 업로드된 이미지도 함께 삭제됩니다.`)) return
    const res = await fetch(`/api/admin/construction-sites/${site.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      fetchSites(token)
    } else {
      alert('삭제에 실패했습니다.')
    }
  }

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut()
    router.replace('/admin/login')
  }

  return (
    <>
      <Head><title>시공현장 관리 | THE OKTOP 관리자</title></Head>
      <style>{`
        * { box-sizing: border-box; }
        a { text-decoration: none; color: inherit; }
        .site-row:hover { background: #f9f9f9 !important; }
        .btn-logout:hover { background: #333; }
      `}</style>

      <div style={s.root}>
        <header style={s.header}>
          <div style={s.headerInner}>
            <Link href="/admin/dashboard" style={s.logo}>
              THE OKTOP <span style={s.adminBadge}>관리자</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link href="/" style={s.btnHome}>메인페이지로 이동</Link>
              <button style={s.btnLogout} className="btn-logout" onClick={handleLogout}>로그아웃</button>
            </div>
          </div>
        </header>

        <main style={s.main}>
          <div style={s.titleRow}>
            <Link href="/admin/dashboard" style={s.breadcrumb}>← 대시보드</Link>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h1 style={s.h1}>시공현장 관리</h1>
              <Link href="/admin/construction-sites/new" style={s.btnNew}>+ 신규 등록</Link>
            </div>
          </div>

          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['썸네일', '제목', '주소', '공정률', '시공상태', '메인노출', '상태', '등록일', ''].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ ...s.td, textAlign: 'center', padding: 48, color: '#bbb' }}>불러오는 중...</td></tr>
                ) : sites.length === 0 ? (
                  <tr><td colSpan={9} style={{ ...s.td, textAlign: 'center', padding: 48, color: '#bbb' }}>등록된 시공현장이 없습니다.</td></tr>
                ) : (
                  sites.map(site => {
                    const cStyle = CONSTRUCTION_STATUS_STYLE[site.construction_status] ?? CONSTRUCTION_STATUS_STYLE.ongoing
                    const pStyle = PUBLISH_STATUS_STYLE[site.status] ?? PUBLISH_STATUS_STYLE.draft
                    const thumb = site.images?.[0]?.url
                    return (
                      <tr key={site.id} className="site-row" style={s.tr}>
                        <td style={s.td}>
                          {thumb ? (
                            <img src={thumb} alt={site.title} style={s.thumb} />
                          ) : (
                            <div style={{ ...s.thumb, background: '#f0f0f0' }} />
                          )}
                        </td>
                        <td style={{ ...s.td, fontWeight: 600 }}>{site.title}</td>
                        <td style={{ ...s.td, color: '#555' }}>{site.address ?? '—'}</td>
                        <td style={{ ...s.td, color: '#555' }}>{site.progress_rate != null ? `${site.progress_rate}%` : '—'}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: cStyle.bg, color: cStyle.color }}>
                            {CONSTRUCTION_STATUS_LABEL[site.construction_status] ?? site.construction_status}
                          </span>
                        </td>
                        <td style={s.td}>
                          <label style={s.switchLabel}>
                            <input
                              type="checkbox"
                              checked={site.is_featured_on_main}
                              onChange={() => handleToggleFeatured(site)}
                            />
                            <span>{site.is_featured_on_main ? '노출중' : '미노출'}</span>
                          </label>
                        </td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: pStyle.bg, color: pStyle.color }}>
                            {PUBLISH_STATUS_LABEL[site.status] ?? site.status}
                          </span>
                        </td>
                        <td style={{ ...s.td, color: '#888', fontSize: 13 }}>{formatDate(site.created_at)}</td>
                        <td style={{ ...s.td, whiteSpace: 'nowrap' as const }}>
                          <Link href={`/admin/construction-sites/${site.id}/edit`} style={s.actionBtn}>수정</Link>
                          <button onClick={() => handleDelete(site)} style={{ ...s.actionBtn, color: '#E53935' }}>삭제</button>
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
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#f4f4f4', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif" },
  header: { background: '#111', padding: '0 24px' },
  headerInner: { maxWidth: 1200, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 10 },
  adminBadge: { fontSize: 11, fontWeight: 500, background: 'rgba(255,255,255,0.15)', color: '#ccc', padding: '2px 8px', borderRadius: 20 },
  btnLogout: { padding: '7px 16px', background: '#333', color: '#ccc', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  btnHome: { padding: '7px 16px', background: '#333', color: '#ccc', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', textDecoration: 'none' },

  main: { maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' },
  titleRow: { marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 },
  breadcrumb: { fontSize: 13, color: '#888' },
  h1: { fontSize: 24, fontWeight: 700, color: '#111' },
  btnNew: { padding: '9px 18px', background: '#111', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 },

  tableWrap: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '13px 16px', textAlign: 'left' as const, fontSize: 12, fontWeight: 600, color: '#888', borderBottom: '1px solid #f0f0f0', background: '#fafafa', whiteSpace: 'nowrap' as const },
  td: { padding: '13px 16px', fontSize: 14, color: '#333', borderBottom: '1px solid #f5f5f5' },
  tr: { background: '#fff' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  thumb: { width: 56, height: 40, borderRadius: 6, objectFit: 'cover' as const },
  switchLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', cursor: 'pointer' },
  actionBtn: { display: 'inline-block', padding: '6px 12px', marginRight: 6, background: 'none', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, color: '#555', cursor: 'pointer' },
}
