import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Header from '../../components/Header'
import AddressSearch, { AddressInfo } from '../../components/AddressSearch'

const ORDER_TYPES = ['매매', '전세', '임대', '기타']
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
const MAX_BYTES = 10 * 1024 * 1024

type FileState = {
  file: File
  previewUrl: string | null
  uploading: boolean
  uploadedUrl: string | null
  error: string
}

export default function NewOrderPage() {
  const router = useRouter()

  const [addressMode, setAddressMode] = useState<'search' | 'manual'>('search')
  const [buildingAddress, setBuildingAddress] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null)
  const [orderType, setOrderType] = useState('')
  const [description, setDescription] = useState('')
  const [fileState, setFileState] = useState<FileState | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const mapClientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
    if (!mapClientId || mapClientId === '') {
      setAddressMode('manual')
      return
    }

    if (typeof window !== 'undefined' && !window.naver) {
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${mapClientId}&submodules=geocoder`
      script.async = true
      script.onload = () => setMapLoaded(true)
      script.onerror = () => {
        console.error('네이버 지도 로드 실패')
        setAddressMode('manual')
      }
      document.head.appendChild(script)
    } else if (typeof window !== 'undefined' && window.naver) {
      setMapLoaded(true)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setFileState({ file, previewUrl: null, uploading: false, uploadedUrl: null, error: 'PDF, JPG, PNG 파일만 업로드 가능합니다.' })
      return
    }
    if (file.size > MAX_BYTES) {
      setFileState({ file, previewUrl: null, uploading: false, uploadedUrl: null, error: '파일 크기는 10MB를 초과할 수 없습니다.' })
      return
    }

    const isImage = file.type.startsWith('image/')
    const previewUrl = isImage ? URL.createObjectURL(file) : null
    setFileState({ file, previewUrl, uploading: false, uploadedUrl: null, error: '' })
  }

  const removeFile = () => {
    if (fileState?.previewUrl) URL.revokeObjectURL(fileState.previewUrl)
    setFileState(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadToS3 = async (file: File): Promise<string> => {
    const urlRes = await fetch('/api/documents/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
    })
    if (!urlRes.ok) {
      let message = '업로드 URL 발급에 실패했습니다.'
      try {
        const errData = await urlRes.json()
        if (errData.message) message = errData.message
      } catch {
        const text = await urlRes.text().catch(() => '')
        console.error('[upload-url] 서버 응답 (비 JSON):', text)
      }
      throw new Error(message)
    }
    const urlData = await urlRes.json()

    const s3Res = await fetch(urlData.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })
    if (!s3Res.ok) throw new Error('S3 업로드에 실패했습니다.')

    return urlData.fileUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    if (!orderType) {
      setSubmitError('의뢰 유형을 선택해주세요.')
      return
    }

    setSubmitting(true)

    try {
      let uploadedFileUrl: string | null = null
      if (fileState?.file) {
        setFileState(prev => prev ? { ...prev, uploading: true } : prev)
        uploadedFileUrl = await uploadToS3(fileState.file)
        setFileState(prev => prev ? { ...prev, uploading: false, uploadedUrl: uploadedFileUrl } : prev)
      }

      const isSearch = addressMode === 'search'
      const orderRes = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building_address: buildingAddress,
          building_detail:  isSearch ? (addressInfo?.detail?.trim() || null) : null,
          road_address:     isSearch ? (addressInfo?.roadAddress  || null) : null,
          jibun_address:    isSearch ? (addressInfo?.jibunAddress || null) : null,
          building_name:    isSearch ? (addressInfo?.buildingName || null) : null,
          zip_code:         isSearch ? (addressInfo?.zipCode      || null) : null,
          lat:              isSearch ? (addressInfo?.lat          ?? null) : null,
          lng:              isSearch ? (addressInfo?.lng          ?? null) : null,
          order_type: orderType,
          description: description.trim() || null,
        }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderData.message)

      if (fileState?.file && uploadedFileUrl) {
        const saveRes = await fetch('/api/documents/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderData.orderId,
            fileName: fileState.file.name,
            fileUrl: uploadedFileUrl,
            fileType: fileState.file.type,
          }),
        })
        const saveData = await saveRes.json()
        if (!saveRes.ok) throw new Error(saveData.message)
      }

      router.push('/mypage/orders')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '오류가 발생했습니다. 다시 시도해주세요.')
      setFileState(prev => prev ? { ...prev, uploading: false } : prev)
    }
    setSubmitting(false)
  }

  const isUploading = fileState?.uploading ?? false

  return (
    <div style={s.page}>
      <Header />
      <div style={s.container}>

        <div style={s.header}>
          <Link href="/mypage" style={s.backLink}>← 마이페이지</Link>
        </div>

        <h2 style={s.pageTitle}>새 의뢰 등록</h2>

        <form onSubmit={handleSubmit} style={s.form} noValidate>

          {/* 건물 주소 */}
          <div style={s.section}>
            <h3 style={s.sectionTitle}>건물 주소</h3>

            <div>
              {/* 탭 버튼 */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '1px solid #eee',
                paddingBottom: '12px',
              }}>
                <button
                  type="button"
                  onClick={() => setAddressMode('search')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: addressMode === 'search' ? '#D4AF37' : '#ddd',
                    background: addressMode === 'search' ? '#D4AF37' : 'transparent',
                    color: addressMode === 'search' ? '#111' : '#666',
                    fontSize: '13px',
                    fontWeight: addressMode === 'search' ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  🔍 주소 검색
                </button>
                <button
                  type="button"
                  onClick={() => setAddressMode('manual')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: addressMode === 'manual' ? '#D4AF37' : '#ddd',
                    background: addressMode === 'manual' ? '#D4AF37' : 'transparent',
                    color: addressMode === 'manual' ? '#111' : '#666',
                    fontSize: '13px',
                    fontWeight: addressMode === 'manual' ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  ✏️ 직접 입력
                </button>
              </div>

              {/* 주소 검색 모드 */}
              {addressMode === 'search' && (
                <div>
                  {mapLoaded ? (
                    <AddressSearch
                      onAddressSelect={(addr) => {
                        const address = addr.roadAddress || addr.jibunAddress || ''
                        setAddressInfo(addr)
                        setBuildingAddress(address)
                        setManualAddress(address)
                      }}
                    />
                  ) : (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#888',
                      background: '#f9f9f9',
                      borderRadius: '8px',
                      border: '1px solid #eee',
                    }}>
                      <p style={{ marginBottom: '12px' }}>
                        지도를 불러오는 중이거나 API 키 오류가 있습니다
                      </p>
                      <button
                        type="button"
                        onClick={() => setAddressMode('manual')}
                        style={{
                          padding: '8px 16px',
                          background: '#D4AF37',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        직접 입력으로 전환
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 직접 입력 모드 */}
              {addressMode === 'manual' && (
                <div>
                  <input
                    type="text"
                    placeholder="예: 서울시 강남구 테헤란로 123 OO빌딩"
                    value={manualAddress}
                    onChange={e => {
                      setManualAddress(e.target.value)
                      setBuildingAddress(e.target.value)
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box' as const,
                      outline: 'none',
                      color: '#111',
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
                    도로명 주소 또는 지번 주소를 직접 입력해주세요
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 의뢰 유형 */}
          <div style={s.section}>
            <h3 style={s.sectionTitle}>의뢰 유형</h3>
            <div style={s.radioGroup}>
              {ORDER_TYPES.map(type => (
                <label key={type} style={s.radioLabel}>
                  <input
                    type="radio"
                    name="orderType"
                    value={type}
                    checked={orderType === type}
                    onChange={e => setOrderType(e.target.value)}
                    style={s.radioInput}
                  />
                  <span style={{ ...s.radioChip, ...(orderType === type ? s.radioChipActive : {}) }}>
                    {type}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 의뢰 내용 */}
          <div style={s.section}>
            <h3 style={s.sectionTitle}>의뢰 내용</h3>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="의뢰하시려는 내용을 자유롭게 작성해주세요."
              style={s.textarea}
              rows={5}
            />
          </div>

          {/* 파일 업로드 */}
          <div style={s.section}>
            <h3 style={s.sectionTitle}>등기부등본 첨부</h3>
            <p style={s.sectionDesc}>PDF, JPG, PNG · 최대 10MB</p>

            {!fileState ? (
              <label style={s.dropZone}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <span style={s.dropIcon}>📎</span>
                <span style={s.dropText}>파일을 선택하거나 드래그하세요</span>
                <span style={s.dropHint}>PDF · JPG · PNG · 최대 10MB</span>
              </label>
            ) : (
              <div style={s.filePreviewWrap}>
                {fileState.error ? (
                  <p style={s.fileError}>{fileState.error}</p>
                ) : fileState.previewUrl ? (
                  <img src={fileState.previewUrl} alt="미리보기" style={s.previewImg} />
                ) : (
                  <div style={s.pdfPreview}>
                    <span style={s.pdfIcon}>📄</span>
                    <span style={s.pdfName}>{fileState.file.name}</span>
                    <span style={s.pdfSize}>
                      {(fileState.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                )}
                {!fileState.error && (
                  <p style={s.fileName}>{fileState.file.name}</p>
                )}
                {isUploading && <p style={s.uploadingMsg}>S3 업로드 중...</p>}
                <button type="button" onClick={removeFile} style={s.removeFileBtn}>
                  파일 제거
                </button>
              </div>
            )}
          </div>

          {submitError && <p style={s.error}>{submitError}</p>}

          <button
            type="submit"
            style={s.submitBtn}
            disabled={submitting || isUploading}
          >
            {submitting ? '등록 중...' : '의뢰 등록하기'}
          </button>

        </form>
      </div>
    </div>
  )
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f7f7f7',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  container: {
    maxWidth: 680,
    margin: '0 auto',
    padding: '0 24px 80px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 0',
    borderBottom: '1px solid #ebebeb',
    marginBottom: 40,
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
    marginBottom: 32,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
  },
  section: {
    background: '#fff',
    borderRadius: 16,
    padding: '28px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#111',
    margin: 0,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#aaa',
    margin: '-4px 0 0',
  },
  radioGroup: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  radioLabel: {
    cursor: 'pointer',
  },
  radioInput: {
    display: 'none',
  },
  radioChip: {
    display: 'inline-block',
    padding: '8px 20px',
    border: '1.5px solid #e0e0e0',
    borderRadius: 99,
    fontSize: 14,
    color: '#555',
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  radioChipActive: {
    border: '1.5px solid #111',
    background: '#111',
    color: '#fff',
  },
  textarea: {
    padding: '12px 14px',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.6,
    width: '100%',
    boxSizing: 'border-box',
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '36px',
    border: '2px dashed #ddd',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  dropIcon: { fontSize: 32 },
  dropText: { fontSize: 14, color: '#555', fontWeight: 500 },
  dropHint: { fontSize: 12, color: '#aaa' },
  filePreviewWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    padding: '20px',
    border: '1.5px solid #e0e0e0',
    borderRadius: 12,
    background: '#fafafa',
  },
  previewImg: {
    maxWidth: '100%',
    maxHeight: 240,
    borderRadius: 8,
    objectFit: 'contain',
  },
  pdfPreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  pdfIcon: { fontSize: 40 },
  pdfName: { fontSize: 13, color: '#333', fontWeight: 500, textAlign: 'center' },
  pdfSize: { fontSize: 12, color: '#aaa' },
  fileName: {
    fontSize: 12,
    color: '#888',
    margin: 0,
  },
  fileError: {
    fontSize: 13,
    color: '#E53935',
    margin: 0,
  },
  uploadingMsg: {
    fontSize: 13,
    color: '#555',
    margin: 0,
  },
  removeFileBtn: {
    padding: '6px 14px',
    background: 'transparent',
    color: '#E53935',
    border: '1px solid #FFCDD2',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer',
    marginTop: 4,
  },
  error: {
    fontSize: 13,
    color: '#E53935',
    background: '#FFF5F5',
    border: '1px solid #FFCDD2',
    borderRadius: 8,
    padding: '12px 16px',
    margin: 0,
  },
  submitBtn: {
    padding: '16px',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
}
