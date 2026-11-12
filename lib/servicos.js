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

function comparar(a, b) {
  const x = new Set(a)
  const y = new Set(b)
  if (!x.size || !y.size) return { comuns: 0, menor: 0 }
  let comuns = 0
  for (const p of x) if (y.has(p)) comuns++
  return { comuns, menor: Math.min(x.size, y.size) }
}

function semelhanca(a, b) {
  const { comuns, menor } = comparar(a, b)
  // Proporção das palavras do pedido que aparecem na nota anterior (pedidos curtos contam).
  return menor ? comuns / menor : 0
}

export const PARECIDA = 0.4

// Nota anterior do mesmo serviço: as palavras principais batem ("bombeamento" + "concreto"),
// mesmo que uma das descrições tenha detalhes a mais (metragem, Fck, tubulação...).
function mesmaDescricao(pedido, nota) {
  const { comuns, menor } = comparar(pedido, nota)
  return menor > 0 && comuns >= Math.min(2, menor) && comuns / menor >= PARECIDA
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
    codigoMunicipal: r.servico?.cod_trib_mun || null,
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
  const explicar = (p) =>
    p.exemplo
      ? `Mesmo código da nota anterior${p.exemplo.numero ? ` nº ${p.exemplo.numero}` : ''}: "${p.exemplo.descricao.slice(0, 80)}".`
      : `Descrição bate com as palavras-chave de "${p.servico.nome}".`

  // Regra principal: espelha a nota anterior com a mesma descrição MAIS RECENTE.
  // Só notas de serviços cadastrados contam.
  const porCodigo = new Map(servicos.map((s) => [s.cod_trib_nac, s]))
  const parecidas = historico.filter((h) => porCodigo.has(h.cod_trib_nac) && mesmaDescricao(pedido, palavras(h.descricao)))
  if (parecidas.length) {
    const recente = maisRecente(parecidas)
    return { servico: porCodigo.get(recente.cod_trib_nac), motivo: explicar({ exemplo: recente }) }
  }

  const pontos = servicos.map((s) => ({ servico: s, nota: semelhanca(pedido, palavras(s.palavras_chave)), exemplo: null }))
  pontos.sort((a, b) => b.nota - a.nota)
  const [primeiro, segundo] = pontos

  // Sem nota parecida: usa as palavras-chave dos serviços.
  if (primeiro.nota >= MINIMO && primeiro.nota - (segundo?.nota || 0) >= VANTAGEM) {
    return { servico: primeiro.servico, motivo: explicar(primeiro) }
  }
  const motivo =
    primeiro.nota < MINIMO
      ? 'Nenhuma nota anterior parecida com esta descrição.'
      : 'A descrição combina com mais de um serviço.'
  return { servico: null, motivo, candidatos: pontos.filter((p) => p.nota > 0).map((p) => p.servico) }
}
