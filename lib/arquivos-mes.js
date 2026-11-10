// Arquivos que o escritório disponibiliza ao cliente por mês de referência (competência "AAAA-MM").

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export const competenciaValida = (v) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(String(v || '')) ? String(v) : null)

// "2026-10" -> "Outubro de 2026"
export function nomeCompetencia(competencia) {
  const [ano, mes] = String(competencia).split('-').map(Number)
  const nome = MESES[mes - 1] || ''
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`
}

// O arquivo é salvo como "2026-10 DAS.pdf" (evita sobrescrever o do mês anterior com o mesmo nome);
// para o cliente, mostra só "DAS.pdf".
export const nomeNoArmazenamento = (nome, competencia) =>
  competencia && !String(nome).startsWith(`${competencia} `) ? `${competencia} ${nome}` : nome

export const nomeParaMostrar = (nome, competencia) =>
  competencia && String(nome).startsWith(`${competencia} `) ? String(nome).slice(competencia.length + 1) : nome

// Meses do mais recente para o mais antigo; dentro do mês, por nome.
export function agruparPorCompetencia(documentos) {
  const grupos = new Map()
  for (const d of documentos || []) {
    if (!competenciaValida(d.competencia)) continue
    if (!grupos.has(d.competencia)) grupos.set(d.competencia, [])
    grupos.get(d.competencia).push(d)
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([competencia, itens]) => ({
      competencia,
      nome: nomeCompetencia(competencia),
      itens: itens
        .map((d) => ({ ...d, nomeExibido: nomeParaMostrar(d.nome, competencia) }))
        .sort((a, b) => a.nomeExibido.localeCompare(b.nomeExibido, 'pt-BR')),
    }))
}
