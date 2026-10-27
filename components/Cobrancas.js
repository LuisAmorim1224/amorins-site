import { cobrancaEmAberto, situacaoCobranca } from '@/lib/asaas'
import { dataBR, reais } from '@/lib/formato'

function classe(status) {
  if (status === 'OVERDUE') return 'vencida'
  if (cobrancaEmAberto(status)) return 'aberta'
  if (situacaoCobranca(status) === 'Paga') return 'paga'
  return ''
}

export default function Cobrancas({ cobrancas, erro }) {
  if (erro) return <p className="erro">Não foi possível carregar as cobranças agora.</p>
  if (!cobrancas.length) return <p className="vazio">Nenhuma cobrança por enquanto.</p>
  return (
    <ul className="lista">
      {cobrancas.map((c) => (
        <li key={c.id}>
          <div>
            <strong>{reais(c.value)}</strong> · vence em {dataBR(c.dueDate)}
            <div className="info">{c.description}</div>
          </div>
          <div>
            <span className={`etiqueta ${classe(c.status)}`}>{situacaoCobranca(c.status)}</span>{' '}
            {cobrancaEmAberto(c.status) && c.invoiceUrl && (
              <a href={c.invoiceUrl} target="_blank" rel="noreferrer" className="botao">
                Pagar (boleto ou PIX)
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
