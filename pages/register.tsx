import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { getSupabaseClient } from '../lib/supabase'

const PHONE_RE = /^01[0-9]-?\d{3,4}-?\d{4}$/

export default function RegisterPage() {
  const router = useRouter()
  const isRejoin = router.query.from === 'rejoin'

  const [form, setForm] = useState({ email: '', password: '', passwordConfirm: '', name: '', phone: '' })
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(isRejoin)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  // 탈퇴 후 OAuth 재가입: 쿼리로 넘어온 이메일/이름을 미리 채우고,
  // 이미 카카오/네이버/구글로 인증된 세션이 있는지 확인한다.
  useEffect(() => {
    if (!router.isReady || !isRejoin) return

    setForm(prev => ({
      ...prev,
      email: typeof router.query.email === 'string' ? router.query.email : prev.email,
      name:  typeof router.query.name === 'string' ? router.query.name : prev.name,
    }))

    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login')
        return
      }
      setAccessToken(data.session.access_token)
      setCheckingSession(false)
    })
  }, [router.isReady, isRejoin, router])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }
    if (!isRejoin && !form.email.trim()) {
      setError('이메일을 입력해주세요.')
      return
    }
    if (!form.phone.trim() || !PHONE_RE.test(form.phone.trim().replace(/\s/g, ''))) {
      setError('올바른 휴대폰번호를 입력해주세요.')
      return
    }
    if (!agreedTerms) {
      setError('이용약관 동의가 필요합니다.')
      return
    }
    if (!isRejoin) {
      if (form.password !== form.passwordConfirm) {
        setError('비밀번호가 일치하지 않습니다.')
        return
      }
      if (form.password.length < 8) {
        setError('비밀번호는 8자 이상이어야 합니다.')
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isRejoin && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(
          isRejoin
            ? { name: form.name, phone: form.phone, agreedTerms }
            : { email: form.email, password: form.password, name: form.name, phone: form.phone, agreedTerms }
        ),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? '회원가입에 실패했습니다.')
      } else if (isRejoin) {
        router.replace('/mypage')
      } else {
        setSuccess(true)
      }
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    }
    setLoading(false)
  }

  const handleGoogle = () =>
    getSupabaseClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback` },
    })

  const handleKakao = () =>
    getSupabaseClient().auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback` },
    })

  const handleNaver = () => {
    window.location.href = '/api/auth/naver'
  }

  if (checkingSession) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <h1 style={s.logo}>THE OKTOP</h1>
          <p style={{ textAlign: 'center', color: '#666' }}>확인 중...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <>
        <Head><title>회원가입 완료 | THE OKTOP</title></Head>
        <div style={s.page}>
          <div style={s.card}>
            <h1 style={s.logo}>THE OKTOP</h1>
            <div style={s.successBox}>
              <div style={s.successIcon}>✓</div>
              <h2 style={s.successTitle}>회원가입이 완료됐습니다!</h2>
              <p style={s.successDesc}>지금 바로 로그인하실 수 있습니다.</p>
              <Link href="/login" style={s.btnPrimaryLink}>로그인하러 가기</Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head><title>회원가입 | THE OKTOP</title></Head>
      <style>{`
        .reg-input:focus {
          border-color: #111 !important;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.08);
        }
        @media (max-width: 480px) {
          .reg-card { padding: 36px 24px !important; }
        }
      `}</style>

      <div style={s.page}>
        <div style={s.card} className="reg-card">
          <h1 style={s.logo}>THE OKTOP</h1>
          <h2 style={s.title}>회원가입</h2>

          {isRejoin && (
            <p style={s.rejoinNotice}>
              이전에 탈퇴한 계정입니다. 정보를 다시 입력하여 재가입을 진행해주세요.
            </p>
          )}

          <form onSubmit={handleRegister} style={s.form} noValidate>
            <div style={s.group}>
              <label htmlFor="reg-name" style={s.label}>
                이름 <span style={s.required}>*</span>
              </label>
              <input
                id="reg-name"
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="홍길동"
                style={s.input}
                className="reg-input"
                required
                autoComplete="name"
                disabled={isRejoin}
              />
            </div>
            <div style={s.group}>
              <label htmlFor="reg-email" style={s.label}>
                이메일 <span style={s.required}>*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="example@email.com"
                style={s.input}
                className="reg-input"
                required
                autoComplete="email"
                disabled={isRejoin}
              />
            </div>
            <div style={s.group}>
              <label htmlFor="reg-phone" style={s.label}>
                휴대폰번호 <span style={s.required}>*</span>
              </label>
              <input
                id="reg-phone"
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="010-0000-0000"
                style={s.input}
                className="reg-input"
                required
                autoComplete="tel"
              />
            </div>
            {!isRejoin && (
              <>
                <div style={s.group}>
                  <label htmlFor="reg-password" style={s.label}>
                    비밀번호 <span style={s.required}>*</span>
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    value={form.password}
                    onChange={set('password')}
                    placeholder="8자 이상 입력"
                    style={s.input}
                    className="reg-input"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div style={s.group}>
                  <label htmlFor="reg-password-confirm" style={s.label}>
                    비밀번호 확인 <span style={s.required}>*</span>
                  </label>
                  <input
                    id="reg-password-confirm"
                    type="password"
                    value={form.passwordConfirm}
                    onChange={set('passwordConfirm')}
                    placeholder="비밀번호를 다시 입력"
                    style={s.input}
                    className="reg-input"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            <label style={s.checkboxLabel}>
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={e => setAgreedTerms(e.target.checked)}
              />
              <span>[필수] 이용약관 및 개인정보 수집·이용에 동의합니다</span>
            </label>

            {error && <p style={s.error} role="alert">{error}</p>}

            <button
              type="submit"
              style={{ ...s.btnPrimary, opacity: loading ? 0.65 : 1 }}
              disabled={loading}
            >
              {loading ? '가입 처리 중...' : isRejoin ? '재가입 완료' : '가입 완료'}
            </button>
          </form>

          {!isRejoin && (
            <>
              <div style={s.divider}>
                <span style={s.dividerLine} />
                <span style={s.dividerText}>또는 소셜 계정으로 가입</span>
                <span style={s.dividerLine} />
              </div>

              <div style={s.social}>
                <button type="button" onClick={handleGoogle} style={s.btnGoogle}>
                  <GoogleIcon />
                  구글로 가입
                </button>
                <button type="button" onClick={handleKakao} style={s.btnKakao}>
                  <KakaoIcon />
                  카카오로 가입
                </button>
                <button type="button" onClick={handleNaver} style={s.btnNaver}>
                  <NaverIcon />
                  네이버로 가입
                </button>
              </div>

              <p style={s.footer}>
                이미 회원이신가요?{' '}
                <Link href="/login" style={s.link}>로그인</Link>
              </p>
            </>
          )}
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
  rejoinNotice: {
    fontSize: 13,
    color: '#8a6d00',
    background: '#FFF8E1',
    border: '1px solid #FFE082',
    borderRadius: 8,
    padding: '10px 14px',
    margin: '0 0 20px',
    lineHeight: 1.6,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    fontSize: 13,
    color: '#555',
    cursor: 'pointer',
  },
  group: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#555', cursor: 'pointer' },
  required: { color: '#E53935' },
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
  btnPrimaryLink: {
    display: 'block',
    padding: '13px',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center',
    marginTop: 24,
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
  successBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '16px 0',
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: '#E8F5E9',
    color: '#43A047',
    fontSize: 28,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111',
    margin: 0,
  },
  successDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 1.7,
    margin: 0,
  },
}
