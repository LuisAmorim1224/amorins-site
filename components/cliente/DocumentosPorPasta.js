import { TIPOS_DOCUMENTO } from '@/lib/ficha'
import { dataBR, tamanho } from '@/lib/formato'

const ORDEM = ['guia', 'nota_fiscal', 'cartao_cnpj', 'contrato_social', 'certificado_digital', 'registro_profissional', 'documento_pessoal', 'comprovante_residencia', 'outro']
const NOME_PASTA = { ...TIPOS_DOCUMENTO, guia: 'Guias de impostos', nota_fiscal: 'Notas fiscais', outro: 'Outros documentos' }
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function nomeDoMes(data) {
  const d = new Date(data)
  return `${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

// Documentos agrupados por tipo (pasta) e, dentro de cada pasta, por mês de envio.
export default function DocumentosPorPasta({ documentos }) {
  if (!documentos.length) return <p className="vazio">Nenhum documento disponível ainda.</p>
  const pastas = ORDEM.map((tipo) => ({ tipo, itens: documentos.filter((d) => (d.tipo || 'outro') === tipo) })).filter((p) => p.itens.length)

  return (
    <div className="pastas">
      {pastas.map(({ tipo, itens }, i) => {
        const porMes = []
        for (const d of [...itens].sort((a, b) => String(b.data).localeCompare(String(a.data)))) {
          const mes = nomeDoMes(d.data)
          const grupo = porMes.find((g) => g.mes === mes)
          grupo ? grupo.itens.push(d) : porMes.push({ mes, itens: [d] })
        }
        return (
          <details key={tipo} className="pasta" open={i === 0}>
            <summary>
              <span>📁 {NOME_PASTA[tipo] || tipo}</span>
              <span className="contagem">{itens.length}</span>
            </summary>
            {porMes.map((g) => (
              <div key={g.mes} className="mes">
                <p className="mes-titulo">{g.mes}</p>
                <ul className="lista">
                  {g.itens.map((d) => (
                    <li key={d.caminho}>
                      <div>
                        <a href={d.url}>{d.nome}</a>
                        <div className="info">
                          {dataBR(d.data)} {d.tamanho ? `· ${tamanho(d.tamanho)}` : ''}
                          {d.origem === 'cliente' && ' · enviado por você'}
                          {d.validade && ` · válido até ${dataBR(d.validade)}`}
                        </div>
                      </div>
                      <a href={d.url} className="botao pequeno">Baixar</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        )
      })}
    </div>
  )
}
