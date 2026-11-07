'use client'

import { useActionState } from 'react'
import { ativarCobrancaMensal } from '../../acoes'

export default function AtivarCobranca({ clienteId, valorAtual }) {
  const [estado, acao, enviando] = useActionState(ativarCobrancaMensal, {})
  return (
    <form action={acao} className="formulario" style={{ marginBottom: 16 }}>
      <input type="hidden" name="id" value={clienteId} />
      <p className="vazio">
        Cobrança mensal ainda não ativada. Defina o valor do honorário: o Asaas passa a gerar a
        cobrança (boleto ou PIX) com vencimento todo dia 5.
      </p>
      <label>
        Honorário mensal (R$)
        <input
          name="valor"
          required
          inputMode="decimal"
          placeholder="300,00"
          defaultValue={valorAtual ? String(valorAtual).replace('.', ',') : ''}
        />
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 'normal' }}>
        <input type="checkbox" name="confirmo" value="sim" required />
        Confirmo o valor e quero começar a cobrar este cliente todo dia 5.
      </label>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      {estado.ok && <p className="ok">{estado.ok}</p>}
      <div>
        <button disabled={enviando}>{enviando ? 'Ativando...' : 'Ativar cobrança mensal'}</button>
      </div>
    </form>
  )
}
