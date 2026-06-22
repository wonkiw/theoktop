import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { getSupabaseClient } from '../../lib/supabase'

type FieldType = 'input' | 'textarea'

interface FieldDef {
  key: string
  label: string
  type: FieldType
}

interface FieldGroup {
  title: string
  fields: FieldDef[]
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    title: '정책 문서',
    fields: [
      { key: 'privacy_policy', label: '개인정보처리방침', type: 'textarea' },
      { key: 'terms_of_service', label: '이용약관', type: 'textarea' },
    ],
  },
  {
    title: '연락처',
    fields: [
      { key: 'contact_phone', label: '연락처', type: 'input' },
      { key: 'contact_email', label: '대표자이메일', type: 'input' },
    ],
  },
  {
    title: 'SNS 링크',
    fields: [
      { key: 'sns_instagram', label: 'Instagram URL', type: 'input' },
      { key: 'sns_youtube', label: 'YouTube URL', type: 'input' },
      { key: 'sns_message', label: '메시지/이메일', type: 'input' },
    ],
  },
]

const ALL_KEYS = FIELD_GROUPS.flatMap(g => g.fields.map(f => f.key))

export default function AdminSiteSettingsPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingKeys, setSavingKeys] = useState<string[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadSettings = useCallback(async (tk: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/site-settings', {
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (res.status === 401) { router.replace('/admin/login'); return }
      const data = await res.json()
      if (data.success) {
        const map: Record<string, string> = {}
        data.settings.forEach((s: { key: string; value: string | null }) => {
          map[s.key] = s.value ?? ''
        })
        setValues(map)
      }
    } catch {
      showToast('설정을 불러오지 못했습니다.', 'error')
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/admin/login'); return }
      const tk = session.access_token
      setToken(tk)

      fetch('/api/admin/auth/check-role', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}` },
      })
        .then(r => r.json())
        .then(d => {
          if (!d.success || (d.role !== 'admin' && d.role !== 'superadmin')) {
            router.replace('/403')
            return
          }
          loadSettings(tk)
        })
    })
  }, [router, loadSettings])

  const saveKeys = async (keys: string[]) => {
    setSavingKeys(keys)
    try {
      for (const key of keys) {
        const res = await fetch('/api/admin/site-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ key, value: values[key] ?? '' }),
        })
        if (!res.ok) throw new Error()
      }
      showToast('저장되었습니다')
    } catch {
      showToast('저장 중 오류가 발생했습니다.', 'error')
    }
    setSavingKeys([])
  }

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div style={s.root}>
      <header style={s.header}>
        <div style={s.headerInner}>
          <Link href="/admin/dashboard" style={s.logo}>THE OKTOP <span style={s.adminBadge}>관리자</span></Link>
          <Link href="/" style={s.btnHome}>메인페이지로 이동</Link>
        </div>
      </header>

      <main style={s.main}>
        <Link href="/admin/dashboard" style={s.breadcrumb}>← 대시보드</Link>
        <div style={s.titleRow}>
          <h1 style={s.h1}>페이지 관리</h1>
          <button
            type="button"
            disabled={loading || savingKeys.length > 0}
            onClick={() => saveKeys(ALL_KEYS)}
            style={s.btnPrimary}
          >
            {savingKeys.length === ALL_KEYS.length ? '저장 중...' : '전체 저장'}
          </button>
        </div>

        {loading ? (
          <p style={s.loadingText}>불러오는 중...</p>
        ) : (
          FIELD_GROUPS.map(group => (
            <section key={group.title} style={s.card}>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>{group.title}</h2>
                <button
                  type="button"
                  disabled={savingKeys.length > 0}
                  onClick={() => saveKeys(group.fields.map(f => f.key))}
                  style={s.btnSecondary}
                >
                  이 섹션 저장
                </button>
              </div>

              {group.fields.map(field => (
                <div key={field.key} style={s.fieldRow}>
                  <label style={s.fieldLabel}>{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={values[field.key] ?? ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      style={s.textarea}
                      rows={8}
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[field.key] ?? ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      style={s.input}
                    />
                  )}
                </div>
              ))}
            </section>
          ))
        )}
      </main>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#1a1a1a' : '#e53e3e',
          color: '#fff', padding: '12px 24px', borderRadius: 8, fontSize: 14, zIndex: 200,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#f4f4f4', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif" },
  header: { background: '#111', padding: '0 24px' },
  headerInner: { maxWidth: 800, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
  adminBadge: { fontSize: 11, fontWeight: 500, background: 'rgba(255,255,255,0.15)', color: '#ccc', padding: '2px 8px', borderRadius: 20 },
  btnHome: { padding: '7px 16px', background: '#333', color: '#ccc', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', textDecoration: 'none' },
  main: { maxWidth: 800, margin: '0 auto', padding: '32px 24px 64px' },
  breadcrumb: { fontSize: 13, color: '#888', textDecoration: 'none' },
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 24px' },
  h1: { fontSize: 24, fontWeight: 700, color: '#111' },
  loadingText: { fontSize: 13, color: '#888' },
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#111' },
  fieldRow: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: '#555' },
  input: { padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#111' },
  textarea: { padding: '12px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, color: '#111' },
  btnPrimary: { padding: '10px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '7px 14px', background: '#fff', color: '#555', border: '1.5px solid #e0e0e0', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' },
}
