'use client'

import { useActionState } from 'react'
import { gerarMeuRelatorio } from '@/app/regularizar/acoes'

export default function BotaoRelatorio({ token }) {
  const [estado, acao, gerando] = useActionState(gerarMeuRelatorio, {})
  return (
    <form action={acao} className="diag-gerar">
      <input type="hidden" name="token" value={token} />
      <button className="botao-primario" disabled={gerando}>
        {gerando ? 'Consultando a Receita... (pode levar até 2 minutos)' : 'Já fiz a procuração, gerar meu relatório'}
      </button>
      {estado.erro && <p className="erro">{estado.erro}</p>}
    </form>
  )
}
