// Guias de impostos (documentos do tipo "guia"): a pagar, vencidas e pagas.
// O vencimento da guia fica no campo "validade" do documento.

export const ehGuia = (d) => d?.tipo === 'guia'

export function situacaoGuia(guia, hoje) {
  if (guia.paga) return 'paga'
  if (guia.validade && guia.validade < hoje) return 'vencida'
  return 'a_pagar'
}

export const ROTULO_SITUACAO = { paga: 'Paga', vencida: 'Vencida', a_pagar: 'A pagar' }

// Em aberto primeiro (vencimento mais próximo; sem vencimento por último), depois as pagas (mais recentes).
export function separarGuias(documentos, hoje) {
  const guias = (documentos || []).filter(ehGuia).map((g) => ({ ...g, situacao: situacaoGuia(g, hoje) }))
  const emAberto = guias
    .filter((g) => g.situacao !== 'paga')
    .sort((a, b) => String(a.validade || '9999').localeCompare(String(b.validade || '9999')) || String(b.data).localeCompare(String(a.data)))
  const pagas = guias
    .filter((g) => g.situacao === 'paga')
    .sort((a, b) => String(b.paga_em || b.data).localeCompare(String(a.paga_em || a.data)))
  return { emAberto, pagas }
}

// Guia enviada nos últimos `dias` dias e ainda não paga: o cliente recebe o aviso "Nova guia".
export function guiasNovas(emAberto, agora = new Date(), dias = 7) {
  const limite = agora.getTime() - dias * 24 * 60 * 60 * 1000
  return emAberto.filter((g) => g.data && new Date(g.data).getTime() >= limite)
}
