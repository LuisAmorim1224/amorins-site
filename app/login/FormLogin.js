'use client'

import { useActionState } from 'react'
import { entrar } from '@/app/acoes'

export default function FormLogin() {
  const [estado, acao, enviando] = useActionState(entrar, {})
  return (
    <form action={acao} className="formulario">
      <label>
        CNPJ ou e-mail
        <input name="login" required autoComplete="username" placeholder="00.000.000/0000-00" />
      </label>
      <label>
        Senha
        <input type="password" name="senha" required autoComplete="current-password" />
      </label>
      <p className="vazio">No primeiro acesso, a senha são os 6 primeiros números do CNPJ.</p>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      <button disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar'}</button>
    </form>
  )
}
