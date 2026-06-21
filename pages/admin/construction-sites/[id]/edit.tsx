import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { getSupabaseClient } from '../../../../lib/supabase'
import { ConstructionSiteFields, EMPTY_SITE_FORM, SiteFormState } from '../../../../components/admin/ConstructionSiteFields'

interface SiteImage { url: string; order: number }

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function EditConstructionSite() {
  const router = useRouter()
  const { id } = router.query
  const [token, setToken] = useState('')
  const [values, setValues] = useState<SiteFormState>(EMPTY_SITE_FORM)
  const [images, setImages] = useState<SiteImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    getSupabaseClient().auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/admin/login'); return }
      setToken(session.access_token)
      const res = await fetch(`/api/admin/construction-sites/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const site = data.site
        setValues({
          title: site.title ?? '',
          address: site.address ?? '',
          area: site.area != null ? String(site.area) : '',
          area_unit: site.area_unit ?? '㎡',
          site_type: site.site_type ?? '',
          construction_status: site.construction_status ?? 'ongoing',
          progress_rate: site.progress_rate != null ? String(site.progress_rate) : '',
          description: site.description ?? '',
          is_featured_on_main: !!site.is_featured_on_main,
          display_order: String(site.display_order ?? 0),
          status: site.status ?? 'published',
        })
        setImages((site.images ?? []).slice().sort((a: SiteImage, b: SiteImage) => a.order - b.order))
      }
      setLoading(false)
    })
  }, [id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!values.title.trim()) { setError('제목을 입력해주세요.'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/construction-sites/${id}`, {
        method: 'PATCH',
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
      if (!res.ok) { setError(data.message ?? '수정에 실패했습니다.'); setSaving(false); return }
      router.push('/admin/construction-sites')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
      setSaving(false)
    }
  }

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(fileList)) {
        const base64 = await fileToBase64(file)
        const res = await fetch(`/api/admin/construction-sites/${id}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ fileType: file.type, fileBase64: base64 }),
        })
        const data = await res.json()
        if (!res.ok) { alert(data.message ?? '이미지 업로드에 실패했습니다.'); continue }
        setImages((data.site.images ?? []).slice().sort((a: SiteImage, b: SiteImage) => a.order - b.order))
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteImage = async (imageUrl: string) => {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return
    const res = await fetch(`/api/admin/construction-sites/${id}/images`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ imageUrl }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.message ?? '이미지 삭제에 실패했습니다.'); return }
    setImages((data.site.images ?? []).slice().sort((a: SiteImage, b: SiteImage) => a.order - b.order))
  }

  if (loading) {
    return <div style={s.root}><main style={s.main}>불러오는 중...</main></div>
  }

  return (
    <>
      <Head><title>시공현장 수정 | THE OKTOP 관리자</title></Head>
      <div style={s.root}>
        <header style={s.header}>
          <div style={s.headerInner}>
            <Link href="/admin/construction-sites" style={s.logo}>THE OKTOP <span style={s.adminBadge}>관리자</span></Link>
            <Link href="/" style={s.btnHome}>메인페이지로 이동</Link>
          </div>
        </header>
        <main style={s.main}>
          <Link href="/admin/construction-sites" style={s.breadcrumb}>← 시공현장 관리</Link>
          <h1 style={s.h1}>시공현장 수정</h1>

          <form onSubmit={handleSubmit} style={s.card}>
            <ConstructionSiteFields values={values} onChange={patch => setValues(prev => ({ ...prev, ...patch }))} />
            {error && <p style={s.error}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="submit" disabled={saving} style={s.btnPrimary}>
                {saving ? '저장 중...' : '저장'}
              </button>
              <Link href="/admin/construction-sites" style={s.btnCancel}>취소</Link>
            </div>
          </form>

          <div style={{ ...s.card, marginTop: 20 }}>
            <h2 style={s.h2}>이미지 관리</h2>
            <div style={s.imageGrid}>
              {images.map(img => (
                <div key={img.url} style={s.imageItem}>
                  <img src={img.url} alt="" style={s.imageThumb} />
                  <button type="button" onClick={() => handleDeleteImage(img.url)} style={s.imageDeleteBtn}>✕</button>
                </div>
              ))}
              <label style={s.imageUploadBtn}>
                {uploading ? '업로드 중...' : '+ 이미지 추가'}
                <input
                  ref={fileInputRef}
                  type="file" accept="image/jpeg,image/png,image/webp" multiple
                  onChange={e => handleFilesSelected(e.target.files)}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
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
  h2: { fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 16px' },
  card: { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  error: { fontSize: 13, color: '#E53935', marginTop: 16 },
  btnPrimary: { padding: '11px 22px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnCancel: { padding: '11px 22px', background: '#fff', color: '#555', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, textDecoration: 'none' },
  imageGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: 12 },
  imageItem: { position: 'relative' as const, width: 110, height: 80 },
  imageThumb: { width: '100%', height: '100%', objectFit: 'cover' as const, borderRadius: 8, border: '1px solid #eee' },
  imageDeleteBtn: {
    position: 'absolute' as const, top: -8, right: -8, width: 22, height: 22, borderRadius: '50%',
    background: '#E53935', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', lineHeight: '22px',
  },
  imageUploadBtn: {
    width: 110, height: 80, border: '1.5px dashed #ccc', borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' as const,
    fontSize: 12, color: '#888', cursor: 'pointer',
  },
}
