import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { getSupabaseClient } from '../../lib/supabase'

const MAX_ATTEMPTS = 5
const LOCKOUT_SECONDS = 30

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // 이미 로그인된 관리자는 대시보드로
  useEffect(() => {
    getSupabaseClient().auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const res = await fetch('/api/admin/auth/check-role', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (json.role === 'admin' || json.role === 'superadmin') {
        void router.push('/admin/dashboard')
      }
    })
  }, [])

  const [attempts, setAttempts]       = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [lockRemain, setLockRemain]   = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startLockTimer = (until: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const remain = Math.ceil((until - Date.now()) / 1000)
      if (remain <= 0) {
        clearInterval(timerRef.current!)
        setLockedUntil(null)
        setLockRemain(0)
        setAttempts(0)
      } else {
        setLockRemain(remain)
      }
    }, 500)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (lockedUntil && Date.now() < lockedUntil) return

    if (!email.trim()) { setError('이메일을 입력해주세요.'); return }
    if (!password)     { setError('비밀번호를 입력해주세요.'); return }

    setLoading(true)
    try {
      const { data, error: authError } = await getSupabaseClient().auth.signInWithPassword({ email, password })

      if (authError || !data.session) {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)

        if (newAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_SECONDS * 1000
          setLockedUntil(until)
          setLockRemain(LOCKOUT_SECONDS)
          startLockTimer(until)
          setError(`로그인 시도가 ${MAX_ATTEMPTS}회 초과되었습니다. ${LOCKOUT_SECONDS}초 후 다시 시도해주세요.`)
        } else {
          setError(`이메일 또는 비밀번호가 올바르지 않습니다. (${newAttempts}/${MAX_ATTEMPTS})`)
        }
        setLoading(false)
        return
      }

      const res = await fetch('/api/admin/auth/check-role', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      })
      const json = await res.json()

      if (!json.success) {
        await getSupabaseClient().auth.signOut()
        setError('사용자 정보를 확인할 수 없습니다.')
        setLoading(false)
        return
      }

      if (json.role === 'admin' || json.role === 'superadmin') {
        // 미들웨어가 읽는 쿠키에 세션 동기화
        await fetch('/api/auth/sync-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token:  data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
        })
        void router.push('/admin/dashboard')
      } else {
        await getSupabaseClient().auth.signOut()
        setError('관리자 권한이 없습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    }
    setLoading(false)
  }

  const isLocked = !!(lockedUntil && Date.now() < lockedUntil)

  return (
    <>
      <Head><title>관리자 로그인 | THE OKTOP</title></Head>
      <style>{`
        .admin-input:focus {
          border-color: #111 !important;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.08);
        }
        @media (max-width: 480px) {
          .admin-card { padding: 36px 24px !important; }
        }
      `}</style>

      <div style={s.page}>
        <div style={s.card} className="admin-card">
          <h1 style={s.logo}>THE OKTOP</h1>
          <p style={s.subtitle}>관리자 전용</p>

          <form onSubmit={handleLogin} style={s.form} noValidate>
            <div style={s.group}>
              <label htmlFor="admin-email" style={s.label}>이메일</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@theoktop.com"
                style={s.input}
                className="admin-input"
                disabled={isLocked}
                autoComplete="email"
              />
            </div>
            <div style={s.group}>
              <label htmlFor="admin-password" style={s.label}>비밀번호</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                style={s.input}
                className="admin-input"
                disabled={isLocked}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p style={s.error} role="alert">
                {error}
                {isLocked && lockRemain > 0 && (
                  <span style={s.countdown}> ({lockRemain}초)</span>
                )}
              </p>
            )}

            <button
              type="submit"
              style={{
                ...s.btnPrimary,
                opacity: (loading || isLocked) ? 0.5 : 1,
                cursor: (loading || isLocked) ? 'not-allowed' : 'pointer',
              }}
              disabled={loading || isLocked}
            >
              {loading ? '확인 중...' : isLocked ? `잠금 중 (${lockRemain}초)` : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f0f0',
    padding: '24px 16px',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '48px 40px',
    width: '100%',
    maxWidth: 380,
    boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
  },
  logo: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 3,
    color: '#111',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    letterSpacing: 1,
    marginBottom: 32,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  group: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#555' },
  input: {
    padding: '11px 14px',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    background: '#fff',
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
  countdown: {
    fontWeight: 700,
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
}
