'use client'

import { useActionState } from 'react'
import { restaurarSenhaInicial } from '../../acoes'

export default function AcessoCliente({ clienteId, porCnpj, aguardandoPrimeiroAcesso }) {
  const [estado, acao, enviando] = useActionState(restaurarSenhaInicial, {})
  if (!porCnpj) return <p className="vazio">Este cliente entra com e-mail e senha.</p>
  return (
    <form action={acao} className="formulario">
      <input type="hidden" name="id" value={clienteId} />
      <p>
        Entra com o <strong>CNPJ</strong>.{' '}
        {aguardandoPrimeiroAcesso ? (
          <span className="etiqueta aberta">Aguardando primeiro acesso</span>
        ) : (
          <span className="etiqueta paga">Já criou a própria senha</span>
        )}
      </p>
      <p className="vazio">
        Se o cliente esquecer a senha, restaure: ele volta a entrar com os 6 primeiros números do
        CNPJ e cria uma senha nova.
      </p>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      {estado.ok && <p className="ok">{estado.ok}</p>}
      <div>
        <button disabled={enviando}>{enviando ? 'Restaurando...' : 'Restaurar senha inicial'}</button>
      </div>
    </form>
  )
}
