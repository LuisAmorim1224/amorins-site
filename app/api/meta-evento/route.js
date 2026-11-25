import { RASTREIO } from '@/lib/rastreamento'
import { montarEventoCapi, VERSAO_GRAPH } from '@/lib/metaCapi'

// Recebe do navegador o aviso de que alguém clicou no WhatsApp e repassa para a API de Conversões
// da Meta. O navegador só chama esta rota depois que o visitante aceitou os cookies.
export async function POST(request) {
  const token = process.env.META_CAPI_TOKEN
  if (!token || !RASTREIO.metaPixel) return new Response(null, { status: 204 })

  let pedido
  try {
    pedido = await request.json()
  } catch {
    return new Response(null, { status: 400 })
  }

  const corpo = montarEventoCapi({
    evento: pedido?.evento,
    eventId: pedido?.eventId,
    url: pedido?.url,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: request.headers.get('user-agent') || undefined,
    cookies: request.headers.get('cookie') || '',
  })
  if (!corpo) return new Response(null, { status: 400 })

  try {
    const resposta = await fetch(
      `https://graph.facebook.com/${VERSAO_GRAPH}/${RASTREIO.metaPixel}/events?access_token=${encodeURIComponent(token)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) },
    )
    if (!resposta.ok) console.error('Meta CAPI recusou o evento:', resposta.status, await resposta.text())
  } catch (erro) {
    console.error('Meta CAPI indisponível:', erro?.message || erro)
  }
  return new Response(null, { status: 204 })
}
