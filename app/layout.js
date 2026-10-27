import './globals.css'

export const metadata = {
  title: 'Amorins Contábil',
  description:
    'Serviços contábeis para MEI, empresas e pessoas físicas, com atendimento personalizado.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
