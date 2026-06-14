import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { getSupabaseClient } from '../../lib/supabase'

interface AdminAccount {
  id: number
  name: string
  email: string
  role: 'admin' | 'superadmin'
  created_at: string
  last_sign_in_at: string | null
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function AdminAccountsPage() {
  const router = useRouter()
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [currentEmail, setCurrentEmail] = useState('')
  const [token, setToken] = useState('')

  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [loading, setLoading] = useState(true)

  // 모달 상태
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // 비활성화 확인 상태
  const [confirmTarget, setConfirmTarget] = useState<AdminAccount | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  // 토스트
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadAccounts = useCallback(async (tk: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/accounts/list', {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const data = await res.json()
      if (data.success) setAccounts(data.accounts)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/admin/login'); return }
      setToken(session.access_token)
      setCurrentEmail(session.user.email ?? '')

      fetch('/api/admin/auth/check-role', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then(d => {
          if (d.role !== 'superadmin') router.replace('/admin/dashboard')
          else {
            setAdminName(d.name ?? '')
            setAdminEmail(session.user.email ?? '')
            loadAccounts(session.access_token)
          }
        })
    })
  }, [router, loadAccounts])

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut()
    router.replace('/admin/login')
  }

  const openModal = () => {
    setForm({ name: '', email: '', password: generatePassword(), role: 'admin' })
    setCreateError('')
    setShowModal(true)
  }

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setCreateError('모든 항목을 입력해 주세요.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/admin/accounts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        showToast('관리자 계정이 생성되었습니다.')
        loadAccounts(token)
      } else {
        setCreateError(data.message || '계정 생성에 실패했습니다.')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleDeactivate = async () => {
    if (!confirmTarget) return
    setDeactivating(true)
    try {
      const res = await fetch('/api/admin/accounts/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: confirmTarget.id }),
      })
      const data = await res.json()
      if (data.success) {
        setConfirmTarget(null)
        showToast(`${confirmTarget.name} 계정이 비활성화되었습니다.`)
        loadAccounts(token)
      } else {
        showToast(data.message || '비활성화에 실패했습니다.', 'error')
        setConfirmTarget(null)
      }
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8', fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
      {/* 헤더 */}
      <header style={{ background: '#1a1a1a', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>THE OKTOP</span>
          <span style={{ background: '#333', color: '#aaa', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>슈퍼관리자</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#ccc', fontSize: 13 }}>{adminName}</span>
          <span style={{ color: '#666', fontSize: 13 }}>{adminEmail}</span>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
            로그아웃
          </button>
        </div>
      </header>

      {/* 네비 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 32px', display: 'flex', gap: 0 }}>
        {[
          { label: '대시보드', path: '/admin/dashboard' },
          { label: '의뢰 관리', path: '/admin/orders' },
          { label: '문의 관리', path: '/admin/inquiries' },
          { label: '회원 관리', path: '/admin/users' },
          { label: '계정 관리', path: '/admin/accounts' },
        ].map(item => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '14px 20px',
              cursor: 'pointer',
              fontSize: 14,
              color: item.path === '/admin/accounts' ? '#1a1a1a' : '#666',
              borderBottom: item.path === '/admin/accounts' ? '2px solid #1a1a1a' : '2px solid transparent',
              fontWeight: item.path === '/admin/accounts' ? 600 : 400,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 본문 */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {/* 타이틀 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>관리자 계정 관리</h1>
          <button
            onClick={openModal}
            style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            + 새 관리자 추가
          </button>
        </div>

        {/* 테이블 */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #e8e8e8' }}>
                {['이름', '이메일', '역할', '생성일', '마지막 로그인', '관리'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#666', fontWeight: 500, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} style={{ padding: '14px 16px' }}>
                        <div style={{ height: 14, background: '#f0f0f0', borderRadius: 4, width: j === 1 ? '70%' : '50%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: '#999' }}>
                    등록된 관리자 계정이 없습니다.
                  </td>
                </tr>
              ) : (
                accounts.map(acc => {
                  const isSelf = acc.email === currentEmail
                  return (
                    <tr key={acc.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 500, color: '#1a1a1a' }}>
                        {acc.name}
                        {isSelf && (
                          <span style={{ marginLeft: 6, fontSize: 11, background: '#e8f4fd', color: '#2b6cb0', padding: '1px 6px', borderRadius: 3 }}>
                            나
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#444' }}>{acc.email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: 12,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: acc.role === 'superadmin' ? '#1a1a1a' : '#f0f0f0',
                          color: acc.role === 'superadmin' ? '#fff' : '#555',
                          fontWeight: 500,
                        }}>
                          {acc.role === 'superadmin' ? '슈퍼관리자' : '관리자'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#666' }}>{formatDate(acc.created_at)}</td>
                      <td style={{ padding: '14px 16px', color: '#666' }}>{formatDate(acc.last_sign_in_at)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        {isSelf ? (
                          <span style={{ fontSize: 12, color: '#bbb' }}>본인 계정</span>
                        ) : (
                          <button
                            onClick={() => setConfirmTarget(acc)}
                            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 4, border: '1px solid #e0e0e0', background: '#fff', color: '#e53e3e', cursor: 'pointer' }}
                          >
                            비활성화
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* 새 관리자 추가 모달 */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 10, padding: 32, width: 480, maxWidth: '90vw' }}
          >
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700 }}>새 관리자 추가</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>이름</span>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="관리자 이름"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>이메일</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@example.com"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>임시 비밀번호</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', letterSpacing: 1 }}
                  />
                  <button
                    onClick={() => setForm(f => ({ ...f, password: generatePassword() }))}
                    style={{ padding: '0 14px', border: '1px solid #ddd', borderRadius: 6, background: '#f9f9f9', cursor: 'pointer', fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}
                  >
                    자동 생성
                  </button>
                </div>
                <span style={{ fontSize: 12, color: '#999', marginTop: 4 }}>이 비밀번호로 안내 이메일이 발송됩니다.</span>
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>역할</span>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { value: 'admin', label: '관리자', desc: '일반 관리 기능' },
                    { value: 'superadmin', label: '슈퍼관리자', desc: '계정 관리 포함' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        padding: '10px 12px',
                        border: `1px solid ${form.role === opt.value ? '#1a1a1a' : '#e0e0e0'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: form.role === opt.value ? '#fafafa' : '#fff',
                      }}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={opt.value}
                        checked={form.role === opt.value}
                        onChange={() => setForm(f => ({ ...f, role: opt.value }))}
                        style={{ marginTop: 2, accentColor: '#1a1a1a' }}
                      />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </label>
            </div>

            {createError && (
              <p style={{ margin: '16px 0 0', fontSize: 13, color: '#e53e3e' }}>{createError}</p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                disabled={creating}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', color: '#555', cursor: 'pointer', fontSize: 14 }}
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 6, background: '#1a1a1a', color: '#fff', cursor: creating ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: creating ? 0.7 : 1 }}
              >
                {creating ? '생성 중...' : '계정 생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비활성화 확인 모달 */}
      {confirmTarget && (
        <div
          onClick={() => { if (!deactivating) setConfirmTarget(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 10, padding: 32, width: 400, maxWidth: '90vw' }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>계정 비활성화</h3>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: '#444', lineHeight: 1.6 }}>
              <strong>{confirmTarget.name}</strong>({confirmTarget.email}) 계정을 비활성화하시겠습니까?
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#e53e3e' }}>
              비활성화된 계정은 더 이상 로그인할 수 없습니다.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmTarget(null)}
                disabled={deactivating}
                style={{ padding: '9px 18px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', color: '#555', cursor: 'pointer', fontSize: 14 }}
              >
                취소
              </button>
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                style={{ padding: '9px 18px', border: 'none', borderRadius: 6, background: '#e53e3e', color: '#fff', cursor: deactivating ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: deactivating ? 0.7 : 1 }}
              >
                {deactivating ? '처리 중...' : '비활성화'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
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

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const labelTextStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#555',
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}
