'use client'

import { useActionState } from 'react'
import { definirSenhaPrimeiroAcesso } from '@/app/acoes'

const TEXTO_CLIENTE =
  'Bem-vindo! Por segurança, crie agora uma senha só sua. A senha inicial (números do CNPJ) deixa de funcionar e seus documentos ficam liberados.'

export default function PrimeiroAcesso({ texto = TEXTO_CLIENTE }) {
  const [estado, acao, enviando] = useActionState(definirSenhaPrimeiroAcesso, {})
  return (
    <form action={acao} className="formulario">
      <p>{texto}</p>
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
      <p className="vazio">Use pelo menos 8 caracteres e não use o CNPJ.</p>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      <div>
        <button disabled={enviando}>{enviando ? 'Salvando...' : 'Criar senha e entrar'}</button>
      </div>
    </form>
  )
}
