import './globals.css'
import { SITE_URL, NOME_SITE } from '@/lib/site'

const TITULO = 'Amorins Contábil · Contabilidade digital e regularização de CNPJ'
const DESCRICAO =
  'Contabilidade digital para todo o Brasil: regularização de CNPJ, MEI, Simples Nacional e Imposto de Renda, com Área do Cliente online.'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: NOME_SITE,
    title: TITULO,
    description: DESCRICAO,
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Logo Amorins Contábil' }],
  },
  // Código de verificação do Google Search Console (variável na Vercel).
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
