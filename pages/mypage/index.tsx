import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'
import Header from '../../components/Header'

const MENUS = [
  { href: '/mypage/new-order', icon: '✏️', title: '새 의뢰 등록', desc: '옥탑 공사 의뢰를 신청하세요' },
  { href: '/mypage/orders',    icon: '📋', title: '의뢰 현황',   desc: '진행 중인 의뢰를 확인하세요' },
  { href: '/mypage/documents', icon: '📁', title: '문서 관리',   desc: '업로드된 문서를 관리하세요' },
  { href: '/mypage/inquiry',   icon: '💬', title: '문의하기',    desc: '전문가에게 직접 문의하세요' },
]

const STATUS_LABEL: Record<string, string> = {
  pending:     '접수 대기',
  in_progress: '진행 중',
  completed:   '완료',
  cancelled:   '취소됨',
}

const STATUS_COLOR: Record<string, string> = {
  pending:     '#f59e0b',
  in_progress: '#3b82f6',
  completed:   '#10b981',
  cancelled:   '#9ca3af',
}

const INQUIRY_STATUS_LABEL: Record<string, string> = {
  pending:   '답변 대기',
  answered:  '답변 완료',
}

interface Order {
  id: number
  title: string
  status: string
  created_at: string
}

interface Inquiry {
  id: number
  title: string
  status: string
  created_at: string
  answered_at: string | null
}

export default function MyPage() {
  const router = useRouter()
  const [user, setUser]           = useState<User | null>(null)
  const [loading, setLoading]     = useState(true)
  const [orders, setOrders]       = useState<Order[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login?redirect=/mypage')
        return
      }
      setUser(session.user)
      setLoading(false)
      fetchRecent(session.access_token)
    })
  }, [])

  const fetchRecent = async (token: string) => {
    const headers = { Authorization: `Bearer ${token}` }
    const [ordersRes, inquiriesRes] = await Promise.all([
      fetch('/api/orders/list',      { headers }),
      fetch('/api/mypage/inquiries', { headers }),
    ])
    if (ordersRes.ok) {
      const json = await ordersRes.json()
      setOrders((json.orders ?? []).slice(0, 3))
    }
    if (inquiriesRes.ok) {
      const json = await inquiriesRes.json()
      setInquiries((json.inquiries ?? []).slice(0, 3))
    }
  }

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.spinner}>불러오는 중...</div>
      </div>
    )
  }

  const name =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split('@')[0] ??
    '사용자'

  return (
    <div style={s.page}>
      <Header />
      <div style={s.container}>

        {/* Greeting */}
        <section style={s.greeting}>
          <p style={s.greetingLabel}>마이페이지</p>
          <h1 style={s.greetingTitle}>
            안녕하세요, <span style={s.nameHighlight}>{name}</span>님
          </h1>
          <p style={s.greetingDesc}>무엇을 도와드릴까요?</p>
        </section>

        {/* Menu Grid */}
        <section style={s.grid}>
          {MENUS.map(menu => (
            <MenuCard key={menu.href} {...menu} />
          ))}
        </section>

        {/* Recent Orders */}
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>최근 상담내역</h2>
            <Link href="/mypage/orders" style={s.sectionLink}>전체 보기 →</Link>
          </div>
          {orders.length === 0 ? (
            <div style={s.empty}>
              <p style={s.emptyText}>아직 상담 내역이 없습니다.</p>
              <Link href="/mypage/new-order" style={s.emptyLink}>첫 의뢰 등록하기 →</Link>
            </div>
          ) : (
            <div style={s.listWrap}>
              {orders.map(order => (
                <Link key={order.id} href="/mypage/orders" style={s.listItem}>
                  <div style={s.listInfo}>
                    <span style={s.listTitle}>{order.title || `의뢰 #${order.id}`}</span>
                    <span style={s.listDate}>{formatDate(order.created_at)}</span>
                  </div>
                  <span style={{ ...s.badge, background: STATUS_COLOR[order.status] ?? '#9ca3af' }}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Inquiries */}
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>최근 문의 내용</h2>
            <Link href="/mypage/inquiry" style={s.sectionLink}>전체 보기 →</Link>
          </div>
          {inquiries.length === 0 ? (
            <div style={s.empty}>
              <p style={s.emptyText}>아직 문의 내역이 없습니다.</p>
              <Link href="/mypage/inquiry" style={s.emptyLink}>문의하기 →</Link>
            </div>
          ) : (
            <div style={s.listWrap}>
              {inquiries.map(inq => (
                <Link key={inq.id} href="/mypage/inquiry" style={s.listItem}>
                  <div style={s.listInfo}>
                    <span style={s.listTitle}>{inq.title}</span>
                    <span style={s.listDate}>{formatDate(inq.created_at)}</span>
                  </div>
                  <span style={{
                    ...s.badge,
                    background: inq.status === 'answered' ? '#10b981' : '#f59e0b',
                  }}>
                    {INQUIRY_STATUS_LABEL[inq.status] ?? inq.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

function MenuCard({ href, icon, title, desc }: typeof MENUS[number]) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={href}
      style={{ ...s.card, ...(hovered ? s.cardHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={s.cardIcon}>{icon}</span>
      <h3 style={s.cardTitle}>{title}</h3>
      <p style={s.cardDesc}>{desc}</p>
      <span style={s.cardArrow}>→</span>
    </Link>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f7f7f7',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  container: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '0 24px 80px',
  },
  spinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: 15,
    color: '#999',
  },
  greeting: { marginBottom: 40 },
  greetingLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    color: '#aaa',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#111',
    marginBottom: 8,
  },
  nameHighlight: {
    color: '#111',
    borderBottom: '3px solid #111',
    paddingBottom: 1,
  },
  greetingDesc: { fontSize: 15, color: '#888' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 20,
    marginBottom: 56,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    background: '#fff',
    borderRadius: 16,
    padding: '32px 28px',
    textDecoration: 'none',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '1.5px solid transparent',
    transition: 'all 0.2s',
    position: 'relative',
  },
  cardHover: {
    border: '1.5px solid #111',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
  },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 17, fontWeight: 700, color: '#111', margin: 0 },
  cardDesc: { fontSize: 13, color: '#888', margin: 0, lineHeight: 1.5 },
  cardArrow: { position: 'absolute', top: 28, right: 28, fontSize: 16, color: '#ccc' },

  section: { marginBottom: 48 },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#111', margin: 0 },
  sectionLink: { fontSize: 13, color: '#555', textDecoration: 'none', fontWeight: 500 },

  listWrap: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
    textDecoration: 'none',
    transition: 'background 0.15s',
  },
  listInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  listTitle: { fontSize: 14, fontWeight: 600, color: '#111' },
  listDate:  { fontSize: 12, color: '#aaa' },
  badge: {
    padding: '4px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    whiteSpace: 'nowrap',
  },

  empty: {
    background: '#fff',
    borderRadius: 12,
    padding: '32px 24px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  emptyText: { fontSize: 14, color: '#aaa', marginBottom: 12 },
  emptyLink: { fontSize: 13, color: '#111', fontWeight: 600, textDecoration: 'underline' },
}
