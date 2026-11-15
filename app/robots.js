import { SITE_URL } from '@/lib/site'

// Diz ao Google o que pode ler: o site público sim, as áreas com login não.
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/cliente', '/api'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
