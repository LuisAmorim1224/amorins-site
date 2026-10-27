'use client'

import { useActionState } from 'react'
import { entrar } from '@/app/acoes'

export default function FormLogin() {
  const [estado, acao, enviando] = useActionState(entrar, {})
  return (
    <form action={acao} className="formulario">
      <label>
        E-mail
        <input type="email" name="email" required autoComplete="email" />
      </label>
      <label>
        Senha
        <input type="password" name="senha" required autoComplete="current-password" />
      </label>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      <button disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar'}</button>
    </form>
  )
}
