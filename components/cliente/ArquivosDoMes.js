import { agruparPorCompetencia } from '@/lib/arquivos-mes'
import { TIPOS_DOCUMENTO } from '@/lib/ficha'
import { dataBR, tamanho } from '@/lib/formato'

// Arquivos que o escritório disponibilizou, separados por mês de referência (mais recente aberto).
export default function ArquivosDoMes({ documentos }) {
  const meses = agruparPorCompetencia(documentos)
  if (!meses.length) return <p className="vazio">Nenhum arquivo disponibilizado ainda. Quando o escritório enviar, eles aparecem aqui, mês a mês.</p>
  return (
    <div className="pastas">
      {meses.map((m, i) => (
        <details key={m.competencia} className="pasta" open={i === 0}>
          <summary>
            <span>🗓️ {m.nome}</span>
            <span className="contagem">{m.itens.length}</span>
          </summary>
          <ul className="lista">
            {m.itens.map((d) => (
              <li key={d.caminho}>
                <div>
                  <a href={d.url}>{d.nomeExibido}</a>
                  <div className="info">
                    {d.tipo && d.tipo !== 'outro' ? `${TIPOS_DOCUMENTO[d.tipo] || d.tipo} · ` : ''}
                    enviado em {dataBR(d.data)} {d.tamanho ? `· ${tamanho(d.tamanho)}` : ''}
                    {d.validade && ` · vence em ${dataBR(d.validade)}`}
                  </div>
                </div>
                <a href={d.url} className="botao pequeno">Baixar</a>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}
