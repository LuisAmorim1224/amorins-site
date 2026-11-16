'use client'

import { useActionState } from 'react'
import { removerFotoRecomendacao, salvarFotoRecomendacao } from './acoes'
import { inicial } from '@/lib/recomendacoes'

// Foto do cliente na recomendação: salve a foto do WhatsApp no computador ou celular e escolha aqui.
export default function FotoRecomendacao({ id, nome, foto }) {
  const [estado, acao, enviando] = useActionState(salvarFotoRecomendacao, {})
  return (
    <div className="foto-recomendacao-admin">
      {foto ? <img src={foto} alt="" className="avatar-recomendacao" /> : <span className="avatar-recomendacao">{inicial(nome)}</span>}
      <form action={acao}>
        <input type="hidden" name="id" value={id} />
        <input type="file" name="foto" accept="image/jpeg,image/png,image/webp" required />
        <button disabled={enviando} className="botao pequeno">{enviando ? 'Enviando...' : foto ? 'Trocar foto' : 'Salvar foto'}</button>
      </form>
      {foto && (
        <form action={removerFotoRecomendacao}>
          <input type="hidden" name="id" value={id} />
          <button className="perigo">Tirar foto</button>
        </form>
      )}
      {estado.erro && <span className="erro">{estado.erro}</span>}
      {estado.ok && <span className="ok">{estado.ok}</span>}
    </div>
  )
}
