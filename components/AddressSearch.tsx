import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeocodeResult } from '../pages/api/maps/geocode'

/* ── Public types ─────────────────────────────────────────── */
export interface AddressInfo extends GeocodeResult {
  detail: string
}

interface Props {
  onAddressSelect: (address: AddressInfo) => void
}

/* ── Naver Maps global ────────────────────────────────────── */
declare global {
  interface Window { naver: any }
}

/* ═══════════════════════════════════════════════════════════
   AddressSearch Component
   ═══════════════════════════════════════════════════════════ */
export default function AddressSearch({ onAddressSelect }: Props) {
  const [query,    setQuery]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [results,  setResults]  = useState<GeocodeResult[]>([])
  const [error,    setError]    = useState('')
  const [selected, setSelected] = useState<GeocodeResult | null>(null)
  const [detail,   setDetail]   = useState('')
  const [mapReady, setMapReady] = useState(false)
  const [clientId, setClientId] = useState('')
  const [ready,    setReady]    = useState(false)

  const mapRef   = useRef<HTMLDivElement>(null)
  const mapInst  = useRef<any>(null)
  const markerInst = useRef<any>(null)

  /* ── Load Naver Maps SDK ─────────────────────────────────── */
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || ''
    setClientId(id)

    if (!id) {
      setReady(false)
      return
    }

    if ((window as any).naver?.maps?.Map) {
      setMapReady(true)
      setReady(true)
      return
    }

    const existing = document.querySelector('script[src*="oapi.map.naver.com"]')
    if (existing) {
      existing.addEventListener('load', () => { setMapReady(true); setReady(true) })
      return
    }

    const script    = document.createElement('script')
    script.id       = 'naver-maps-sdk'
    script.src      = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${id}&submodules=geocoder`
    script.async    = true
    script.onload   = () => { setMapReady(true); setReady(true) }
    script.onerror  = () => {
      console.error('[AddressSearch] 네이버 지도 SDK 로드 실패. NCP 콘솔에서 Maps 서비스 활성화 및 도메인 등록을 확인하세요.')
      setReady(false)
    }
    document.head.appendChild(script)
  }, [])

  /* ── Init / update map when address selected ─────────────── */
  useEffect(() => {
    if (!mapReady || !selected || !mapRef.current) return

    const { lat, lng } = selected
    if (!lat || !lng) return

    const center = new window.naver.maps.LatLng(lat, lng)

    if (!mapInst.current) {
      mapInst.current = new window.naver.maps.Map(mapRef.current, {
        center,
        zoom: 16,
        scaleControl:  false,
        mapDataControl: false,
      })
      markerInst.current = new window.naver.maps.Marker({
        position: center,
        map: mapInst.current,
      })
    } else {
      mapInst.current.setCenter(center)
      mapInst.current.setZoom(16)
      markerInst.current.setPosition(center)
    }
  }, [mapReady, selected])

  /* ── Search ──────────────────────────────────────────────── */
  const search = useCallback(async () => {
    const q = query.trim()
    if (!q || loading) return

    setLoading(true)
    setError('')
    setResults([])

    try {
      const res  = await fetch(`/api/maps/geocode?query=${encodeURIComponent(q)}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '검색 중 오류가 발생했습니다.')
        return
      }

      const list: GeocodeResult[] = Array.isArray(data) ? data : [data]
      if (list.length === 0) {
        setError('검색 결과가 없습니다. 더 자세한 주소로 검색해보세요.')
      } else {
        setResults(list)
      }
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }, [query, loading])

  /* ── Select result ───────────────────────────────────────── */
  const handleSelect = (result: GeocodeResult) => {
    setSelected(result)
    setResults([])
    setDetail('')
    onAddressSelect({ ...result, detail: '' })
  }

  /* ── Detail change ───────────────────────────────────────── */
  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setDetail(v)
    if (selected) onAddressSelect({ ...selected, detail: v })
  }

  /* ── Reset ───────────────────────────────────────────────── */
  const handleReset = () => {
    setSelected(null)
    setDetail('')
    setQuery('')
    setResults([])
    setError('')
    mapInst.current   = null
    markerInst.current = null
  }

  /* ── Render ──────────────────────────────────────────────── */
  if (!clientId || !ready) return (
    <div style={{ color: '#888', fontSize: '13px', padding: '8px' }}>
      주소 검색을 준비 중입니다...
    </div>
  )

  return (
    <div style={s.wrap}>
      {/* Spinner keyframes injection */}
      <style>{`@keyframes addr-spin{to{transform:rotate(360deg)}}`}</style>

      {/* ① 검색창 */}
      <div style={s.searchRow}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="도로명 또는 지번 주소를 입력하세요"
          style={s.searchInput}
          disabled={loading}
          aria-label="주소 검색"
        />
        <button
          type="button"
          onClick={search}
          disabled={loading || !query.trim()}
          style={{
            ...s.searchBtn,
            opacity: (!loading && query.trim()) ? 1 : 0.55,
            cursor:  (!loading && query.trim()) ? 'pointer' : 'not-allowed',
          }}
          aria-label="검색"
        >
          {loading
            ? <span style={s.spinner} aria-hidden="true" />
            : '검색'}
        </button>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div style={s.errorBox} role="alert">
          <span style={s.errorIcon}>⚠</span> {error}
        </div>
      )}

      {/* ② 검색 결과 목록 */}
      {results.length > 0 && (
        <ul style={s.resultList} role="listbox" aria-label="검색 결과">
          {results.map((r, i) => (
            <li
              key={i}
              style={s.resultCard}
              onClick={() => handleSelect(r)}
              role="option"
              aria-selected={false}
              onMouseEnter={e => (e.currentTarget.style.background = '#fdf8ef')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              <span style={s.pinIcon} aria-hidden="true">📍</span>
              <div style={s.resultText}>
                <p style={s.roadAddr}>{r.roadAddress || r.jibunAddress}</p>
                {r.roadAddress && r.jibunAddress && r.roadAddress !== r.jibunAddress && (
                  <p style={s.jibunAddr}>{r.jibunAddress}</p>
                )}
                {r.buildingName && (
                  <p style={s.buildingName}>{r.buildingName}</p>
                )}
              </div>
              <span style={s.selectHint}>선택</span>
            </li>
          ))}
        </ul>
      )}

      {/* ③ 선택된 주소 + ④ 지도 */}
      {selected && (
        <div style={s.selectedBox}>
          {/* 헤더 */}
          <div style={s.selectedHeader}>
            <span style={s.selectedLabel}>선택된 주소</span>
            <button type="button" onClick={handleReset} style={s.resetBtn}>
              다시 검색
            </button>
          </div>

          {/* 주소 정보 그리드 */}
          <div style={s.infoBox}>
            <InfoRow label="도로명" value={selected.roadAddress} />
            <InfoRow label="지번"   value={selected.jibunAddress} />
            {selected.buildingName && (
              <InfoRow label="건물명" value={selected.buildingName} highlight />
            )}
            {selected.zipCode && (
              <InfoRow label="우편번호" value={selected.zipCode} />
            )}
          </div>

          {/* 상세 주소 입력 */}
          <input
            type="text"
            value={detail}
            onChange={handleDetailChange}
            placeholder="상세 주소 입력 (동/호수 등)"
            style={s.detailInput}
            aria-label="상세 주소"
          />

          {/* 네이버 지도 */}
          <div style={s.mapWrap}>
            <div
              ref={mapRef}
              style={{ ...s.map, display: mapReady && selected.lat ? 'block' : 'none' }}
              aria-label="주소 위치 지도"
            />
            {(!mapReady || !selected.lat) && (
              <div style={s.mapFallback}>
                {!mapReady
                  ? <><span style={s.mapSpinner} />지도 로딩 중...</>
                  : '선택한 주소의 좌표 정보가 없습니다.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── InfoRow sub-component ───────────────────────────────── */
function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div style={s.infoRow}>
      <span style={s.checkIcon} aria-hidden="true">✅</span>
      <span style={s.infoLabel}>{label}</span>
      <span style={{ ...s.infoValue, ...(highlight ? s.infoValueHighlight : {}) }}>
        {value}
      </span>
    </div>
  )
}

/* ── Styles ──────────────────────────────────────────────── */
const GOLD   = '#C9A84C'
const GOLD_L = '#F5EDD3'

const s: Record<string, React.CSSProperties> = {
  wrap: {
    display:       'flex',
    flexDirection: 'column',
    gap:           12,
    width:         '100%',
    fontFamily:    "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
  },

  /* Search row */
  searchRow: {
    display:   'flex',
    gap:       8,
    alignItems: 'stretch',
  },
  searchInput: {
    flex:        1,
    minWidth:    0,
    padding:     '12px 14px',
    border:      '1.5px solid #e0ddd6',
    borderRadius: 8,
    fontSize:    14,
    outline:     'none',
    fontFamily:  'inherit',
    background:  '#fff',
    color:       '#1a1a1a',
    transition:  'border-color 0.2s',
  },
  searchBtn: {
    padding:      '0 22px',
    background:   GOLD,
    color:        '#fff',
    border:       'none',
    borderRadius:  8,
    fontSize:     14,
    fontWeight:   700,
    whiteSpace:   'nowrap',
    minWidth:     72,
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    transition:   'background 0.2s',
  },
  spinner: {
    display:        'inline-block',
    width:          16,
    height:         16,
    borderRadius:   '50%',
    border:         '2.5px solid rgba(255,255,255,0.35)',
    borderTopColor: '#fff',
    animation:      'addr-spin 0.7s linear infinite',
  },

  /* Error */
  errorBox: {
    display:      'flex',
    alignItems:   'center',
    gap:          6,
    padding:      '10px 14px',
    fontSize:     13,
    color:        '#c0392b',
    background:   '#fff5f5',
    border:       '1px solid #ffc9c9',
    borderRadius:  8,
  },
  errorIcon: { fontSize: 14 },

  /* Results list */
  resultList: {
    listStyle:    'none',
    padding:      0,
    margin:       0,
    border:       '1.5px solid #ede8de',
    borderRadius:  10,
    background:   '#fff',
    maxHeight:    300,
    overflowY:    'auto',
    boxShadow:    '0 4px 16px rgba(0,0,0,0.07)',
  },
  resultCard: {
    display:      'flex',
    alignItems:   'center',
    gap:          12,
    padding:      '14px 16px',
    cursor:       'pointer',
    borderBottom: '1px solid #f5f0e8',
    background:   '#fff',
    transition:   'background 0.15s',
  },
  pinIcon:      { fontSize: 18, flexShrink: 0 },
  resultText:   { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  roadAddr:     { fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0, lineHeight: 1.4 },
  jibunAddr:    { fontSize: 12, color: '#999', margin: 0 },
  buildingName: { fontSize: 12, color: GOLD, fontWeight: 700, margin: 0 },
  selectHint: {
    fontSize:   11,
    color:      GOLD,
    fontWeight: 600,
    flexShrink: 0,
    padding:    '3px 8px',
    border:     `1px solid ${GOLD}`,
    borderRadius: 4,
    opacity:    0.7,
  },

  /* Selected box */
  selectedBox: {
    display:       'flex',
    flexDirection: 'column',
    gap:           12,
    padding:       '16px',
    border:        `1.5px solid ${GOLD}`,
    borderRadius:   12,
    background:    '#fffcf5',
  },
  selectedHeader: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  selectedLabel: {
    fontSize:    12,
    fontWeight:  700,
    color:       GOLD,
    letterSpacing: '0.07em',
    textTransform: 'uppercase' as const,
  },
  resetBtn: {
    fontSize:     12,
    color:        '#888',
    background:   'transparent',
    border:       '1px solid #ddd',
    borderRadius:  6,
    padding:      '4px 10px',
    cursor:       'pointer',
    fontFamily:   'inherit',
    transition:   'border-color 0.15s',
  },

  /* Info grid */
  infoBox: {
    display:       'flex',
    flexDirection: 'column',
    gap:           7,
    padding:       '12px 14px',
    background:    '#fff',
    borderRadius:   8,
    border:        '1px solid #f0ebe0',
  },
  infoRow: {
    display:    'flex',
    alignItems: 'baseline',
    gap:        8,
  },
  checkIcon:   { fontSize: 12, flexShrink: 0 },
  infoLabel: {
    fontSize:   12,
    color:      '#999',
    minWidth:   52,
    flexShrink: 0,
  },
  infoValue: {
    fontSize:    13,
    color:       '#1a1a1a',
    fontWeight:  500,
    wordBreak:   'break-all' as const,
    lineHeight:  1.5,
  },
  infoValueHighlight: {
    color:      GOLD,
    fontWeight: 700,
  },

  /* Detail input */
  detailInput: {
    padding:      '11px 14px',
    border:       '1.5px solid #e0ddd6',
    borderRadius:  8,
    fontSize:     14,
    outline:      'none',
    fontFamily:   'inherit',
    width:        '100%',
    boxSizing:    'border-box' as const,
    background:   '#fff',
    color:        '#1a1a1a',
  },

  /* Map */
  mapWrap: {
    width:        '100%',
    borderRadius:  10,
    overflow:     'hidden',
    background:   '#f0ebe0',
  },
  map: {
    width:  '100%',
    height:  300,
  },
  mapFallback: {
    height:         300,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            10,
    fontSize:       13,
    color:          '#999',
  },
  mapSpinner: {
    display:        'inline-block',
    width:          18,
    height:         18,
    borderRadius:   '50%',
    border:         '2.5px solid #ddd',
    borderTopColor: GOLD,
    animation:      'addr-spin 0.8s linear infinite',
  },
}
