// Resumo automático do Relatório de Situação Fiscal (SITFIS) da Receita/PGFN e orçamento.
// O relatório chega em PDF; aqui só tratamos o texto extraído dele. É uma prévia: o contador
// confere o PDF antes de fechar o serviço.

export const TIPOS_PENDENCIA = {
  omissao: {
    titulo: 'Declarações em atraso',
    acao: 'Entregar as declarações que a Receita aponta como não entregues.',
  },
  debito: {
    titulo: 'Débitos na Receita Federal',
    acao: 'Calcular os débitos em aberto e pagar ou parcelar nas melhores condições.',
  },
  divida_ativa: {
    titulo: 'Dívida ativa na PGFN',
    acao: 'Negociar a dívida ativa na Procuradoria (Regularize), avaliando transação com desconto.',
  },
  parcelamento: {
    titulo: 'Parcelamento com pendência',
    acao: 'Colocar em dia ou refazer o parcelamento que está com parcelas em atraso.',
  },
  processo: {
    titulo: 'Processo fiscal',
    acao: 'Analisar o processo e apresentar a resposta ou o pagamento cabível.',
  },
  outra: {
    titulo: 'Outras pendências',
    acao: 'Analisar a pendência apontada no relatório.',
  },
}

const DECLARACOES = [
  'DASN-SIMEI', 'DASN', 'PGDAS-D', 'PGDAS', 'DEFIS', 'DCTFWeb', 'DCTF', 'GFIP', 'ECF', 'ECD',
  'EFD-Contribuições', 'EFD-Reinf', 'EFD-ICMS', 'DIRF', 'DIPJ', 'DSPJ', 'eSocial', 'DIMOB', 'DMED',
]

const normalizar = (t) =>
  String(t || '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')

// "Pendência - Omissão de Declaração", "Pendência – Inscrição (SIDA)", etc.
const CABECALHO = /^\s*Pend[êe]ncias?\s*[-–—:]\s*(.+)$/i
const FIM_DE_SECAO = /^\s*(Pend[êe]ncias?\s*[-–—:]|Diagn[óo]stico Fiscal|Final do Relat[óo]rio|D[ée]bito com Exigibilidade Suspensa|Parcelamento com Exigibilidade Suspensa)/i

function tipoDoCabecalho(nome) {
  if (/omiss|aus[êe]ncia de declara|declara[çc][ãa]o.*n[ãa]o entregue/i.test(nome)) return 'omissao'
  if (/inscri[çc][ãa]o|sida|d[íi]vida ativa|pgfn/i.test(nome)) return 'divida_ativa'
  if (/parcelamento|parc/i.test(nome)) return 'parcelamento'
  if (/processo/i.test(nome)) return 'processo'
  if (/d[ée]bito|devedor|cobran[çc]a/i.test(nome)) return 'debito'
  return 'outra'
}

/**
 * @param textoPdf texto extraído do PDF do relatório
 * @returns { semPendencias, pendencias: [{ tipo, titulo, acao, secoes, declaracoes, anos }] }
 */
export function resumirRelatorio(textoPdf) {
  const linhas = normalizar(textoPdf).split(/\r?\n/)
  const porTipo = {}
  let atual = null
  for (const linha of linhas) {
    const cab = linha.match(CABECALHO)
    if (cab) {
      const tipo = tipoDoCabecalho(cab[1])
      atual = porTipo[tipo] ||= { tipo, ...TIPOS_PENDENCIA[tipo], secoes: [], declaracoes: new Set(), anos: new Set(), linhas: 0 }
      atual.secoes.push(cab[1].trim())
      continue
    }
    if (FIM_DE_SECAO.test(linha)) {
      atual = null
      continue
    }
    if (!atual || !linha.trim()) continue
    atual.linhas++
    if (atual.tipo === 'omissao') {
      for (const d of DECLARACOES) {
        const re = new RegExp(`(^|[^A-Za-z-])${d.replace('-', '[- ]?')}([^A-Za-z-]|$)`, 'i')
        if (re.test(linha)) atual.declaracoes.add(d)
      }
      for (const ano of linha.match(/\b(19|20)\d{2}\b/g) || []) atual.anos.add(ano)
    }
  }

  const pendencias = Object.values(porTipo).map((p) => {
    const decl = [...p.declaracoes]
    const declaracoes = decl.filter(
      (d) => !(d === 'DASN' && decl.includes('DASN-SIMEI')) && !(d === 'PGDAS' && decl.includes('PGDAS-D')) && !(d === 'DCTF' && decl.includes('DCTFWeb'))
    )
    return {
      tipo: p.tipo,
      titulo: p.titulo,
      acao: p.acao,
      secoes: p.secoes,
      declaracoes,
      anos: [...p.anos].sort(),
      quantidade: p.tipo === 'omissao' ? Math.max(1, declaracoes.length) : p.secoes.length,
    }
  })
  const ordem = Object.keys(TIPOS_PENDENCIA)
  pendencias.sort((a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo))

  const textoLimpo = normalizar(textoPdf)
  const semPendencias =
    pendencias.length === 0 && /n[ãa]o foram detectadas pend[êe]ncias/i.test(textoLimpo)
  return { semPendencias, pendencias, lido: pendencias.length > 0 || semPendencias }
}

/**
 * Orçamento a partir da tabela de preços que o escritório preenche no /admin.
 * Só fecha valor quando TODO tipo encontrado tem preço; senão o orçamento é manual.
 * @param pendencias saída de resumirRelatorio().pendencias
 * @param precos [{ tipo, valor, por_item }]
 * @returns { total, itens: [{ tipo, titulo, valor }], faltaPreco: [tipos] }
 */
export function orcar(pendencias, precos) {
  const tabela = Object.fromEntries((precos || []).map((p) => [p.tipo, p]))
  const itens = []
  const faltaPreco = []
  for (const p of pendencias) {
    const preco = tabela[p.tipo]
    const valor = Number(preco?.valor)
    if (!preco || preco.valor === null || preco.valor === '' || !Number.isFinite(valor) || valor < 0) {
      faltaPreco.push(p.tipo)
      continue
    }
    const vezes = preco.por_item ? p.quantidade : 1
    itens.push({ tipo: p.tipo, titulo: p.titulo, quantidade: vezes, valor: Math.round(valor * vezes * 100) / 100 })
  }
  const total = faltaPreco.length || !pendencias.length ? null : itens.reduce((t, i) => t + i.valor, 0)
  return { total, itens, faltaPreco }
}
