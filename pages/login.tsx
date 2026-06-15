import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { getSupabaseClient } from '../lib/supabase'

const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials':   '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Email not confirmed':         '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.',
  'Too many requests':           '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
  'User not found':              '존재하지 않는 계정입니다.',
}

function localizeError(msg: string) {
  return ERROR_MAP[msg] ?? '로그인에 실패했습니다. 다시 시도해주세요.'
}

export default function LoginPage() {
  const router = useRouter()
  const { error: queryError, redirect: redirectParam } = router.query

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)

  const getRedirectTarget = () => {
    if (typeof redirectParam === 'string' && redirectParam.startsWith('/')) {
      return redirectParam
    }
    return '/mypage'
  }

  // 이미 로그인된 경우(localStorage 세션 있지만 쿠키 없어서 미들웨어가 여기로 리다이렉트한 경우)
  useEffect(() => {
    getSupabaseClient().auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setChecking(false); return }
      try {
        await fetch('/api/auth/sync-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        })
      } catch {}
      const params = new URLSearchParams(window.location.search)
      const target = params.get('redirect')
      window.location.href = (target && target.startsWith('/')) ? target : '/mypage'
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('이메일을 입력해주세요.')
      return
    }
    if (!password) {
      setError('비밀번호를 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const { data, error: authError } = await getSupabaseClient().auth.signInWithPassword({ email, password })
      if (authError) {
        setError(localizeError(authError.message))
      } else {
        // 미들웨어가 읽는 쿠키에 세션 동기화
        if (data.session) {
          await fetch('/api/auth/sync-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token:  data.session.access_token,
              refresh_token: data.session.refresh_token,
            }),
          })
        }
        // window.location 으로 전체 페이지 로드 → 미들웨어가 쿠키를 읽을 수 있음
        window.location.href = getRedirectTarget()
      }
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    const { error } = await getSupabaseClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://theoktop.com/api/auth/callback' },
    })
    if (error) console.error('구글 로그인 오류:', error)
  }

  const handleKakao = async () => {
    const { error } = await getSupabaseClient().auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: 'https://theoktop.com/api/auth/callback' },
    })
    if (error) console.error('카카오 로그인 오류:', error)
  }

  const handleNaver = () => {
    window.location.href = '/api/auth/naver'
  }

  const callbackError =
    queryError === 'auth_failed'    ? '로그인에 실패했습니다. 다시 시도해주세요.'
    : queryError === 'db_failed'    ? '계정 처리 중 오류가 발생했습니다.'
    : queryError === 'session_failed' ? '세션 생성에 실패했습니다.'
    : null

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ fontSize: 14, color: '#999' }}>로딩 중...</div>
      </div>
    )
  }

  return (
    <>
      <Head><title>로그인 | THE OKTOP</title></Head>
      <style>{`
        .login-input:focus {
          border-color: #111 !important;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.08);
        }
        @media (max-width: 480px) {
          .login-card { padding: 36px 24px !important; }
        }
      `}</style>

      <div style={s.page}>
        <div style={s.card} className="login-card">
          <h1 style={s.logo}>THE OKTOP</h1>
          <h2 style={s.title}>로그인</h2>

          {callbackError && (
            <p style={{ ...s.error, marginBottom: 16 }} role="alert">
              {callbackError}
            </p>
          )}

          <form onSubmit={handleLogin} style={s.form} noValidate>
            <div style={s.group}>
              <label htmlFor="login-email" style={s.label}>이메일</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                style={s.input}
                className="login-input"
                required
                autoComplete="email"
              />
            </div>
            <div style={s.group}>
              <label htmlFor="login-password" style={s.label}>비밀번호</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                style={s.input}
                className="login-input"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p style={s.error} role="alert">{error}</p>}

            <button
              type="submit"
              style={{ ...s.btnPrimary, opacity: loading ? 0.65 : 1 }}
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div style={s.divider}>
            <span style={s.dividerLine} />
            <span style={s.dividerText}>또는 소셜 계정으로 로그인</span>
            <span style={s.dividerLine} />
          </div>

          <div style={s.social}>
            <button type="button" onClick={handleGoogle} style={s.btnGoogle}>
              <GoogleIcon />
              구글로 로그인
            </button>
            <button type="button" onClick={handleKakao} style={s.btnKakao}>
              <KakaoIcon />
              카카오로 로그인
            </button>
            <button type="button" onClick={handleNaver} style={s.btnNaver}>
              <NaverIcon />
              네이버로 로그인
            </button>
          </div>

          <p style={s.footer}>
            아직 회원이 아니신가요?{' '}
            <Link href="/register" style={s.link}>회원가입</Link>
          </p>
        </div>
      </div>
    </>
  )
}

/* ── SVG Icons ── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8 }}>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.7 0 6.8 5.4 3 13.3l7.8 6C12.9 13.2 18 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.5 2.8-2.1 5.2-4.5 6.8l7 5.4C43.5 36.9 46.5 31.1 46.5 24.5z"/>
      <path fill="#FBBC05" d="M10.8 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1.1 16.6 0 20.2 0 24s1.1 7.4 3 10.7l7.8-6z"/>
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7-5.4c-2.1 1.4-4.8 2.3-8.2 2.3-6 0-11.1-3.7-13.2-9.2l-7.8 6C6.8 42.6 14.7 48 24 48z"/>
    </svg>
  )
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
      <path fill="#3A1D1D" d="M12 2C6.48 2 2 5.92 2 10.76c0 3.04 1.84 5.71 4.6 7.28L5.5 22l5.04-2.66c.47.07.96.1 1.46.1 5.52 0 10-3.92 10-8.76S17.52 2 12 2z"/>
    </svg>
  )
}

function NaverIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{ marginRight: 8 }}>
      <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
    </svg>
  )
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
    padding: '24px 16px',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '48px 40px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  logo: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: 2,
    color: '#111',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 600,
    color: '#333',
    marginBottom: 28,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  group: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#555', cursor: 'pointer' },
  input: {
    padding: '12px 14px',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  error: {
    fontSize: 13,
    color: '#E53935',
    background: '#FFF5F5',
    border: '1px solid #FFCDD2',
    borderRadius: 8,
    padding: '10px 14px',
    margin: 0,
  },
  btnPrimary: {
    padding: '13px',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
    transition: 'opacity 0.2s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '24px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#e0e0e0',
  },
  dividerText: {
    fontSize: 12,
    color: '#999',
    whiteSpace: 'nowrap',
  },
  social: { display: 'flex', flexDirection: 'column', gap: 10 },
  btnGoogle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '11px',
    background: '#fff',
    color: '#333',
    border: '1.5px solid #dadce0',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  btnKakao: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '11px',
    background: '#FEE500',
    color: '#191919',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnNaver: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '11px',
    background: '#03C75A',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  footer: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
    color: '#777',
  },
  link: {
    color: '#111',
    fontWeight: 700,
    textDecoration: 'underline',
  },
}
