'use client'

import { useActionState } from 'react'
import { trocarSenha } from '@/app/acoes'

export default function TrocarSenha() {
  const [estado, acao, enviando] = useActionState(trocarSenha, {})
  return (
    <form action={acao} className="formulario">
      <div className="duas">
        <label>
          Nova senha
          <input type="password" name="senha" minLength={8} required autoComplete="new-password" />
        </label>
        <label>
          Repita a nova senha
          <input type="password" name="confirmacao" minLength={8} required autoComplete="new-password" />
        </label>
      </div>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      {estado.ok && <p className="ok">{estado.ok}</p>}
      <div>
        <button disabled={enviando}>{enviando ? 'Salvando...' : 'Trocar senha'}</button>
      </div>
    </form>
  )
}
