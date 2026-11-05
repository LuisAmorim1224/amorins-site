'use client'

import { useActionState } from 'react'
import { cancelarPedido, marcarPedidoEmitido } from './acoes'

// Botões do escritório em cada pedido de nota pendente.
export default function AcoesPedido({ pedido }) {
  const [estado, acao, salvando] = useActionState(marcarPedidoEmitido, {})
  const hoje = new Date().toISOString().slice(0, 10)
  return (
    <div className="formulario" style={{ minWidth: 240 }}>
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
    </div>
  )
}
