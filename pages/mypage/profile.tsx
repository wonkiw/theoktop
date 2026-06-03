import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '../../components/Header'

type UserProfile = {
  name: string
  email: string
  phone: string | null
  role: string
  provider: string
  created_at: string
}

const PROVIDER_LABEL: Record<string, string> = {
  email:  '이메일',
  google: '구글',
  kakao:  '카카오',
  naver:  '네이버',
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const [editing, setEditing] = useState(false)
  const [editName, setEditName]   = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/mypage/profile')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setProfile(data.user)
          setEditName(data.user.name ?? '')
          setEditPhone(data.user.phone ?? '')
        } else {
          setError(data.message)
        }
      })
      .catch(() => setError('불러오는 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    setSaveSuccess(false)
    setSaving(true)

    try {
      const res = await fetch('/api/mypage/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, phone: editPhone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.message ?? '수정에 실패했습니다.')
      } else {
        setProfile(prev => prev ? { ...prev, name: data.user.name, phone: data.user.phone } : prev)
        setSaveSuccess(true)
        setEditing(false)
      }
    } catch {
      setSaveError('네트워크 오류가 발생했습니다.')
    }
    setSaving(false)
  }

  const handleEditStart = () => {
    setSaveError('')
    setSaveSuccess(false)
    setEditing(true)
  }

  const handleEditCancel = () => {
    setEditName(profile?.name ?? '')
    setEditPhone(profile?.phone ?? '')
    setSaveError('')
    setEditing(false)
  }

  if (loading) {
    return <div style={s.page}><div style={s.center}>불러오는 중...</div></div>
  }

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.center}>
          <p style={s.error}>{error}</p>
          <Link href="/mypage" style={s.backLink}>마이페이지로 돌아가기</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <Header />
      <div style={s.container}>

        {/* Sub-nav */}
        <div style={s.header}>
          <Link href="/mypage" style={s.backLink}>← 마이페이지</Link>
        </div>

        <h2 style={s.pageTitle}>내 정보</h2>

        {saveSuccess && (
          <div style={s.successBanner}>정보가 성공적으로 수정되었습니다.</div>
        )}

        {/* 기본 정보 카드 */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>기본 정보</h3>
            {!editing && (
              <button onClick={handleEditStart} style={s.editBtn}>수정하기</button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} style={s.form}>
              <div style={s.row}>
                <label style={s.label}>이름</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={s.input}
                  required
                />
              </div>
              <div style={s.row}>
                <label style={s.label}>전화번호</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  style={s.input}
                />
              </div>

              {saveError && <p style={s.error}>{saveError}</p>}

              <div style={s.btnRow}>
                <button type="submit" style={s.btnSave} disabled={saving}>
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button type="button" onClick={handleEditCancel} style={s.btnCancel}>
                  취소
                </button>
              </div>
            </form>
          ) : (
            <dl style={s.dl}>
              <Row label="이름"    value={profile?.name ?? '-'} />
              <Row label="이메일"  value={profile?.email ?? '-'} />
              <Row label="전화번호" value={profile?.phone ?? '미등록'} />
            </dl>
          )}
        </div>

        {/* 계정 정보 카드 */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>계정 정보</h3>
          </div>
          <dl style={s.dl}>
            <Row
              label="가입 방법"
              value={PROVIDER_LABEL[profile?.provider ?? ''] ?? profile?.provider ?? '-'}
            />
            <Row label="권한" value={profile?.role ?? '-'} />
            <Row
              label="가입일"
              value={
                profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })
                  : '-'
              }
            />
          </dl>
        </div>

      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={rowS.wrap}>
      <dt style={rowS.label}>{label}</dt>
      <dd style={rowS.value}>{value}</dd>
    </div>
  )
}

const rowS: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  label: {
    fontSize: 13,
    color: '#888',
    fontWeight: 500,
    margin: 0,
  },
  value: {
    fontSize: 14,
    color: '#111',
    fontWeight: 500,
    margin: 0,
  },
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f7f7f7',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  container: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '0 24px 64px',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: 16,
    fontSize: 15,
    color: '#999',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 0',
    borderBottom: '1px solid #ebebeb',
    marginBottom: 40,
  },
  logo: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 2,
    color: '#111',
    textDecoration: 'none',
  },
  backLink: {
    fontSize: 13,
    color: '#555',
    textDecoration: 'none',
    fontWeight: 500,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111',
    marginBottom: 24,
  },
  successBanner: {
    background: '#E8F5E9',
    color: '#2E7D32',
    border: '1px solid #A5D6A7',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '28px',
    marginBottom: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#111',
    margin: 0,
  },
  editBtn: {
    padding: '6px 14px',
    background: 'transparent',
    color: '#555',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 500,
  },
  dl: {
    margin: '8px 0 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    marginTop: 16,
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#888',
  },
  input: {
    padding: '11px 14px',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
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
  btnRow: {
    display: 'flex',
    gap: 10,
  },
  btnSave: {
    flex: 1,
    padding: '11px',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnCancel: {
    flex: 1,
    padding: '11px',
    background: '#fff',
    color: '#555',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
}
