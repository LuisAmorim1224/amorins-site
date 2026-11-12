// Escolha do código de serviço da nota pelo histórico do próprio cliente:
// compara a descrição do pedido com as notas que ele já emitiu e repete o código usado.
// Quando não há nota parecida, ou a descrição serve para mais de um serviço, pede ao escritório.

const PALAVRAS_VAZIAS = new Set(
  'a o as os de da do das dos e em no na nos nas para por com sem um uma uns umas ao aos que ref referente mes servico servicos prestado prestados prestacao realizado realizada conforme valor nota fiscal'.split(
    ' ',
  ),
)

// "Bombeamento de concreto - Obra Pituba" -> ['bombe', 'concr', 'obra', 'pitub']
export function palavras(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((p) => p.length >= 3 && !PALAVRAS_VAZIAS.has(p))
    .map((p) => p.slice(0, 5))
}

function semelhanca(a, b) {
  const x = new Set(a)
  const y = new Set(b)
  if (!x.size || !y.size) return 0
  let comuns = 0
  for (const p of x) if (y.has(p)) comuns++
  // Proporção das palavras do pedido que aparecem na nota anterior (pedidos curtos contam).
  return comuns / Math.min(x.size, y.size)
}

// Nota mais recente pela data de emissão; sem data, pelo número da nota.
function maisRecente(notas) {
  const chave = (n) => [String(n.data_emissao || ''), Number(n.numero) || 0]
  return notas.reduce((a, b) => {
    const [da, na] = chave(a)
    const [db, nb] = chave(b)
    return db > da || (db === da && nb > na) ? b : a
  })
}

// Versão enxuta da sugestão para mostrar no formulário enquanto a descrição é digitada.
export function resumoSugestao(r) {
  return {
    codigo: r.servico?.cod_trib_nac || null,
    nome: r.servico?.nome || null,
    motivo: r.motivo || null,
    candidatos: (r.candidatos || []).map((s) => ({ codigo: s.cod_trib_nac, nome: s.nome })),
  }
}

export const MINIMO = 0.5 // pelo menos metade das palavras em comum
export const VANTAGEM = 0.2 // o melhor serviço precisa ganhar do segundo com folga

/**
 * @param descricao texto do pedido
 * @param servicos [{ id, nome, cod_trib_nac, palavras_chave }]
 * @param historico [{ descricao, cod_trib_nac, numero?, data_emissao? }]
 * @returns { servico, motivo } quando dá para escolher; { servico: null, motivo, candidatos } quando precisa perguntar
 */
export function sugerirServico(descricao, servicos, historico = []) {
  if (!servicos?.length) return { servico: null, motivo: 'O cliente ainda não tem serviço cadastrado.', candidatos: [] }
  if (servicos.length === 1) return { servico: servicos[0], motivo: 'Único serviço cadastrado para o cliente.' }

  const pedido = palavras(descricao)
  const pontos = servicos.map((s) => {
    let melhor = { nota: 0, exemplo: null }
    for (const h of historico) {
      if (h.cod_trib_nac !== s.cod_trib_nac) continue
      const nota = semelhanca(pedido, palavras(h.descricao))
      if (nota > melhor.nota) melhor = { nota, exemplo: h }
    }
    const chave = semelhanca(pedido, palavras(s.palavras_chave))
    return chave > melhor.nota ? { servico: s, nota: chave, exemplo: null } : { servico: s, ...melhor }
  })
  pontos.sort((a, b) => b.nota - a.nota)
  const [primeiro, segundo] = pontos

  const explicar = (p) =>
    p.exemplo
      ? `Mesmo código da nota anterior${p.exemplo.numero ? ` nº ${p.exemplo.numero}` : ''}: "${p.exemplo.descricao.slice(0, 80)}".`
      : `Descrição bate com as palavras-chave de "${p.servico.nome}".`

  if (primeiro.nota >= MINIMO && primeiro.nota - (segundo?.nota || 0) >= VANTAGEM) {
    return { servico: primeiro.servico, motivo: explicar(primeiro) }
  }
  if (primeiro.nota >= MINIMO) {
    const empatados = pontos.filter((p) => primeiro.nota - p.nota < VANTAGEM)
    // Serviços repetidos com o mesmo código: tanto faz qual, a nota sai igual.
    if (empatados.every((p) => p.servico.cod_trib_nac === primeiro.servico.cod_trib_nac)) {
      return { servico: primeiro.servico, motivo: explicar(primeiro) }
    }
    // Todos os empatados vêm de notas anteriores: repete o código da nota parecida mais recente.
    if (empatados.every((p) => p.exemplo)) {
      const recente = maisRecente(empatados.map((p) => p.exemplo))
      const escolhido = empatados.find((p) => p.exemplo === recente)
      return { servico: escolhido.servico, motivo: `${explicar(escolhido)} (a nota parecida mais recente)` }
    }
  }
  const motivo =
    primeiro.nota < MINIMO
      ? 'Nenhuma nota anterior parecida com esta descrição.'
      : 'A descrição combina com mais de um serviço.'
  return { servico: null, motivo, candidatos: pontos.filter((p) => p.nota > 0).map((p) => p.servico) }
}
