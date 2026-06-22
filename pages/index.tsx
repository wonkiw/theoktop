import type { GetServerSideProps } from 'next'
import fs from 'fs'
import path from 'path'

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const html = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf-8')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.write(html)
  res.end()
  return { props: {} }
}

export default function Home() {
  return null
}
