import type { NextApiRequest, NextApiResponse } from 'next'

const GEOCODE_URL = 'https://maps.apigw.ntruss.com/map-geocode/v2/geocode'

export interface GeocodeResult {
  roadAddress: string
  jibunAddress: string
  buildingName: string
  zipCode: string
  lat: number
  lng: number
}

type ErrorResponse = { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeocodeResult[] | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { query } = req.query
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: '주소(query)를 입력해주세요.' })
  }

  const clientId     = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: '네이버 지도 API 키가 설정되지 않았습니다.' })
  }

  const url = `${GEOCODE_URL}?query=${encodeURIComponent(query.trim())}`

  let naverRes: Response
  try {
    naverRes = await fetch(url, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY':    clientSecret,
      },
    })
  } catch {
    return res.status(502).json({ error: '네이버 Geocoding API 요청 중 네트워크 오류가 발생했습니다.' })
  }

  if (!naverRes.ok) {
    return res.status(naverRes.status).json({ error: `네이버 API 오류: ${naverRes.status}` })
  }

  const data = await naverRes.json()
  const addresses: any[] = data?.addresses ?? []

  if (addresses.length === 0) {
    return res.status(404).json({ error: '주소 검색 결과가 없습니다.' })
  }

  const results: GeocodeResult[] = addresses.slice(0, 5).map((addr: any) => ({
    roadAddress:  addr.roadAddress  ?? '',
    jibunAddress: addr.jibunAddress ?? '',
    buildingName: addr.addressElements
      ?.find((el: any) => el.types?.includes('BUILDING_NAME'))
      ?.longName ?? '',
    zipCode: addr.addressElements
      ?.find((el: any) => el.types?.includes('POSTAL_CODE'))
      ?.longName ?? '',
    lat: parseFloat(addr.y ?? '0'),
    lng: parseFloat(addr.x ?? '0'),
  }))

  return res.status(200).json(results)
}
