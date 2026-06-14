import { useState, useRef } from 'react'
import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { createSSRSupabaseClient } from '../../../lib/supabaseServer'
import { pool } from '../../../lib/db'
import Header from '../../../components/Header'
import { supabase } from '../../../lib/supabase'

interface Inquiry {
  id: number
  title: string
  content: string
  inquiry_type: string | null
  building_address: string | null
  status: 'pending' | 'reviewing' | 'completed'
  answer: string | null
  answered_at: string | null
  created_at: string
}

interface Reply {
  id: number
  content: string
  is_admin: boolean
  file_url: string | null
  file_name: string | null
  created_at: string
  author_name: string | null
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: '대기중', bg: '#FFF8E1', color: '#F57F17' },
  reviewing: { label: '검토중', bg: '#E3F2FD', color: '#1565C0' },
  completed: { label: '완료',   bg: '#E8F5E9', color: '#2E7D32' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function InquiryDetail({
  inquiry,
  replies: initialReplies,
}: {
  inquiry: Inquiry
  replies: Reply[]
}) {
  const [replies, setReplies] = useState<Reply[]>(initialReplies)
  const [content, setContent] = useState('')
  const [file, setFile]       = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const st = STATUS_MAP[inquiry.status] ?? STATUS_MAP.pending

  const adminReplies = replies.filter(r => r.is_admin)
  const latestAdminReply = adminReplies[adminReplies.length - 1] ?? null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) { setError('내용을 입력해주세요.'); return }
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('로그인이 필요합니다.'); setSubmitting(false); return }

      let fileUrl: string | undefined
      let fileName: string | undefined
      let fileKey: string | undefined

      if (file) {
        const uploadRes = await fetch('/api/upload/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) {
          setError(uploadData.message ?? '파일 업로드 중 오류가 발생했습니다.')
          setSubmitting(false)
          return
        }
        await fetch(uploadData.uploadUrl, {
          method: 'PUT', body: file, headers: { 'Content-Type': file.type },
        })
        fileUrl  = uploadData.fileUrl
        fileName = file.name
        fileKey  = uploadData.key
      }

      const res = await fetch(`/api/inquiries/${inquiry.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: content.trim(), file_url: fileUrl, file_name: fileName, file_key: fileKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? '오류가 발생했습니다.')
      } else {
        setReplies(prev => [...prev, data.reply])
        setContent('')
        setFile(null)
        if (fileRef.current) fileRef.current.value = ''
        setSuccess('추가 문의가 등록되었습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    }
    setSubmitting(false)
  }

  return (
    <div style={s.page}>
      <Header />
      <div style={s.container}>

        <div style={s.nav}>
          <Link href="/mypage/inquiries" style={s.back}>← 상담 내역</Link>
        </div>

        {/* 상담 정보 카드 */}
        <div style={s.card}>
          <div style={s.cardTop}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...s.badge, background: st.bg, color: st.color }}>{st.label}</span>
              {inquiry.inquiry_type && (
                <span style={s.typeTag}>{inquiry.inquiry_type}</span>
              )}
            </div>
            <span style={s.dateText}>{formatDate(inquiry.created_at)}</span>
          </div>
          <h2 style={s.inqTitle}>
            {inquiry.building_address ?? inquiry.title}
          </h2>
          {inquiry.building_address && (
            <p style={s.subTitle}>{inquiry.title}</p>
          )}
          <div style={s.sectionLabel}>상담 내용</div>
          <div style={s.contentBox}>{inquiry.content}</div>
        </div>

        {/* 관리자 답변 카드 */}
        <div style={s.card}>
          <div style={s.sectionLabel}>관리자 답변</div>
          {inquiry.answer ? (
            <>
              <div style={s.answerBox}>{inquiry.answer}</div>
              {inquiry.answered_at && (
                <p style={s.answerDate}>{formatDate(inquiry.answered_at)}</p>
              )}
            </>
          ) : latestAdminReply ? (
            <>
              <div style={s.answerBox}>{latestAdminReply.content}</div>
              <p style={s.answerDate}>{formatDate(latestAdminReply.created_at)}</p>
              {latestAdminReply.file_name && (
                <div style={s.fileItem}>
                  <span>📎</span>
                  <span style={s.fileName}>{latestAdminReply.file_name}</span>
                  {latestAdminReply.file_url && (
                    <a href={latestAdminReply.file_url} download={latestAdminReply.file_name} style={s.dlBtn}>
                      다운로드
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={s.pendingBox}>
              현재 검토 중입니다. 빠른 시일 내 답변 드리겠습니다.
            </div>
          )}
        </div>

        {/* 추가 문의 카드 */}
        <div style={s.card}>
          <div style={s.sectionLabel}>추가 문의</div>
          <form onSubmit={handleSubmit}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="추가 문의 내용을 입력해주세요"
              style={s.textarea}
              rows={4}
            />
            <div style={s.fileRow}>
              <label style={s.fileLabel}>
                📎 파일 첨부
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {file && <span style={s.fileNameText}>{file.name}</span>}
            </div>
            {error   && <p style={s.error}>{error}</p>}
            {success && <p style={s.successMsg}>{success}</p>}
            <button
              type="submit"
              style={{ ...s.submitBtn, opacity: submitting ? 0.6 : 1 }}
              disabled={submitting}
            >
              {submitting ? '제출 중...' : '추가 문의 제출'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabaseSSR = createSSRSupabaseClient(ctx)
  const { data: { session } } = await supabaseSSR.auth.getSession()
  if (!session) {
    return { redirect: { destination: '/login?redirect=/mypage/inquiries', permanent: false } }
  }

  const inquiryId = Number(ctx.params?.id)
  if (isNaN(inquiryId)) return { notFound: true }

  const client = await pool.connect()
  try {
    const { rows: userRows } = await client.query(
      'SELECT id FROM users WHERE supabase_uid = $1',
      [session.user.id]
    )
    if (!userRows.length) return { redirect: { destination: '/login', permanent: false } }
    const userId = userRows[0].id

    const { rows } = await client.query(
      `SELECT id, title, content, inquiry_type, building_address,
              status, answer, answered_at, created_at, user_id
       FROM inquiries WHERE id = $1`,
      [inquiryId]
    )
    if (!rows.length) return { notFound: true }
    if (rows[0].user_id !== userId) {
      return { redirect: { destination: '/mypage/inquiries', permanent: false } }
    }

    let replies: Reply[] = []
    try {
      const { rows: replyRows } = await client.query(
        `SELECT r.id, r.content, r.is_admin, r.file_url, r.file_name, r.created_at,
                u.name AS author_name
         FROM inquiry_replies r
         LEFT JOIN users u ON u.id = r.user_id
         WHERE r.inquiry_id = $1
         ORDER BY r.created_at ASC`,
        [inquiryId]
      )
      replies = replyRows
    } catch {
      // Table may not exist yet
    }

    const { user_id: _uid, ...inquiryData } = rows[0]
    void _uid

    return {
      props: {
        inquiry: JSON.parse(JSON.stringify(inquiryData)),
        replies: JSON.parse(JSON.stringify(replies)),
      },
    }
  } catch (err) {
    console.error('[mypage/inquiries/[id]]', err)
    return { notFound: true }
  } finally {
    client.release()
  }
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f7f8fa',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  container: { maxWidth: 760, margin: '0 auto', padding: '0 24px 80px' },

  nav: { padding: '32px 0 16px' },
  back: { fontSize: 13, color: '#888', textDecoration: 'none' },

  card: {
    background: '#fff', borderRadius: 16, padding: '28px 32px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 16,
  },
  cardTop: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14, flexWrap: 'wrap', gap: 8,
  },
  badge: {
    display: 'inline-block', padding: '4px 12px',
    borderRadius: 20, fontSize: 12, fontWeight: 600,
  },
  typeTag: {
    fontSize: 12, color: '#666', background: '#f0f0f0',
    padding: '3px 10px', borderRadius: 20,
  },
  dateText: { fontSize: 12, color: '#aaa' },

  inqTitle: { fontSize: 20, fontWeight: 700, color: '#111', margin: '0 0 4px' },
  subTitle: { fontSize: 13, color: '#888', margin: '0 0 20px' },

  sectionLabel: {
    fontSize: 11, fontWeight: 700, color: '#aaa',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 10, marginTop: 4,
  },
  contentBox: {
    background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8,
    padding: '14px 16px', fontSize: 14, color: '#333',
    lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  },

  answerBox: {
    background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8,
    padding: '14px 16px', fontSize: 14, color: '#333',
    lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    marginBottom: 8,
  },
  answerDate: { fontSize: 12, color: '#6ee7b7', margin: 0 },

  fileItem: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 },
  fileName: { fontSize: 13, color: '#444', flex: 1 },
  dlBtn: {
    padding: '4px 12px', background: '#fff',
    border: '1px solid #ddd', borderRadius: 4,
    fontSize: 12, color: '#555', cursor: 'pointer',
    textDecoration: 'none', flexShrink: 0,
  },

  pendingBox: {
    background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
    padding: '14px 16px', fontSize: 14, color: '#92400e', lineHeight: 1.6,
  },

  textarea: {
    width: '100%', padding: '12px 14px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, lineHeight: 1.6, outline: 'none',
    resize: 'vertical', marginBottom: 12, boxSizing: 'border-box',
  },
  fileRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  fileLabel: {
    padding: '8px 14px', border: '1px solid #ddd', borderRadius: 6,
    fontSize: 13, color: '#555', cursor: 'pointer', background: '#fafafa',
  },
  fileNameText: { fontSize: 13, color: '#555' },

  error: {
    fontSize: 13, color: '#E53935', background: '#FFF5F5',
    border: '1px solid #FFCDD2', borderRadius: 8,
    padding: '10px 14px', marginBottom: 12,
  },
  successMsg: {
    fontSize: 13, color: '#10b981', background: '#f0fdf4',
    border: '1px solid #6ee7b7', borderRadius: 8,
    padding: '10px 14px', marginBottom: 12,
  },
  submitBtn: {
    padding: '13px 24px', background: '#111', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
}
