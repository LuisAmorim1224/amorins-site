import { cobrancaEmAberto, situacaoCobranca } from '@/lib/asaas'
import { linkCobrancaWhatsapp } from '@/lib/cobranca-whatsapp'
import { dataBR, reais } from '@/lib/formato'

function classe(status) {
  if (status === 'OVERDUE') return 'vencida'
  if (cobrancaEmAberto(status)) return 'aberta'
  if (situacaoCobranca(status) === 'Paga') return 'paga'
  return ''
}

// `whatsapp` (só no admin): { nome, telefone } do cliente, para enviar a cobrança pelo WhatsApp.
export default function Cobrancas({ cobrancas, erro, whatsapp }) {
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
            {whatsapp && cobrancaEmAberto(c.status) && c.invoiceUrl && (
              <>
                {' '}
                <a
                  href={linkCobrancaWhatsapp({ ...whatsapp, valor: c.value, vencimento: c.dueDate, link: c.invoiceUrl })}
                  target="_blank"
                  rel="noreferrer"
                  className="botao botao-whatsapp"
                  title={whatsapp.telefone ? `Enviar para ${whatsapp.telefone}` : 'Sem telefone cadastrado: escolha o contato no WhatsApp'}
                >
                  Enviar pelo WhatsApp
                </a>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
