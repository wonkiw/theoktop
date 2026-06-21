import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { getSupabaseClient } from '../../../lib/supabase'
import { ConstructionSiteFields, EMPTY_SITE_FORM, SiteFormState } from '../../../components/admin/ConstructionSiteFields'

export default function NewConstructionSite() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [values, setValues] = useState<SiteFormState>(EMPTY_SITE_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/admin/login'); return }
      setToken(session.access_token)
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!values.title.trim()) { setError('제목을 입력해주세요.'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/construction-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: values.title.trim(),
          address: values.address.trim() || null,
          area: values.area ? Number(values.area) : null,
          area_unit: values.area_unit,
          site_type: values.site_type.trim() || null,
          construction_status: values.construction_status,
          progress_rate: values.progress_rate ? Number(values.progress_rate) : null,
          description: values.description.trim() || null,
          is_featured_on_main: values.is_featured_on_main,
          display_order: Number(values.display_order) || 0,
          status: values.status,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? '등록에 실패했습니다.'); setSaving(false); return }
      router.replace(`/admin/construction-sites/${data.site.id}/edit`)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
      setSaving(false)
    }
  }

  return (
    <>
      <Head><title>시공현장 등록 | THE OKTOP 관리자</title></Head>
      <div style={s.root}>
        <header style={s.header}>
          <div style={s.headerInner}>
            <Link href="/admin/construction-sites" style={s.logo}>THE OKTOP <span style={s.adminBadge}>관리자</span></Link>
            <Link href="/" style={s.btnHome}>메인페이지로 이동</Link>
          </div>
        </header>
        <main style={s.main}>
          <Link href="/admin/construction-sites" style={s.breadcrumb}>← 시공현장 관리</Link>
          <h1 style={s.h1}>시공현장 신규 등록</h1>
          <form onSubmit={handleSubmit} style={s.card}>
            <ConstructionSiteFields values={values} onChange={patch => setValues(prev => ({ ...prev, ...patch }))} />
            {error && <p style={s.error}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="submit" disabled={saving} style={s.btnPrimary}>
                {saving ? '등록 중...' : '등록하고 이미지 추가하기'}
              </button>
              <Link href="/admin/construction-sites" style={s.btnCancel}>취소</Link>
            </div>
          </form>
        </main>
      </div>
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#f4f4f4', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif" },
  header: { background: '#111', padding: '0 24px' },
  headerInner: { maxWidth: 800, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  btnHome: { padding: '7px 16px', background: '#333', color: '#ccc', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', textDecoration: 'none' },
  logo: { fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
  adminBadge: { fontSize: 11, fontWeight: 500, background: 'rgba(255,255,255,0.15)', color: '#ccc', padding: '2px 8px', borderRadius: 20 },
  main: { maxWidth: 800, margin: '0 auto', padding: '32px 24px 64px' },
  breadcrumb: { fontSize: 13, color: '#888', textDecoration: 'none' },
  h1: { fontSize: 24, fontWeight: 700, color: '#111', margin: '10px 0 24px' },
  card: { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  error: { fontSize: 13, color: '#E53935', marginTop: 16 },
  btnPrimary: { padding: '11px 22px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnCancel: { padding: '11px 22px', background: '#fff', color: '#555', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, textDecoration: 'none' },
}
