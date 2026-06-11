import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import styles from '../styles/Header.module.css'

export default function Header() {
  const router = useRouter()
  const [user, setUser]       = useState<User | null>(null)
  const [role, setRole]       = useState<string | null>(null)
  const [ready, setReady]     = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const fetchRole = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setRole(data.role ?? null)
      } else {
        setRole(null)
      }
    } catch {
      setRole(null)
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user ?? null
      setUser(u)
      if (u) fetchRole()
      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        fetchRole()
      } else {
        setRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 라우트 변경 시 모바일 메뉴 닫기
  useEffect(() => {
    const handleRouteChange = () => setMenuOpen(false)
    router.events.on('routeChangeStart', handleRouteChange)
    return () => router.events.off('routeChangeStart', handleRouteChange)
  }, [router.events])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setRole(null)
    setMenuOpen(false)
    router.push('/')
  }

  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split('@')[0] ??
    ''

  const isAdmin = role === 'admin' || role === 'superadmin'
  const myPageHref = isAdmin ? '/admin/dashboard' : '/mypage'
  const myPageLabel = isAdmin ? '관리자 대시보드' : '마이페이지'

  const AuthDesktop = () =>
    user ? (
      <>
        <span className={styles.greeting}>{displayName}님</span>
        <Link href={myPageHref} className={styles.navLink}>{myPageLabel}</Link>
        <button onClick={handleLogout} className={styles.logoutBtn}>로그아웃</button>
      </>
    ) : (
      <>
        <Link href="/login"    className={styles.navLink}>로그인</Link>
        <Link href="/register" className={styles.ctaBtn}>회원가입</Link>
      </>
    )

  const AuthMobile = () =>
    user ? (
      <>
        <span className={styles.mobileGreeting}>{displayName}님</span>
        <Link href={myPageHref} className={styles.mobileLink}>{myPageLabel}</Link>
        <button onClick={handleLogout} className={styles.mobileLogout}>로그아웃</button>
      </>
    ) : (
      <>
        <Link href="/login"    className={styles.mobileLink}>로그인</Link>
        <Link href="/register" className={styles.mobileCta}>회원가입</Link>
      </>
    )

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>THE OKTOP</Link>

        {/* Desktop */}
        <nav className={styles.nav}>
          {ready && <AuthDesktop />}
        </nav>

        {/* Hamburger */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={menuOpen}
        >
          <span className={`${styles.bar} ${menuOpen ? styles.barTopOpen : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barMidOpen : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barBotOpen : ''}`} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {ready && <AuthMobile />}
        </div>
      )}
    </header>
  )
}
