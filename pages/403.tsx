import Head from 'next/head'
import { useRouter } from 'next/router'

export default function ForbiddenPage() {
  const router = useRouter()

  return (
    <>
      <Head><title>권한 없음 | THE OKTOP</title></Head>

      <div style={s.page}>
        <div style={s.card}>
          <div style={s.code}>403</div>
          <h1 style={s.title}>접근 권한이 없습니다</h1>
          <p style={s.desc}>
            이 페이지는 관리자만 접근할 수 있습니다.<br />
            관리자 계정으로 로그인하거나, 권한이 필요하면 담당자에게 문의해주세요.
          </p>
          <div style={s.btnGroup}>
            <button style={s.btnSecondary} onClick={() => router.push('/admin/login')}>
              관리자 로그인
            </button>
            <button style={s.btn} onClick={() => router.push('/')}>
              메인 페이지로
            </button>
          </div>
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
    background: '#f5f5f5',
    padding: '24px 16px',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '56px 48px',
    width: '100%',
    maxWidth: 440,
    textAlign: 'center',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  code: {
    fontSize: 72,
    fontWeight: 800,
    color: '#e0e0e0',
    lineHeight: 1,
    marginBottom: 16,
    letterSpacing: -2,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#111',
    marginBottom: 12,
  },
  desc: {
    fontSize: 14,
    color: '#777',
    lineHeight: 1.7,
    marginBottom: 32,
  },
  btnGroup: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  btnSecondary: {
    padding: '12px 28px',
    background: '#fff',
    color: '#111',
    border: '1.5px solid #111',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btn: {
    padding: '12px 28px',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
