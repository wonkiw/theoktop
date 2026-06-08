import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'
import Header from '../../components/Header'

const MENUS = [
  {
    href: '/mypage/new-order',
    icon: '✏️',
    title: '새 의뢰 등록',
    desc: '옥탑 공사 의뢰를 신청하세요',
  },
  {
    href: '/mypage/orders',
    icon: '📋',
    title: '의뢰 현황',
    desc: '진행 중인 의뢰를 확인하세요',
  },
  {
    href: '/mypage/documents',
    icon: '📁',
    title: '문서 관리',
    desc: '업로드된 문서를 관리하세요',
  },
  {
    href: '/mypage/inquiry',
    icon: '💬',
    title: '문의하기',
    desc: '전문가에게 직접 문의하세요',
  },
]

export default function MyPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login?redirect=/mypage')
        return
      }
      setUser(data.user)
      setLoading(false)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
    padding: '0 24px 64px',
  },
  spinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: 15,
    color: '#999',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 0',
    borderBottom: '1px solid #ebebeb',
    marginBottom: 48,
  },
  logo: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 2,
    color: '#111',
    textDecoration: 'none',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  navLink: {
    fontSize: 14,
    color: '#555',
    textDecoration: 'none',
    fontWeight: 500,
  },
  logoutBtn: {
    padding: '8px 16px',
    background: 'transparent',
    color: '#888',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
  },
  greeting: {
    marginBottom: 40,
  },
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
  greetingDesc: {
    fontSize: 15,
    color: '#888',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 20,
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
  cardIcon: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: '#111',
    margin: 0,
  },
  cardDesc: {
    fontSize: 13,
    color: '#888',
    margin: 0,
    lineHeight: 1.5,
  },
  cardArrow: {
    position: 'absolute',
    top: 28,
    right: 28,
    fontSize: 16,
    color: '#ccc',
  },
}
