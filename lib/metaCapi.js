// API de Conversões da Meta (CAPI): manda o mesmo evento do Pixel pelo servidor, para a Meta
// contar contatos mesmo quando o navegador bloqueia o Pixel. O Pixel e o servidor usam o mesmo
// event_id, então a Meta junta os dois e não conta em dobro.
//
// Só funciona com a variável de ambiente META_CAPI_TOKEN configurada na Vercel (token gerado em
// Gerenciador de Eventos → Configurações do pixel → API de Conversões → Gerar token de acesso).
// Sem o token, a rota /api/meta-evento não faz nada.

export const EVENTOS_PERMITIDOS = ['Lead', 'Contact']
export const VERSAO_GRAPH = 'v21.0'

function cookie(cabecalho = '', nome) {
  const achado = cabecalho.split(/;\s*/).find((c) => c.startsWith(`${nome}=`))
  return achado ? decodeURIComponent(achado.slice(nome.length + 1)) : undefined
}

// Monta o corpo do evento no formato da API de Conversões. Devolve null se o pedido for inválido.
export function montarEventoCapi({ evento, eventId, url, ip, userAgent, cookies, agora = Date.now() }) {
  if (!EVENTOS_PERMITIDOS.includes(evento)) return null
  if (typeof eventId !== 'string' || !/^[\w-]{8,64}$/.test(eventId)) return null
  if (typeof url !== 'string' || !/^https:\/\/(www\.)?amorinscontabilidade\.com\.br(\/|$)/.test(url)) return null

  const userData = {}
  if (ip) userData.client_ip_address = ip
  if (userAgent) userData.client_user_agent = userAgent
  const fbp = cookie(cookies, '_fbp')
  const fbc = cookie(cookies, '_fbc')
  if (fbp) userData.fbp = fbp
  if (fbc) userData.fbc = fbc

  return {
    data: [
      {
        event_name: evento,
        event_time: Math.floor(agora / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: url,
        user_data: userData,
        custom_data: { metodo: 'whatsapp' },
      },
    ],
  }
}
