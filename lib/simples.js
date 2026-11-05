// Prévia de impostos a partir das notas emitidas: DAS do Simples Nacional e limite do MEI.
// É uma estimativa para o cliente se planejar; a apuração oficial é feita pelo escritório no PGDAS-D.

// Anexos da LC 123/2006 (redação da LC 155/2016): [limite da faixa, alíquota nominal, parcela a deduzir]
export const ANEXOS = {
  I: { nome: 'Anexo I – Comércio', faixas: [[180000, 0.04, 0], [360000, 0.073, 5940], [720000, 0.095, 13860], [1800000, 0.107, 22500], [3600000, 0.143, 87300], [4800000, 0.19, 378000]] },
  II: { nome: 'Anexo II – Indústria', faixas: [[180000, 0.045, 0], [360000, 0.078, 5940], [720000, 0.1, 13860], [1800000, 0.112, 22500], [3600000, 0.147, 85500], [4800000, 0.3, 720000]] },
  III: { nome: 'Anexo III – Serviços', faixas: [[180000, 0.06, 0], [360000, 0.112, 9360], [720000, 0.135, 17640], [1800000, 0.16, 35640], [3600000, 0.21, 125640], [4800000, 0.33, 648000]] },
  IV: { nome: 'Anexo IV – Serviços', faixas: [[180000, 0.045, 0], [360000, 0.09, 8100], [720000, 0.102, 12420], [1800000, 0.14, 39780], [3600000, 0.22, 183780], [4800000, 0.33, 828000]] },
  V: { nome: 'Anexo V – Serviços', faixas: [[180000, 0.155, 0], [360000, 0.18, 4500], [720000, 0.195, 9900], [1800000, 0.205, 17100], [3600000, 0.23, 62100], [4800000, 0.305, 540000]] },
}

export const LIMITE_SIMPLES = 4800000
export const LIMITE_MEI_ANUAL = 81000

const centavos = (v) => Math.round(v * 100) / 100

// "2026-11-05" -> "2026-11"
export const mesDe = (data) => String(data).slice(0, 7)

export function somarPorMes(notas) {
  const porMes = {}
  for (const n of notas) {
    const mes = mesDe(n.data_emissao)
    porMes[mes] = centavos((porMes[mes] || 0) + Number(n.valor))
  }
  return porMes
}

// Soma `n` meses a "AAAA-MM" (n pode ser negativo).
export function somarMeses(mes, n) {
  const [a, m] = mes.split('-').map(Number)
  const total = a * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

function mesesEntre(inicio, fim) {
  const [a1, m1] = inicio.split('-').map(Number)
  const [a2, m2] = fim.split('-').map(Number)
  return (a2 - a1) * 12 + (m2 - m1)
}

// Prévia do DAS do mês (competência "AAAA-MM").
export function previaSimples({ notas, anexo, competencia, dataAbertura }) {
  const tabela = ANEXOS[anexo]
  if (!tabela) return { erro: 'Anexo do Simples não definido. O escritório precisa informar o anexo da sua atividade.' }

  const porMes = somarPorMes(notas)
  const receitaMes = porMes[competencia] || 0

  // Meses de atividade antes da competência (no máximo 12).
  let mesesAtivos = 12
  if (dataAbertura) mesesAtivos = Math.max(0, Math.min(12, mesesEntre(mesDe(dataAbertura), competencia)))

  let somaAnteriores = 0
  for (let i = 1; i <= mesesAtivos; i++) somaAnteriores += porMes[somarMeses(competencia, -i)] || 0

  // Início de atividade: média dos meses anteriores × 12; no primeiro mês, a própria receita × 12.
  let rbt12
  if (mesesAtivos >= 12) rbt12 = somaAnteriores
  else if (mesesAtivos === 0) rbt12 = receitaMes * 12
  else rbt12 = (somaAnteriores / mesesAtivos) * 12
  rbt12 = centavos(rbt12)

  if (rbt12 > LIMITE_SIMPLES) {
    return { receitaMes, rbt12, foraDoLimite: true, aviso: 'O faturamento dos últimos 12 meses passou de R$ 4,8 milhões, o limite do Simples Nacional.' }
  }

  const indice = tabela.faixas.findIndex(([limite]) => rbt12 <= limite)
  const [, nominal, deduzir] = tabela.faixas[indice]
  const efetiva = rbt12 > 0 ? (rbt12 * nominal - deduzir) / rbt12 : nominal
  return {
    anexo,
    nomeAnexo: tabela.nome,
    receitaMes,
    rbt12,
    faixa: indice + 1,
    aliquotaNominal: nominal,
    aliquotaEfetiva: Math.round(efetiva * 10000) / 10000,
    das: centavos(receitaMes * efetiva),
    inicioAtividade: mesesAtivos < 12,
  }
}

// Situação do MEI no ano: limite proporcional aos meses de atividade e regras de desenquadramento.
export function previaMei({ notas, ano, dataAbertura, limiteAnual = LIMITE_MEI_ANUAL }) {
  const receita = centavos(
    notas.filter((n) => String(n.data_emissao).startsWith(`${ano}-`)).reduce((t, n) => t + Number(n.valor), 0)
  )
  let mesInicio = 1
  if (dataAbertura && String(dataAbertura).startsWith(`${ano}-`)) mesInicio = Number(String(dataAbertura).slice(5, 7))
  const meses = 12 - mesInicio + 1
  const limite = centavos((limiteAnual / 12) * meses)
  const percentual = limite > 0 ? receita / limite : 0
  const excesso = centavos(Math.max(0, receita - limite))
  const desdeQuando = mesInicio === 1 ? `1º de janeiro de ${ano}` : `a data de abertura (${String(mesInicio).padStart(2, '0')}/${ano})`

  let situacao, mensagem
  if (receita <= limite * 0.8) {
    situacao = 'dentro'
    mensagem = 'Faturamento dentro do limite do MEI.'
  } else if (receita <= limite) {
    situacao = 'atencao'
    mensagem = `Atenção: você já usou ${Math.round(percentual * 100)}% do limite do MEI neste ano. Fale com o escritório antes de emitir notas maiores.`
  } else if (receita <= limite * 1.2) {
    situacao = 'excesso_ate_20'
    mensagem = `Limite ultrapassado em até 20%: o MEI será desenquadrado a partir de 1º de janeiro de ${ano + 1} e haverá DAS complementar sobre o excesso. Fale com o escritório.`
  } else {
    situacao = 'excesso_acima_20'
    mensagem = `Limite ultrapassado em mais de 20%: o desenquadramento é retroativo a ${desdeQuando}, com impostos do Simples sobre todo o faturamento do período. Fale com o escritório o quanto antes.`
  }
  return { ano, receita, limite, meses, percentual: Math.round(percentual * 1000) / 1000, excesso, situacao, mensagem }
}
