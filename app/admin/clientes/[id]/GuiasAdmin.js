import { nomeCompetencia, nomeParaMostrar } from '@/lib/arquivos-mes'
import { linkWhatsappPara, mensagemGuia } from '@/lib/cobranca-whatsapp'
import { dataBR } from '@/lib/formato'
import { ROTULO_SITUACAO } from '@/lib/guias'
import { excluirDocumento, marcarGuiaPaga } from '../../acoes'

const CLASSE = { paga: 'paga', vencida: 'vencida', a_pagar: 'aberta' }

function Guia({ g, contato }) {
  const nome = nomeParaMostrar(g.nome, g.competencia)
  const aviso = linkWhatsappPara(
    contato.telefone,
    mensagemGuia({ nome: contato.nome, guia: nome, competencia: g.competencia && nomeCompetencia(g.competencia), vencimento: g.validade }),
  )
  return (
    <li>
      <div>
        <a href={g.url}>{nome}</a>
        <div className="info">
          {g.competencia && `${nomeCompetencia(g.competencia)} · `}
          {g.validade ? `vence em ${dataBR(g.validade)}` : 'sem vencimento'} · enviada em {dataBR(g.data)}
          {g.paga && g.paga_em && ` · paga em ${dataBR(g.paga_em)}`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className={`etiqueta ${CLASSE[g.situacao]}`}>{ROTULO_SITUACAO[g.situacao]}</span>
        {!g.paga && (
          <a href={aviso} target="_blank" rel="noreferrer" className="botao pequeno botao-whatsapp">
            Avisar pelo WhatsApp
          </a>
        )}
        <form action={marcarGuiaPaga}>
          <input type="hidden" name="caminho" value={g.caminho} />
          <input type="hidden" name="paga" value={g.paga ? 'nao' : 'sim'} />
          <button className={g.paga ? 'link' : 'botao pequeno'}>{g.paga ? 'Desfazer pagamento' : 'Marcar como paga'}</button>
        </form>
        <form action={excluirDocumento}>
          <input type="hidden" name="caminho" value={g.caminho} />
          <button className="link">Excluir</button>
        </form>
      </div>
    </li>
  )
}

// Guias do cliente no admin: situação, marcar como paga e aviso pelo WhatsApp.
export default function GuiasAdmin({ emAberto, pagas, contato }) {
  if (!emAberto.length && !pagas.length)
    return <p className="vazio">Nenhuma guia enviada. Envie em &quot;Enviar documentos&quot; com o tipo &quot;Guia de imposto&quot; e o vencimento.</p>
  return (
    <>
      <ul className="lista">
        {emAberto.map((g) => (
          <Guia key={g.caminho} g={g} contato={contato} />
        ))}
      </ul>
      {!emAberto.length && <p className="ok">Nenhuma guia em aberto.</p>}
      {pagas.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary>Guias pagas ({pagas.length})</summary>
          <ul className="lista">
            {pagas.map((g) => (
              <Guia key={g.caminho} g={g} contato={contato} />
            ))}
          </ul>
        </details>
      )}
    </>
  )
}
