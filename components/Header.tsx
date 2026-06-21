import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '../lib/supabase'

const GOLD = '#D4AF5C'
const DARK_BG = 'rgba(15,15,13,0.97)'

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole]     = useState<string | null>(null)
  const [ready, setReady]           = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)

  useEffect(() => {
    const supabase = getSupabaseClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
      if (session) {
        fetch('/api/auth/me')
          .then(res => res.json())
          .then(data => setUserRole(data.role))
          .catch(() => setUserRole('user'))
      }
      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session)
      if (!session) setUserRole(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleLogout = () => {
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim()
      if (name.includes('sb-') || name.includes('supabase')) {
        document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
        document.cookie = `${name}=; Path=/; Domain=.theoktop.com; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
      }
    })
    window.location.href = '/api/auth/logout'
  }

  const closeMenu = () => setMenuOpen(false)

  /* ── 모바일 메뉴 버튼 공통 스타일 ── */
  const mobileBtn = (extra?: React.CSSProperties): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    padding: '14px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: GOLD,
    fontSize: '15px',
    fontWeight: 500,
    textAlign: 'left',
    cursor: 'pointer',
    letterSpacing: '1px',
    fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
    ...extra,
  })

  return (
    <>
      <style>{`
        .oktop-header-nav a,
        .oktop-header-nav button {
          transition: opacity 0.15s;
        }
        .oktop-header-nav a:hover,
        .oktop-header-nav button:hover {
          opacity: 0.75;
        }
        .oktop-hamburger span {
          display: block;
          width: 22px;
          height: 2px;
          background: ${GOLD};
          border-radius: 2px;
          transition: all 0.25s;
          transform-origin: center;
        }
        .oktop-hamburger.open span:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .oktop-hamburger.open span:nth-child(2) {
          opacity: 0;
          transform: scaleX(0);
        }
        .oktop-hamburger.open span:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }
        @media (min-width: 769px) {
          .oktop-hamburger { display: none !important; }
          .oktop-overlay   { display: none !important; }
        }
        @media (max-width: 768px) {
          .oktop-header-nav { display: none !important; }
        }
      `}</style>

      {menuOpen && (
        <div
          onClick={closeMenu}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998 }}
          className="oktop-overlay"
        />
      )}

      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 999,
        background: DARK_BG,
        borderBottom: '1px solid rgba(212,175,92,0.15)',
        fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* 로고 */}
          <Link href="/" style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '3px',
            color: GOLD,
            textDecoration: 'none',
          }}>
            THE OKTOP
          </Link>

          {/* PC 버튼 */}
          <nav className="oktop-header-nav" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {ready && (isLoggedIn ? (
              <>
                <Link href="/mypage" style={{
                  padding: '8px 16px',
                  border: '1px solid rgba(212,175,92,0.6)',
                  color: 'rgba(255,255,255,0.88)',
                  background: 'transparent',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'none',
                }}>
                  마이페이지
                </Link>
                <Link href="/mypage/new-inquiry" style={{
                  padding: '8px 16px',
                  background: GOLD,
                  color: '#111',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}>
                  상담신청
                </Link>
                <button onClick={handleLogout} style={{
                  marginLeft: 8,
                  padding: '6px 14px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.5)',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '1px',
                }}>
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={() => { window.location.href = '/login' }}
                style={{
                  padding: '8px 18px',
                  background: GOLD,
                  color: '#111',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '1px',
                }}
              >
                로그인
              </button>
            ))}
          </nav>

          {/* 햄버거 */}
          <button
            className={`oktop-hamburger${menuOpen ? ' open' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            style={{
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '6px',
              display: 'flex', flexDirection: 'column',
              gap: 5, alignItems: 'center',
            }}
          >
            <span /><span /><span />
          </button>
        </div>

        {/* 모바일 드롭다운 */}
        {menuOpen && (
          <div style={{ background: 'rgba(18,18,15,0.98)', borderTop: `1px solid rgba(212,175,92,0.2)` }}>
            {ready && (isLoggedIn ? (
              <>
                <button
                  onClick={() => { closeMenu(); window.location.href = '/mypage' }}
                  style={mobileBtn()}
                >
                  마이페이지
                </button>
                <button
                  onClick={() => { closeMenu(); window.location.href = '/mypage/new-inquiry' }}
                  style={mobileBtn()}
                >
                  상담신청
                </button>
                <button
                  onClick={handleLogout}
                  style={mobileBtn({ borderBottom: 'none', fontSize: '14px', fontWeight: 400 })}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { closeMenu(); window.location.href = '/login' }}
                  style={mobileBtn()}
                >
                  마이페이지
                </button>
                <button
                  onClick={() => { closeMenu(); window.location.href = '/login' }}
                  style={mobileBtn({ borderBottom: 'none' })}
                >
                  상담신청
                </button>
              </>
            ))}
          </div>
        )}
      </header>
    </>
  )
}
