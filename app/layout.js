import './globals.css'

export const metadata = {
  title: 'Amorins Contábil · Contabilidade digital e regularização de CNPJ',
  description:
    'Contabilidade digital para todo o Brasil: regularização de CNPJ, MEI, Simples Nacional e Imposto de Renda, com Área do Cliente online.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
