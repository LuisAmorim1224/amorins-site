'use client'

import { useActionState } from 'react'
import { enviarRecomendacao } from '@/app/acoes'

export default function FormRecomendacao() {
  const [estado, acao, enviando] = useActionState(enviarRecomendacao, {})
  if (estado.ok) return <p className="recomendacao-enviada">{estado.ok}</p>
  return (
    <form action={acao} className="form-recomendacao">
      <div className="duas">
        <label>
          Seu nome
          <input name="nome" required maxLength={80} autoComplete="name" />
        </label>
        <label>
          Empresa (opcional)
          <input name="empresa" maxLength={80} autoComplete="organization" />
        </label>
        <label>
          Cidade (opcional)
          <input name="cidade" maxLength={60} placeholder="Salvador/BA" />
        </label>
        <label>
          Nota
          <select name="nota" defaultValue="5">
            <option value="5">★★★★★ Excelente</option>
            <option value="4">★★★★ Muito bom</option>
            <option value="3">★★★ Bom</option>
            <option value="2">★★ Regular</option>
            <option value="1">★ Ruim</option>
          </select>
        </label>
      </div>
      <label>
        Sua recomendação
        <textarea name="texto" required minLength={20} maxLength={800} rows={4} placeholder="Como foi o atendimento? O que foi resolvido?" />
      </label>
      <label>
        WhatsApp ou e-mail (opcional, não aparece no site)
        <input name="contato" maxLength={120} />
      </label>
      <label className="armadilha" aria-hidden="true">
        Site
        <input name="site" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="autorizo">
        <input type="checkbox" name="autorizo" required />
        Autorizo a Amorins Contábil a publicar no site meu nome, empresa e cidade junto com esta recomendação.
      </label>
      <button className="botao-primario" disabled={enviando}>
        {enviando ? 'Enviando...' : 'Enviar recomendação'}
      </button>
      {estado.erro && <p className="erro">{estado.erro}</p>}
    </form>
  )
}
