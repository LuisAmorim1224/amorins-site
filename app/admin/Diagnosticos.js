'use client'

import { useActionState } from 'react'
import { gerarRelatorioDiagnostico, salvarPrecosRegularizacao } from './acoes'

export function GerarRelatorio({ id, jaTem }) {
  const [estado, acao, gerando] = useActionState(gerarRelatorioDiagnostico, {})
  return (
    <form action={acao}>
      <input type="hidden" name="id" value={id} />
      <button disabled={gerando}>{gerando ? 'Consultando o Serpro...' : jaTem ? 'Gerar de novo' : 'Gerar relatório fiscal'}</button>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      {estado.ok && <p className="ok">{estado.ok}</p>}
    </form>
  )
}

export function PrecosRegularizacao({ tipos, precos }) {
  const [estado, acao, salvando] = useActionState(salvarPrecosRegularizacao, {})
  const porTipo = Object.fromEntries((precos || []).map((p) => [p.tipo, p]))
  return (
    <form action={acao} className="formulario">
      <p className="info">
        O valor aparece para o visitante só quando todos os tipos de pendência encontrados no relatório têm preço.
        Se faltar algum, ele vê &quot;o contador vai enviar o orçamento&quot; e você define o valor no pedido.
      </p>
      <table className="tabela-precos">
        <thead>
          <tr><th>Pendência</th><th>Valor (R$)</th><th>Cobrar por declaração</th></tr>
        </thead>
        <tbody>
          {Object.entries(tipos).map(([tipo, t]) => (
            <tr key={tipo}>
              <td>{t.titulo}</td>
              <td>
                <input name={`valor_${tipo}`} inputMode="decimal" placeholder="sem preço" defaultValue={porTipo[tipo]?.valor ?? ''} style={{ width: 120 }} />
              </td>
              <td>
                {tipo === 'omissao' && <input type="checkbox" name={`por_item_${tipo}`} defaultChecked={porTipo[tipo]?.por_item} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar preços'}</button>
      </div>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      {estado.ok && <p className="ok">{estado.ok}</p>}
    </form>
  )
}
