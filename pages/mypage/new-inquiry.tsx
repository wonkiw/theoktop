import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { getSupabaseClient } from '../../lib/supabase'
import Header from '../../components/Header'

interface Inquiry {
  id: number
  title: string
  content: string
  answer: string | null
  status: string
  created_at: string
  answered_at: string | null
}

export default function InquiryPage() {
  const router = useRouter()
  const [loading, setLoading]       = useState(true)
  const [inquiries, setInquiries]   = useState<Inquiry[]>([])
  const [expanded, setExpanded]     = useState<number | null>(null)
  const [showForm, setShowForm]     = useState(false)

  const [title, setTitle]           = useState('')
  const [content, setContent]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const [token, setToken] = useState('')

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login?redirect=/mypage/new-inquiry')
        return
      }
      setToken(session.access_token)
      loadInquiries(session.access_token)
    })
  }, [])

  const loadInquiries = async (accessToken: string) => {
    setLoading(true)
    const res = await fetch('/api/mypage/inquiries', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.ok) {
      const json = await res.json()
      setInquiries(json.inquiries ?? [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    if (!title.trim()) { setFormError('제목을 입력해주세요.'); return }
    if (!content.trim()) { setFormError('내용을 입력해주세요.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/mypage/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setFormError(json.message ?? '오류가 발생했습니다.')
      } else {
        setFormSuccess('문의가 등록되었습니다. 빠른 시일 내에 답변 드리겠습니다.')
        setTitle('')
        setContent('')
        setShowForm(false)
        await loadInquiries(token)
      }
    } catch {
      setFormError('네트워크 오류가 발생했습니다.')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.spinner}>불러오는 중...</div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <Header />
      <div style={s.container}>

        <div style={s.pageHeader}>
          <div>
            <Link href="/mypage" style={s.backLink}>← 마이페이지</Link>
            <h1 style={s.pageTitle}>문의하기</h1>
            <p style={s.pageDesc}>전문가에게 궁금한 사항을 문의하세요</p>
          </div>
          <button
            style={s.newBtn}
            onClick={() => { setShowForm(v => !v); setFormError(''); setFormSuccess('') }}
          >
            {showForm ? '취소' : '+ 새 문의'}
          </button>
        </div>

        {/* New Inquiry Form */}
        {showForm && (
          <section style={s.formSection}>
            <h2 style={s.formTitle}>문의 작성</h2>
            <form onSubmit={handleSubmit} style={s.form} noValidate>
              <div style={s.formGroup}>
                <label style={s.label}>제목</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="문의 제목을 입력해주세요"
                  style={s.input}
                  maxLength={100}
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>내용</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="문의 내용을 상세히 입력해주세요"
                  style={s.textarea}
                  rows={6}
                />
              </div>
              {formError   && <p style={s.error}>{formError}</p>}
              {formSuccess && <p style={s.success}>{formSuccess}</p>}
              <button type="submit" style={{ ...s.submitBtn, opacity: submitting ? 0.6 : 1 }} disabled={submitting}>
                {submitting ? '등록 중...' : '문의 등록'}
              </button>
            </form>
          </section>
        )}

        {formSuccess && !showForm && (
          <p style={{ ...s.success, marginBottom: 24 }}>{formSuccess}</p>
        )}

        {/* Inquiry List */}
        <section>
          <h2 style={s.listTitle}>문의 내역 ({inquiries.length}건)</h2>
          {inquiries.length === 0 ? (
            <div style={s.empty}>
              <p style={s.emptyText}>아직 문의 내역이 없습니다.</p>
              <button style={s.emptyBtn} onClick={() => setShowForm(true)}>
                첫 문의 작성하기
              </button>
            </div>
          ) : (
            <div style={s.listWrap}>
              {inquiries.map(inq => (
                <div key={inq.id} style={s.inqItem}>
                  <button
                    style={s.inqHeader}
                    onClick={() => setExpanded(expanded === inq.id ? null : inq.id)}
                  >
                    <div style={s.inqLeft}>
                      <span style={{
                        ...s.statusBadge,
                        background: inq.status === 'answered' ? '#10b981' : '#f59e0b',
                      }}>
                        {inq.status === 'answered' ? '답변 완료' : '답변 대기'}
                      </span>
                      <span style={s.inqTitle}>{inq.title}</span>
                    </div>
                    <div style={s.inqRight}>
                      <span style={s.inqDate}>{formatDate(inq.created_at)}</span>
                      <span style={s.chevron}>{expanded === inq.id ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {expanded === inq.id && (
                    <div style={s.inqBody}>
                      <div style={s.inqContent}>
                        <p style={s.inqContentLabel}>문의 내용</p>
                        <p style={s.inqContentText}>{inq.content}</p>
                      </div>
                      {inq.answer ? (
                        <div style={s.answerBox}>
                          <p style={s.answerLabel}>
                            답변
                            {inq.answered_at && (
                              <span style={s.answerDate}> · {formatDate(inq.answered_at)}</span>
                            )}
                          </p>
                          <p style={s.answerText}>{inq.answer}</p>
                        </div>
                      ) : (
                        <div style={s.pendingBox}>
                          <p style={s.pendingText}>아직 답변이 등록되지 않았습니다. 빠른 시일 내에 답변 드리겠습니다.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f7f7f7',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  container: { maxWidth: 800, margin: '0 auto', padding: '0 24px 80px' },
  spinner: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', fontSize: 15, color: '#999',
  },

  pageHeader: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    marginBottom: 40,
  },
  backLink: { fontSize: 13, color: '#888', textDecoration: 'none', display: 'block', marginBottom: 8 },
  pageTitle: { fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 6 },
  pageDesc:  { fontSize: 14, color: '#888', margin: 0 },
  newBtn: {
    padding: '10px 20px',
    background: '#111', color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  formSection: {
    background: '#fff', borderRadius: 16, padding: '32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 40,
  },
  formTitle: { fontSize: 17, fontWeight: 700, color: '#111', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#555' },
  input: {
    padding: '11px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none',
  },
  textarea: {
    padding: '11px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.6,
  },
  error:   { fontSize: 13, color: '#E53935', background: '#FFF5F5', border: '1px solid #FFCDD2', borderRadius: 8, padding: '10px 14px', margin: 0 },
  success: { fontSize: 13, color: '#10b981', background: '#f0fdf4', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 14px', margin: 0 },
  submitBtn: {
    padding: '13px', background: '#111', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },

  listTitle: { fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 16 },
  listWrap: {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden',
  },
  inqItem: { borderBottom: '1px solid #f0f0f0' },
  inqHeader: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
  },
  inqLeft:  { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  inqRight: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  statusBadge: { padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' },
  inqTitle: { fontSize: 14, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  inqDate:  { fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' },
  chevron:  { fontSize: 10, color: '#bbb' },

  inqBody: { padding: '0 20px 20px' },
  inqContent: {
    background: '#fafafa', borderRadius: 8, padding: '14px 16px', marginBottom: 12,
  },
  inqContentLabel: { fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  inqContentText:  { fontSize: 14, color: '#333', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' },

  answerBox: {
    background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '14px 16px',
  },
  answerLabel: { fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  answerDate:  { fontWeight: 400, color: '#6ee7b7' },
  answerText:  { fontSize: 14, color: '#333', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' },

  pendingBox: {
    background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '14px 16px',
  },
  pendingText: { fontSize: 13, color: '#92400e', margin: 0 },

  empty: {
    background: '#fff', borderRadius: 12, padding: '48px 24px',
    textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  emptyText: { fontSize: 14, color: '#aaa', marginBottom: 16 },
  emptyBtn: {
    padding: '10px 24px', background: '#111', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
}
