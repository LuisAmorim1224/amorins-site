'use client'

import { useActionState } from 'react'
import { gerarCobrancaAvulsa } from '../../acoes'

export default function CobrancaAvulsa({ clienteId, valorSugerido }) {
  const [estado, acao, enviando] = useActionState(gerarCobrancaAvulsa, {})
  return (
    <form action={acao} className="formulario" style={{ marginTop: 12 }}>
      <input type="hidden" name="id" value={clienteId} />
      <div className="duas">
        <label>
          Valor (R$)
          <input
            name="valor"
            required
            inputMode="decimal"
            placeholder="500,00"
            defaultValue={valorSugerido ? String(valorSugerido).replace('.', ',') : ''}
          />
        </label>
        <label>
          Vencimento
          <input type="date" name="vencimento" required />
        </label>
      </div>
      <label>
        Descrição (aparece para o cliente)
        <input name="descricao" placeholder="Honorários contábeis - novembro/2026" />
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 'normal' }}>
        <input type="checkbox" name="confirmo" value="sim" required />
        Confirmo o valor e quero gerar esta cobrança agora.
      </label>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      {estado.ok && <p className="ok">{estado.ok}</p>}
      <div>
        <button disabled={enviando}>{enviando ? 'Gerando...' : 'Gerar cobrança avulsa'}</button>
      </div>
    </form>
  )
}
