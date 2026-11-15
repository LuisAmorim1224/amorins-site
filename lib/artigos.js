// Artigos do site. Cada um responde a uma dúvida que as pessoas pesquisam no Google.
//
// Os textos ficam em lib/artigos/lote-*.js (um arquivo por semana). Cada artigo tem uma data:
// ele só aparece no site (e no sitemap) a partir desse dia, no horário de Brasília. Assim dá
// para deixar vários artigos prontos e o site publica um por dia sozinho.
// Para um lote novo: crie o arquivo e acrescente o import e o nome na lista LOTES abaixo.

import lote20261115 from './artigos/lote-2026-11-15'
import lote20261116 from './artigos/lote-2026-11-16'

const LOTES = [lote20261115, lote20261116]

// Todos os artigos, inclusive os agendados para depois.
export const TODOS_ARTIGOS = LOTES.flat().sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))

export function hojeEmBrasilia() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

// Só os artigos cuja data já chegou, do mais novo para o mais antigo.
export function artigosPublicados() {
  const hoje = hojeEmBrasilia()
  return TODOS_ARTIGOS.filter((a) => a.data <= hoje)
}

export function buscarArtigo(slug) {
  return artigosPublicados().find((a) => a.slug === slug)
}
