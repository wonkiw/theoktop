/** @type {import('next').NextConfig} */
const nextConfig = {
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
