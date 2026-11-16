import { artigosPublicados } from '@/lib/artigos'
import { SITE_URL } from '@/lib/site'

// Lista das páginas públicas que o Google deve ler (enviada no Google Search Console).
// Refeito a cada hora, para incluir o artigo do dia.
export const revalidate = 3600

export default function sitemap() {
  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/artigos`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: 'yearly', priority: 0.2 },
    ...artigosPublicados().map((a) => ({
      url: `${SITE_URL}/artigos/${a.slug}`,
      lastModified: a.atualizado || a.data,
      changeFrequency: 'monthly',
      priority: 0.7,
    })),
  ]
}
