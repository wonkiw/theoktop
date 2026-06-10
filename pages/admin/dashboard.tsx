import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

interface Stats {
  todayOrders: number
  pendingOrders: number
  unansweredInquiries: number
  totalUsers: number
}

interface AdminInfo {
  name: string
  email: string
  role: string
}

const MENU_CARDS = [
  {
    href: '/admin/orders',
    label: '의뢰 관리',
    desc: '접수된 시공 의뢰를 확인하고 처리합니다',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/>
        <line x1="9" y1="16" x2="13" y2="16"/>
      </svg>
    ),
    roles: ['admin', 'superadmin'],
  },
  {
    href: '/admin/users',
    label: '회원 관리',
    desc: '가입된 회원 정보를 조회하고 관리합니다',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    roles: ['admin', 'superadmin'],
  },
  {
    href: '/admin/inquiries',
    label: '문의 관리',
    desc: '고객 문의를 확인하고 답변을 등록합니다',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    roles: ['admin', 'superadmin'],
  },
  {
    href: '/admin/accounts',
    label: '관리자 계정',
    desc: '관리자 계정을 생성하고 권한을 관리합니다',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7"/>
        <path d="M17 17l2 2 4-4"/>
      </svg>
    ),
    roles: ['superadmin'],
  },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats]         = useState<Stats | null>(null)
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null)
  const [statsError, setStatsError] = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/admin/login')
        return
      }

      const token = session.access_token

      // 역할 확인 (미들웨어에서 DB 조회 제거로 인한 클라이언트 측 보완)
      const roleRes = await fetch('/api/admin/auth/check-role', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const roleJson = await roleRes.json()
      if (cancelled) return
      if (!roleJson.success || (roleJson.role !== 'admin' && roleJson.role !== 'superadmin')) {
        router.replace('/403')
        return
      }

      // 프로필 + 통계 병렬 조회
      const [profileRes, statsRes] = await Promise.all([
        fetch('/api/mypage/profile', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/stats',    { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (cancelled) return

      if (profileRes.ok) {
        const { user } = await profileRes.json()
        setAdminInfo({ name: user.name, email: user.email, role: user.role })
      }

      if (statsRes.ok) {
        const { stats } = await statsRes.json()
        setStats(stats)
      } else {
        setStatsError(true)
      }

      setLoading(false)
    }

    init()
    return () => { cancelled = true }
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  const visibleMenus = MENU_CARDS.filter(m =>
    adminInfo ? m.roles.includes(adminInfo.role) : m.roles.includes('admin')
  )

  return (
    <>
      <Head><title>관리자 대시보드 | THE OKTOP</title></Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f4f4; }
        a { text-decoration: none; color: inherit; }

        .stat-card:hover  { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
        .menu-card:hover  { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
        .btn-logout:hover { background: #333; }

        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .menu-grid  { grid-template-columns: repeat(2, 1fr) !important; }
          .header-inner { flex-wrap: wrap; gap: 12px !important; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .menu-grid  { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={s.root}>

        {/* ── 헤더 ── */}
        <header style={s.header}>
          <div style={s.headerInner} className="header-inner">
            <span style={s.logo}>THE OKTOP <span style={s.adminBadge}>관리자</span></span>

            <div style={s.headerRight}>
              {adminInfo && (
                <div style={s.adminInfo}>
                  <span style={s.adminName}>{adminInfo.name}</span>
                  <span style={s.adminEmail}>{adminInfo.email}</span>
                </div>
              )}
              <button
                style={s.btnLogout}
                className="btn-logout"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>

        <main style={s.main}>

          {/* ── 타이틀 ── */}
          <div style={s.pageTitle}>
            <h1 style={s.h1}>대시보드</h1>
            <p style={s.dateText}>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</p>
          </div>

          {/* ── 통계 카드 ── */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>현황</h2>
            {loading ? (
              <div className="stats-grid" style={{ ...s.statsGrid }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ ...s.statCard, ...s.skeleton }} />
                ))}
              </div>
            ) : statsError ? (
              <p style={s.errorText}>통계를 불러오지 못했습니다.</p>
            ) : stats && (
              <div className="stats-grid" style={s.statsGrid}>
                <StatCard
                  label="오늘 신규 의뢰"
                  value={stats.todayOrders}
                  unit="건"
                  color="#111"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  }
                />
                <StatCard
                  label="미처리 의뢰"
                  value={stats.pendingOrders}
                  unit="건"
                  color="#E53935"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/>
                    </svg>
                  }
                />
                <StatCard
                  label="미답변 문의"
                  value={stats.unansweredInquiries}
                  unit="건"
                  color="#F57C00"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                  }
                />
                <StatCard
                  label="전체 회원"
                  value={stats.totalUsers}
                  unit="명"
                  color="#1565C0"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    </svg>
                  }
                />
              </div>
            )}
          </section>

          {/* ── 메뉴 카드 ── */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>관리 메뉴</h2>
            <div className="menu-grid" style={s.menuGrid}>
              {visibleMenus.map(m => (
                <Link key={m.href} href={m.href}>
                  <div className="menu-card" style={s.menuCard}>
                    <div style={s.menuIcon}>{m.icon}</div>
                    <div>
                      <p style={s.menuLabel}>{m.label}</p>
                      <p style={s.menuDesc}>{m.desc}</p>
                    </div>
                    <div style={s.menuArrow}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

        </main>
      </div>
    </>
  )
}

function StatCard({ label, value, unit, color, icon }: {
  label: string
  value: number
  unit: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="stat-card" style={s.statCard}>
      <div style={{ ...s.statIcon, color }}>{icon}</div>
      <p style={s.statLabel}>{label}</p>
      <p style={s.statValue}>
        <span style={{ color }}>{value.toLocaleString()}</span>
        <span style={s.statUnit}>{unit}</span>
      </p>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#f4f4f4',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },

  // Header
  header: {
    background: '#111',
    padding: '0 24px',
  },
  headerInner: {
    maxWidth: 1100,
    margin: '0 auto',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  logo: {
    fontSize: 16,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  adminBadge: {
    fontSize: 11,
    fontWeight: 500,
    background: 'rgba(255,255,255,0.15)',
    color: '#ccc',
    padding: '2px 8px',
    borderRadius: 20,
    letterSpacing: 0.5,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  adminInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: 2,
  },
  adminName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
  },
  adminEmail: {
    fontSize: 11,
    color: '#888',
  },
  btnLogout: {
    padding: '7px 16px',
    background: '#333',
    color: '#ccc',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap' as const,
  },

  // Main
  main: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 24px 64px',
  },
  pageTitle: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 32,
  },
  h1: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111',
  },
  dateText: {
    fontSize: 13,
    color: '#999',
  },

  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 14,
  },

  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
  },
  statCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  skeleton: {
    height: 110,
    background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
  },
  statIcon: {
    opacity: 0.8,
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: 500,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 800,
    color: '#111',
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
  },
  statUnit: {
    fontSize: 14,
    fontWeight: 500,
    color: '#aaa',
  },

  // Menu
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
  },
  menuCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    position: 'relative' as const,
    height: '100%',
  },
  menuIcon: {
    color: '#333',
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: '#111',
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 12,
    color: '#999',
    lineHeight: 1.5,
  },
  menuArrow: {
    position: 'absolute' as const,
    top: 20,
    right: 20,
  },

  errorText: {
    fontSize: 13,
    color: '#E53935',
    padding: '12px 0',
  },
}
