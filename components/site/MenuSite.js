'use client'

import { useState } from 'react'

// Menu do topo do site. No celular os links ficam num menu que abre pelo botão "Menu".
export default function MenuSite({ links }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button
        type="button"
        className="botao-menu"
        aria-expanded={aberto}
        aria-controls="menu-site"
        onClick={() => setAberto((a) => !a)}
      >
        {aberto ? '✕ Fechar' : '☰ Menu'}
      </button>
      <nav id="menu-site" className={aberto ? 'aberto' : ''} onClick={(e) => e.target.closest('a') && setAberto(false)}>
        {links.map((l) => (
          <a key={l.href} href={l.href}>{l.texto}</a>
        ))}
        <a href="/login" className="btn-area">Área do Cliente</a>
      </nav>
    </>
  )
}
