import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// .env.local 직접 파싱
const envPath = resolve(process.cwd(), '.env.local')
const envText = readFileSync(envPath, 'utf8')
for (const line of envText.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx < 0) continue
  const key = trimmed.slice(0, idx).trim()
  const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
  if (!process.env[key]) process.env[key] = val
}

const pool = new pg.Pool({
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  port: Number(process.env.DATABASE_PORT) || 5432,
  ssl: { rejectUnauthorized: false },
})

function images(urls) {
  return JSON.stringify(urls.map((url, order) => ({ url, order })))
}

const SEED = [
  {
    title: '옥탑 1호',
    address: '서울시 동작구',
    area: 26.24,
    site_type: '옥탑',
    construction_status: 'ongoing',
    progress_rate: 87,
    description:
      '옥탑 1호를 쾌적한 공간으로 리노베이션하는 프로젝트입니다. 단열 보강, 내외부 마감재 교체, 루프탑 테라스 조성을 포함한 전면 리모델링을 진행 중이며 현재 공정률 87%를 달성하였습니다. 용적율은 249.89%에서 260.56%로 증가(10.67%)했으며, 예정 준공은 2026년 9월입니다.',
    images: images([
      '/theoktop_no01.png',
      '/images/01_00.png', '/images/01_01.png', '/images/01_03.jpg', '/images/01_04.jpg',
      '/images/01_05.jpg', '/images/01_07.jpg', '/images/01_08.jpg', '/images/01_09.jpg',
    ]),
    display_order: 0,
  },
  {
    title: '옥탑 2호',
    address: '서울시 동작구',
    area: 26.18,
    site_type: '옥탑',
    construction_status: 'ongoing',
    progress_rate: 85,
    description:
      '옥탑 2호를 쾌적하고 실용적인 공간으로 탈바꿈하는 프로젝트입니다. 단열 및 방수 보강, 내부 마감재 교체, 생활 편의시설 설치를 포함한 전면 리모델링을 진행 중이며 현재 공정률 85%를 달성하였습니다. 용적율은 249.89%에서 260.56%로 증가(10.67%)했으며, 예정 준공은 2026년 11월입니다.',
    images: images([
      '/theoktop_no02.png',
      '/images/02_02.jpg', '/images/02_03.jpg', '/images/02_04.jpg', '/images/02_05.jpg',
      '/images/02_06.jpg', '/images/02_07.jpg', '/images/02_08.jpg',
    ]),
    display_order: 1,
  },
  {
    title: '옥탑 3호',
    address: '서울시 동작구',
    area: 26,
    site_type: '옥탑',
    construction_status: 'ongoing',
    progress_rate: 70,
    description:
      '옥탑 3호를 현대적인 공간으로 리노베이션하는 프로젝트입니다. 단열 및 방수 보강, 내외부 마감 교체, 루프탑 테라스 조성을 포함한 전면 리모델링을 진행 중이며 현재 공정률 70%를 달성하였습니다. 용적율은 198.38%에서 236.86%로 증가(38.48%)했으며, 예정 준공은 2026년 12월입니다.',
    images: images(['/images/03_00.jpg', '/images/03_01.jpg']),
    display_order: 2,
  },
]

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS construction_sites (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      address VARCHAR(255),
      area NUMERIC,
      area_unit VARCHAR(10) DEFAULT '㎡',
      site_type VARCHAR(50),
      construction_status VARCHAR(20) DEFAULT 'ongoing'
        CHECK (construction_status IN ('ongoing', 'completed')),
      progress_rate INTEGER CHECK (progress_rate BETWEEN 0 AND 100),
      description TEXT,
      images JSONB DEFAULT '[]',
      is_featured_on_main BOOLEAN DEFAULT false,
      display_order INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'draft')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)
  console.log('construction_sites 테이블 생성 완료 (이미 있으면 스킵)')

  const { rows: existing } = await pool.query(
    `SELECT id, title FROM construction_sites WHERE title = ANY($1)`,
    [SEED.map(s => s.title)]
  )
  if (existing.length > 0) {
    console.log('이미 시드 데이터가 존재합니다, 삽입을 스킵합니다:', existing)
  } else {
    for (const s of SEED) {
      const { rows } = await pool.query(
        `INSERT INTO construction_sites
           (title, address, area, site_type, construction_status, progress_rate,
            description, images, is_featured_on_main, display_order, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, 'published')
         RETURNING id, title`,
        [s.title, s.address, s.area, s.site_type, s.construction_status, s.progress_rate,
         s.description, s.images, s.display_order]
      )
      console.log('시드 삽입:', rows[0])
    }
  }

  const { rows: final } = await pool.query(
    `SELECT id, title, address, progress_rate, is_featured_on_main, display_order, status
     FROM construction_sites ORDER BY display_order`
  )
  console.log('\n최종 construction_sites:')
  final.forEach(r => console.log(' ', r))

  await pool.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
