export interface SiteFormState {
  title: string
  address: string
  area: string
  area_unit: string
  site_type: string
  construction_status: string
  progress_rate: string
  description: string
  is_featured_on_main: boolean
  display_order: string
  status: string
}

export const EMPTY_SITE_FORM: SiteFormState = {
  title: '',
  address: '',
  area: '',
  area_unit: '㎡',
  site_type: '',
  construction_status: 'ongoing',
  progress_rate: '',
  description: '',
  is_featured_on_main: false,
  display_order: '0',
  status: 'published',
}

export function ConstructionSiteFields({
  values,
  onChange,
}: {
  values: SiteFormState
  onChange: (next: Partial<SiteFormState>) => void
}) {
  return (
    <div style={fs.grid}>
      <div style={fs.group}>
        <label style={fs.label}>제목 *</label>
        <input
          type="text" value={values.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="옥탑 1호" style={fs.input} required
        />
      </div>

      <div style={fs.group}>
        <label style={fs.label}>주소</label>
        <input
          type="text" value={values.address}
          onChange={e => onChange({ address: e.target.value })}
          placeholder="서울시 동작구" style={fs.input}
        />
      </div>

      <div style={fs.row}>
        <div style={{ ...fs.group, flex: 2 }}>
          <label style={fs.label}>면적</label>
          <input
            type="number" step="0.01" value={values.area}
            onChange={e => onChange({ area: e.target.value })}
            placeholder="26.24" style={fs.input}
          />
        </div>
        <div style={{ ...fs.group, flex: 1 }}>
          <label style={fs.label}>단위</label>
          <select value={values.area_unit} onChange={e => onChange({ area_unit: e.target.value })} style={fs.input}>
            <option value="㎡">㎡</option>
            <option value="평">평</option>
          </select>
        </div>
      </div>

      <div style={fs.row}>
        <div style={{ ...fs.group, flex: 1 }}>
          <label style={fs.label}>유형</label>
          <input
            type="text" value={values.site_type}
            onChange={e => onChange({ site_type: e.target.value })}
            placeholder="옥탑" style={fs.input}
          />
        </div>
        <div style={{ ...fs.group, flex: 1 }}>
          <label style={fs.label}>시공상태</label>
          <select
            value={values.construction_status}
            onChange={e => onChange({ construction_status: e.target.value })}
            style={fs.input}
          >
            <option value="ongoing">시공중</option>
            <option value="completed">완공</option>
          </select>
        </div>
      </div>

      <div style={fs.group}>
        <label style={fs.label}>공정률 (0~100)</label>
        <input
          type="number" min={0} max={100} value={values.progress_rate}
          onChange={e => onChange({ progress_rate: e.target.value })}
          placeholder="87" style={fs.input}
        />
      </div>

      <div style={fs.group}>
        <label style={fs.label}>추가 설명</label>
        <textarea
          value={values.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="현장에 대한 설명을 입력하세요." rows={5} style={fs.textarea}
        />
      </div>

      <div style={fs.row}>
        <div style={{ ...fs.group, flex: 1 }}>
          <label style={fs.label}>표시 순서</label>
          <input
            type="number" value={values.display_order}
            onChange={e => onChange({ display_order: e.target.value })}
            style={fs.input}
          />
        </div>
        <div style={{ ...fs.group, flex: 1 }}>
          <label style={fs.label}>공개 상태</label>
          <select value={values.status} onChange={e => onChange({ status: e.target.value })} style={fs.input}>
            <option value="published">공개</option>
            <option value="draft">비공개</option>
          </select>
        </div>
      </div>

      <label style={fs.checkboxLabel}>
        <input
          type="checkbox"
          checked={values.is_featured_on_main}
          onChange={e => onChange({ is_featured_on_main: e.target.checked })}
        />
        <span>메인페이지에 노출</span>
      </label>
    </div>
  )
}

export const fs: Record<string, React.CSSProperties> = {
  grid: { display: 'flex', flexDirection: 'column', gap: 16 },
  row: { display: 'flex', gap: 16 },
  group: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#555' },
  input: {
    padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  },
  textarea: {
    padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit',
  },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#333', cursor: 'pointer' },
}
