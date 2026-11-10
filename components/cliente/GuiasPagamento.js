import { nomeCompetencia, nomeParaMostrar } from '@/lib/arquivos-mes'
import { dataBR } from '@/lib/formato'
import { ROTULO_SITUACAO } from '@/lib/guias'

const CLASSE = { paga: 'paga', vencida: 'vencida', a_pagar: 'aberta' }

function Guia({ g }) {
  return (
    <li>
      <div>
        <a href={g.url}>
          <strong>{nomeParaMostrar(g.nome, g.competencia)}</strong>
        </a>
        <div className="info">
          {g.competencia && `${nomeCompetencia(g.competencia)} · `}
          {g.validade ? `vence em ${dataBR(g.validade)}` : 'sem vencimento informado'}
          {g.paga && g.paga_em && ` · paga em ${dataBR(g.paga_em)}`}
        </div>
      </div>
      <div>
        <span className={`etiqueta ${CLASSE[g.situacao]}`}>{ROTULO_SITUACAO[g.situacao]}</span>{' '}
        <a href={g.url} className="botao pequeno">
          Baixar
        </a>
      </div>
    </li>
  )
}

// Guias de impostos separadas dos documentos: em aberto no topo, pagas guardadas abaixo.
export default function GuiasPagamento({ emAberto, pagas }) {
  if (!emAberto.length && !pagas.length) return <p className="vazio">Nenhuma guia enviada ainda. Quando o escritório enviar, ela aparece aqui.</p>
  return (
    <>
      {emAberto.length ? (
        <ul className="lista">
          {emAberto.map((g) => (
            <Guia key={g.caminho} g={g} />
          ))}
        </ul>
      ) : (
        <p className="ok">Nenhuma guia em aberto. Tudo pago!</p>
      )}
      {pagas.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary>Guias pagas ({pagas.length})</summary>
          <ul className="lista">
            {pagas.map((g) => (
              <Guia key={g.caminho} g={g} />
            ))}
          </ul>
        </details>
      )}
    </>
  )
}
