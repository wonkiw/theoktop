import { useState, useRef } from 'react'
import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { createSSRSupabaseClient } from '../../../lib/supabaseServer'
import { getPool } from '../../../lib/db'
import { getSupabaseClient } from '../../../lib/supabase'

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
  customer_name: string
  customer_email: string
  customer_phone: string | null
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

const STATUS_OPTIONS = [
  { value: 'pending',   label: '대기중' },
  { value: 'reviewing', label: '검토중' },
  { value: 'completed', label: '완료' },
]

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      background: type === 'success' ? '#1a1a1a' : '#C62828',
      color: '#fff', padding: '12px 28px', borderRadius: 8,
      fontSize: 14, fontWeight: 500, zIndex: 9999,
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  )
}

export default function AdminInquiryDetail({
  inquiry: init,
  replies: initReplies,
}: {
  inquiry: Inquiry
  replies: Reply[]
}) {
  const [inquiry, setInquiry]   = useState(init)
  const [replies, setReplies]   = useState<Reply[]>(initReplies)
  const [status, setStatus]     = useState(init.status)
  const [savingStatus, setSavingStatus] = useState(false)
  const [answer, setAnswer]     = useState('')
  const [file, setFile]         = useState<File | null>(null)
  const [sending, setSending]   = useState(false)
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const getToken = async () => {
    const { data: { session } } = await getSupabaseClient().auth.getSession()
    return session?.access_token ?? ''
  }

  const handleStatusSave = async () => {
    setSavingStatus(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setInquiry(prev => ({ ...prev, status: status as Inquiry['status'] }))
        showToast('상태가 저장되었습니다.', 'success')
      } else {
        const data = await res.json()
        showToast(data.message ?? '저장 실패', 'error')
      }
    } catch {
      showToast('네트워크 오류', 'error')
    }
    setSavingStatus(false)
  }

  const submitReply = async (sendEmail: boolean) => {
    if (!answer.trim()) return
    setSending(true)
    try {
      const token = await getToken()

      let fileUrl: string | undefined
      let fileName: string | undefined

      if (file) {
        const uploadRes = await fetch('/api/upload/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) {
          showToast(uploadData.message ?? '파일 업로드 오류', 'error')
          setSending(false)
          return
        }
        await fetch(uploadData.uploadUrl, {
          method: 'PUT', body: file, headers: { 'Content-Type': file.type },
        })
        fileUrl  = uploadData.fileUrl
        fileName = file.name
      }

      const res = await fetch('/api/admin/inquiries/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          inquiry_id: inquiry.id,
          answer: answer.trim(),
          send_email: sendEmail,
          file_url: fileUrl,
          file_name: fileName,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        const newReply: Reply = {
          id: Date.now(),
          content: answer.trim(),
          is_admin: true,
          file_url: fileUrl ?? null,
          file_name: fileName ?? null,
          created_at: new Date().toISOString(),
          author_name: '관리자',
        }
        setReplies(prev => [...prev, newReply])
        setAnswer('')
        setFile(null)
        if (fileRef.current) fileRef.current.value = ''
        setInquiry(prev => ({
          ...prev,
          status: 'completed',
          answer: answer.trim(),
          answered_at: new Date().toISOString(),
        }))
        showToast(data.message ?? '답변이 저장되었습니다.', 'success')
      } else {
        showToast(data.message ?? '저장 실패', 'error')
      }
    } catch {
      showToast('네트워크 오류', 'error')
    }
    setSending(false)
  }

  return (
    <>
      <Head><title>상담 상세 | THE OKTOP 관리자</title></Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f4f4; font-family: 'Pretendard','Apple SD Gothic Neo',sans-serif; }
        textarea { font-family: inherit; }
        a { text-decoration: none; color: inherit; }
        select { font-family: inherit; }
      `}</style>

      <div style={s.root}>
        <header style={s.header}>
          <div style={s.headerInner}>
            <Link href="/admin/dashboard" style={s.logo}>
              THE OKTOP <span style={s.adminBadge}>관리자</span>
            </Link>
          </div>
        </header>

        <main style={s.main}>
          <div style={{ marginBottom: 24 }}>
            <Link href="/admin/inquiries" style={s.breadcrumb}>← 목록으로 돌아가기</Link>
            <h1 style={s.h1}>상담 상세</h1>
          </div>

          <div style={s.grid}>
            {/* ── 왼쪽: 정보 + 상태 ── */}
            <div style={s.leftCol}>

              {/* 회원 정보 */}
              <div style={s.card}>
                <p style={s.cardLabel}>회원 정보</p>
                <table style={s.infoTable}>
                  <tbody>
                    <tr>
                      <td style={s.infoKey}>이름</td>
                      <td style={s.infoVal}>{inquiry.customer_name}</td>
                    </tr>
                    <tr>
                      <td style={s.infoKey}>이메일</td>
                      <td style={s.infoVal}>{inquiry.customer_email}</td>
                    </tr>
                    {inquiry.customer_phone && (
                      <tr>
                        <td style={s.infoKey}>연락처</td>
                        <td style={s.infoVal}>{inquiry.customer_phone}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={s.infoKey}>접수일</td>
                      <td style={s.infoVal}>{formatDateTime(inquiry.created_at)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 상담 내용 */}
              <div style={s.card}>
                <p style={s.cardLabel}>상담 내용</p>
                {inquiry.inquiry_type && (
                  <p style={s.metaRow}><span style={s.metaKey}>상담유형</span>{inquiry.inquiry_type}</p>
                )}
                {inquiry.building_address && (
                  <p style={s.metaRow}><span style={s.metaKey}>건물주소</span>{inquiry.building_address}</p>
                )}
                <p style={s.metaRow}><span style={s.metaKey}>제목</span>{inquiry.title}</p>
                <div style={s.contentBox}>{inquiry.content}</div>
              </div>

              {/* 상태 변경 */}
              <div style={s.card}>
                <p style={s.cardLabel}>상태 변경</p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as Inquiry['status'])}
                    style={s.select}
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleStatusSave}
                    disabled={savingStatus}
                    style={{ ...s.saveBtn, opacity: savingStatus ? 0.6 : 1 }}
                  >
                    {savingStatus ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>

            </div>

            {/* ── 오른쪽: 대화 이력 + 답변 작성 ── */}
            <div style={s.rightCol}>

              {/* 대화 이력 */}
              <div style={s.card}>
                <p style={s.cardLabel}>답변 이력</p>

                {/* 기존 단일 답변 (inquiry_replies가 비어있을 때) */}
                {inquiry.answer && replies.length === 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <div style={{ ...s.bubble, ...s.bubbleAdmin }}>
                      <p style={s.bubbleMeta}>관리자 · {inquiry.answered_at ? formatDateTime(inquiry.answered_at) : ''}</p>
                      <p style={s.bubbleText}>{inquiry.answer}</p>
                    </div>
                  </div>
                )}

                {replies.length === 0 && !inquiry.answer ? (
                  <p style={s.noReply}>아직 답변이 없습니다.</p>
                ) : (
                  <div style={s.chatList}>
                    {replies.map(r => (
                      <div
                        key={r.id}
                        style={{ display: 'flex', justifyContent: r.is_admin ? 'flex-end' : 'flex-start', marginBottom: 14 }}
                      >
                        <div style={r.is_admin ? { ...s.bubble, ...s.bubbleAdmin } : { ...s.bubble, ...s.bubbleUser }}>
                          <p style={s.bubbleMeta}>
                            {r.author_name ?? (r.is_admin ? '관리자' : '회원')} · {formatDateTime(r.created_at)}
                          </p>
                          <p style={s.bubbleText}>{r.content}</p>
                          {r.file_name && (
                            <p style={s.bubbleFile}>
                              📎{' '}
                              {r.file_url ? (
                                <a href={r.file_url} download={r.file_name} style={{ color: 'inherit', textDecoration: 'underline' }}>
                                  {r.file_name}
                                </a>
                              ) : (
                                r.file_name
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 답변 작성 */}
              <div style={s.card}>
                <p style={s.cardLabel}>답변 작성</p>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="고객에게 전달할 답변을 입력하세요."
                  style={s.textarea}
                  rows={6}
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
                <p style={s.emailNote}>
                  이메일 발송 시 <strong>{inquiry.customer_email}</strong>로 전송됩니다.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => submitReply(false)}
                    disabled={!answer.trim() || sending}
                    style={{
                      ...s.sendBtn,
                      background: '#555',
                      flex: 1,
                      opacity: (!answer.trim() || sending) ? 0.5 : 1,
                      cursor:  (!answer.trim() || sending) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {sending ? '저장 중...' : '저장만'}
                  </button>
                  <button
                    onClick={() => submitReply(true)}
                    disabled={!answer.trim() || sending}
                    style={{
                      ...s.sendBtn,
                      flex: 2,
                      opacity: (!answer.trim() || sending) ? 0.5 : 1,
                      cursor:  (!answer.trim() || sending) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {sending ? '발송 중...' : '저장 + 이메일 발송'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabaseSSR = createSSRSupabaseClient(ctx)
  const { data: { session } } = await supabaseSSR.auth.getSession()
  if (!session) return { redirect: { destination: '/admin/login', permanent: false } }

  const inquiryId = Number(ctx.params?.id)
  if (isNaN(inquiryId)) return { notFound: true }

  const client = await getPool().connect()
  try {
    const { rows: userRows } = await client.query(
      'SELECT id, role FROM users WHERE supabase_uid = $1',
      [session.user.id]
    )
    if (!userRows.length || !['admin', 'superadmin'].includes(userRows[0].role)) {
      return { redirect: { destination: '/admin/login', permanent: false } }
    }

    const { rows } = await client.query(
      `SELECT i.id, i.title, i.content, i.inquiry_type, i.building_address,
              i.status, i.answer, i.answered_at, i.created_at,
              u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
       FROM inquiries i
       JOIN users u ON u.id = i.user_id
       WHERE i.id = $1`,
      [inquiryId]
    )
    if (!rows.length) return { notFound: true }

    let replies: Reply[] = []
    try {
      const { rows: replyRows } = await client.query(
        `SELECT r.id, r.content, (r.author_role = 'admin') AS is_admin,
                r.file_url, r.file_name, r.created_at,
                u.name AS author_name
         FROM inquiry_replies r
         LEFT JOIN users u ON u.id = r.author_id
         WHERE r.inquiry_id = $1
         ORDER BY r.created_at ASC`,
        [inquiryId]
      )
      replies = replyRows
    } catch {
      // Table may not exist yet
    }

    return {
      props: {
        inquiry: JSON.parse(JSON.stringify(rows[0])),
        replies: JSON.parse(JSON.stringify(replies)),
      },
    }
  } catch (err) {
    console.error('[admin/inquiries/[id]]', err)
    return { notFound: true }
  } finally {
    client.release()
  }
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#f4f4f4' },
  header: { background: '#111', padding: '0 24px' },
  headerInner: { maxWidth: 1200, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center' },
  logo: { fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 10 },
  adminBadge: { fontSize: 11, fontWeight: 500, background: 'rgba(255,255,255,0.15)', color: '#ccc', padding: '2px 8px', borderRadius: 20 },

  main: { maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' },
  breadcrumb: { display: 'block', fontSize: 13, color: '#888', marginBottom: 10 },
  h1: { fontSize: 22, fontWeight: 700, color: '#111' },

  grid: {
    display: 'grid',
    gridTemplateColumns: '400px 1fr',
    gap: 20,
    alignItems: 'start',
  },
  leftCol:  { display: 'flex', flexDirection: 'column', gap: 16 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: 16 },

  card: {
    background: '#fff', borderRadius: 12, padding: '24px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
  },
  cardLabel: {
    fontSize: 11, fontWeight: 700, color: '#aaa',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
  },

  infoTable: { width: '100%', borderCollapse: 'collapse' as const },
  infoKey: { fontSize: 12, color: '#888', padding: '6px 0', width: 80, verticalAlign: 'top' },
  infoVal: { fontSize: 14, color: '#111', padding: '6px 0', fontWeight: 500 },

  metaRow: { fontSize: 13, color: '#555', marginBottom: 8, display: 'flex', gap: 8 },
  metaKey: { color: '#aaa', minWidth: 64, flexShrink: 0 },
  contentBox: {
    background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8,
    padding: '12px 14px', fontSize: 14, color: '#333',
    lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    marginTop: 10,
  },

  select: {
    flex: 1, padding: '9px 12px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, background: '#fff', color: '#333',
    cursor: 'pointer', outline: 'none',
  },
  saveBtn: {
    padding: '9px 20px', background: '#111', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14,
    fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  },

  noReply: { fontSize: 13, color: '#bbb', textAlign: 'center', padding: '16px 0' },
  chatList: { display: 'flex', flexDirection: 'column' },
  bubble: {
    maxWidth: '85%', borderRadius: 12, padding: '10px 14px',
  },
  bubbleAdmin: {
    background: '#1565C0', color: '#fff',
  },
  bubbleUser: {
    background: '#f5f5f5', color: '#333',
  },
  bubbleMeta: { fontSize: 11, opacity: 0.7, marginBottom: 4 },
  bubbleText: { fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  bubbleFile: { fontSize: 12, marginTop: 6, opacity: 0.85 },

  textarea: {
    width: '100%', padding: '12px 14px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, lineHeight: 1.6, outline: 'none',
    resize: 'vertical', marginBottom: 12, boxSizing: 'border-box',
  },
  fileRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  fileLabel: {
    padding: '7px 14px', border: '1px solid #ddd', borderRadius: 6,
    fontSize: 13, color: '#555', cursor: 'pointer', background: '#fafafa',
  },
  fileNameText: { fontSize: 13, color: '#555' },
  emailNote: { fontSize: 12, color: '#aaa', marginBottom: 12 },
  sendBtn: {
    width: '100%', padding: '13px',
    background: '#1565C0', color: '#fff',
    border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, transition: 'opacity 0.15s',
  },
}
