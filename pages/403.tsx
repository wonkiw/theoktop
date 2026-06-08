import Head from 'next/head'
import { useRouter } from 'next/router'

export default function ForbiddenPage() {
  const router = useRouter()

  return (
    <>
      <Head><title>403 접근 권한 없음 | THE OKTOP</title></Head>

      <div style={s.page}>
        <div style={s.card}>
          <div style={s.code}>403</div>
          <h1 style={s.title}>접근 권한이 없습니다</h1>
          <p style={s.desc}>
            이 페이지에 접근할 수 있는 권한이 없습니다.<br />
            계정 권한을 확인하거나 관리자에게 문의해주세요.
          </p>
          <button style={s.btn} onClick={() => router.push('/')}>
            메인 페이지로 돌아가기
          </button>
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
