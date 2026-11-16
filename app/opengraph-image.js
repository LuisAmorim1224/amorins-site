import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Imagem que aparece quando alguém compartilha o site (WhatsApp, Instagram, Facebook, LinkedIn).
// Vale também para as páginas de artigos e de privacidade.
export const alt = 'Amorins Contábil · Contador online e regularização de CNPJ em todo o Brasil'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Imagem() {
  const logo = await readFile(join(process.cwd(), 'public/logo.png'))
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '0 80px', gap: 60,
          background: 'linear-gradient(135deg, #071a3d 0%, #0b2a6b 60%, #123d99 100%)', color: '#fff',
        }}
      >
        <img src={logoSrc} width={280} height={280} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: 700 }}>
          <div style={{ fontSize: 30, color: '#9fc0ff', letterSpacing: 2, textTransform: 'uppercase' }}>Amorins Contábil</div>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>Contador online em todo o Brasil</div>
          <div style={{ fontSize: 34, color: '#2fd3b0' }}>Especialista em regularização de CNPJ</div>
          <div style={{ fontSize: 26, color: '#c9d8f5' }}>Luis Amorim · CRC-BA 039792/O-0</div>
        </div>
      </div>
    ),
    size
  )
}
