'use client'

import { useActionState } from 'react'
import { cancelarPedido, escolherServicoEEmitir, marcarPedidoEmitido } from './acoes'

const codigo = (c) => `${c.slice(0, 2)}.${c.slice(2, 4)}.${c.slice(4, 6)}`

// Botões do escritório em cada pedido de nota em aberto.
export default function AcoesPedido({ pedido, servicos = [] }) {
  const [estado, acao, salvando] = useActionState(marcarPedidoEmitido, {})
  const [estadoNfse, acaoNfse, emitindo] = useActionState(escolherServicoEEmitir, {})
  const hoje = new Date().toISOString().slice(0, 10)
  return (
    <div className="formulario" style={{ minWidth: 240 }}>
      {servicos.length > 0 && (
        <form action={acaoNfse} className="formulario">
          <input type="hidden" name="id" value={pedido.id} />
          <label>
            {pedido.status === 'escolher_servico' ? 'Qual código de serviço usar nesta nota?' : 'Serviço da nota'}
            <select name="servico_id" defaultValue={pedido.servico_id || ''} required>
              <option value="" disabled>
                Escolha o serviço
              </option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {codigo(s.cod_trib_nac)} · {s.nome}
                </option>
              ))}
            </select>
          </label>
          <button name="emitir" value="sim" disabled={emitindo}>
            {emitindo ? 'Emitindo no Emissor Nacional...' : pedido.status === 'erro' ? 'Tentar emitir de novo' : 'Emitir NFS-e'}
          </button>
          {estadoNfse.erro && <p className="erro">{estadoNfse.erro}</p>}
          {estadoNfse.ok && <p className="ok">{estadoNfse.ok}</p>}
        </form>
      )}
      <details open={!servicos.length}>
        <summary>Emiti por fora / cancelar</summary>
        <form action={acao} className="formulario">
          <input type="hidden" name="id" value={pedido.id} />
          <input name="numero" placeholder="Nº da nota emitida" />
          <input name="valor" defaultValue={String(pedido.valor).replace('.', ',')} inputMode="decimal" />
          <input type="date" name="data_emissao" defaultValue={hoje} />
          <button disabled={salvando}>{salvando ? 'Salvando...' : 'Marcar como emitida'}</button>
          {estado.erro && <p className="erro">{estado.erro}</p>}
          {estado.ok && <p className="ok">{estado.ok}</p>}
        </form>
        <form action={cancelarPedido} className="formulario">
          <input type="hidden" name="id" value={pedido.id} />
          <input name="resposta" placeholder="Motivo (o cliente vê)" />
          <button className="perigo">Cancelar pedido</button>
        </form>
      </details>
    </div>
  )
}
