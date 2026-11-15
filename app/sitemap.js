import { ARTIGOS } from '@/lib/artigos'
import { SITE_URL } from '@/lib/site'

// Lista das páginas públicas que o Google deve ler (enviada no Google Search Console).
export default function sitemap() {
  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/artigos`, changeFrequency: 'weekly', priority: 0.8 },
    ...ARTIGOS.map((a) => ({
      url: `${SITE_URL}/artigos/${a.slug}`,
      lastModified: a.atualizado || a.data,
      changeFrequency: 'monthly',
      priority: 0.7,
    })),
  ]
}
