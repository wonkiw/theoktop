/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone 번들: Node.js 서버 포함 → Amplify SSR에서 동적 라우트 정상 작동
  output: 'standalone',

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.theoktop.com' }],
        destination: 'https://theoktop.com/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
