import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const REGION = process.env.AWS_REGION ?? 'ap-northeast-2'
const BUCKET = process.env.AWS_S3_BUCKET ?? 'theoktop-documents'

export const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/**
 * 파일 업로드용 presigned PUT URL 발급
 * 프론트엔드에서 S3에 직접 PUT 요청으로 업로드
 */
export async function getUploadPresignedUrl(
  key: string,
  contentType: string,
  contentLength: number,
  expiresIn = 300
): Promise<{ uploadUrl: string; fileUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  })

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn })
  const fileUrl   = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`

  return { uploadUrl, fileUrl }
}

/**
 * 파일 다운로드용 presigned GET URL 발급 (Content-Disposition: attachment 포함)
 * 버킷이 비공개여도 동작
 */
export async function getDownloadPresignedUrl(
  key: string,
  fileName: string,
  expiresIn = 120
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  })

  return getSignedUrl(s3, command, { expiresIn })
}

/**
 * 파일 뷰어용 presigned GET URL 발급 (Content-Disposition 없음 → 브라우저 인라인 열기)
 */
export async function getViewPresignedUrl(
  key: string,
  expiresIn = 300
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(s3, command, { expiresIn })
}

/**
 * S3 file_url에서 key 추출
 * https://bucket.s3.region.amazonaws.com/key → key
 */
export function extractKeyFromUrl(fileUrl: string): string | null {
  const match = fileUrl.match(/\.amazonaws\.com\/(.+)$/)
  return match ? match[1] : null
}
