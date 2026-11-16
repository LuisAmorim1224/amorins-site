import './globals.css'
import Rastreamento from '@/components/site/Rastreamento'
import { SITE_URL, NOME_SITE } from '@/lib/site'

const TITULO = 'Amorins Contábil · Contador online e regularização de CNPJ em todo o Brasil'
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
  },
  // Código de verificação do Google Search Console (conta amorinscontabil). Não remover.
  verification: { google: 'AjPL5QaMtwNFIx-BgpSXAXx1Q_ECWdmSsGuSjrV5JK8' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Rastreamento />
      </body>
    </html>
  )
}
