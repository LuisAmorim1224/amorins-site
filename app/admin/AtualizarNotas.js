'use client'

import { useActionState } from 'react'
import { atualizarNotasTodos } from './acoes'

// Busca agora, no Emissor Nacional, as notas novas de todos os clientes com certificado.
export default function AtualizarNotas() {
  const [estado, acao, buscando] = useActionState(atualizarNotasTodos, {})
  return (
    <form action={acao} className="formulario">
      <p className="vazio">
        Todo dia às 6h o site busca sozinho as notas novas de cada cliente com certificado (inclusive as emitidas direto no
        Emissor Nacional) e atualiza o gráfico e a prévia.
      </p>
      <div>
        <button disabled={buscando}>{buscando ? 'Buscando notas de todos os clientes...' : 'Atualizar notas de todos agora'}</button>
      </div>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      {estado.ok && <p className="ok">{estado.ok}</p>}
    </form>
  )
}
