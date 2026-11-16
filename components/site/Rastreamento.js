'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { RASTREIO, CHAVE_CONSENTIMENTO, paginaPublica, temRastreio, linkDeWhatsapp, idsGoogle } from '@/lib/rastreamento'

function lerEscolha() {
  try { return localStorage.getItem(CHAVE_CONSENTIMENTO) } catch { return null }
}
function gravarEscolha(valor) {
  try { localStorage.setItem(CHAVE_CONSENTIMENTO, valor) } catch {}
}

function carregarScript(src) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.appendChild(s)
}

// Carrega o Pixel da Meta e a tag do Google só depois que o visitante aceita os cookies.
function iniciarMedicao() {
  if (window.__amorinsMedicao) return
  window.__amorinsMedicao = true

  if (RASTREIO.metaPixel) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}(window,document)
    /* eslint-enable */
    carregarScript('https://connect.facebook.net/en_US/fbevents.js')
    window.fbq('init', RASTREIO.metaPixel)
    window.fbq('track', 'PageView')
  }

  const google = idsGoogle()
  if (google.length) {
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() { window.dataLayer.push(arguments) }
    window.gtag('js', new Date())
    google.forEach((id) => window.gtag('config', id))
    carregarScript(`https://www.googletagmanager.com/gtag/js?id=${google[0]}`)
  }

  // Cada clique em um botão de WhatsApp vira um "contato" no Pixel e uma conversão no Google.
  document.addEventListener('click', (e) => {
    const link = e.target.closest?.('a')
    if (!link || !linkDeWhatsapp(link.href)) return
    window.fbq?.('track', 'Contact')
    window.gtag?.('event', 'generate_lead', { metodo: 'whatsapp', pagina: location.pathname })
    if (RASTREIO.googleAdsConversaoWhatsapp) {
      window.gtag?.('event', 'conversion', { send_to: RASTREIO.googleAdsConversaoWhatsapp })
    }
  })
}

export default function Rastreamento() {
  const caminho = usePathname() || '/'
  const [escolha, setEscolha] = useState('carregando')
  const ativo = temRastreio() && paginaPublica(caminho)
  const ultimaPagina = useRef(caminho)

  useEffect(() => {
    if (!ativo) return
    const salva = lerEscolha()
    setEscolha(salva)
    if (salva === 'aceito') iniciarMedicao()
  }, [ativo])

  // Visita a outra página do site sem recarregar: avisa o Pixel e o Google.
  useEffect(() => {
    if (ultimaPagina.current === caminho) return
    ultimaPagina.current = caminho
    if (!window.__amorinsMedicao) return
    window.fbq?.('track', 'PageView')
    idsGoogle().forEach((id) => window.gtag?.('config', id, { page_path: caminho }))
  }, [caminho])

  if (!ativo || escolha !== null) return null

  return (
    <div className="aviso-cookies" role="dialog" aria-label="Aviso de cookies">
      <p>
        Usamos cookies para medir as visitas e mostrar nossos anúncios a quem já conhece o site. Veja a{' '}
        <a href="/privacidade">política de privacidade</a>.
      </p>
      <div>
        <button type="button" className="recusar" onClick={() => { gravarEscolha('recusado'); setEscolha('recusado') }}>
          Recusar
        </button>
        <button type="button" onClick={() => { gravarEscolha('aceito'); setEscolha('aceito'); iniciarMedicao() }}>
          Aceitar
        </button>
      </div>
    </div>
  )
}
