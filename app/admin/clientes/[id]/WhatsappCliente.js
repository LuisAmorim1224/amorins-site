'use client'

import { useActionState } from 'react'
import { salvarWhatsapp } from '../../acoes'

// Número para onde vão as cobranças pelo WhatsApp.
export default function WhatsappCliente({ clienteId, telefone, telefoneReceita }) {
  const [estado, acao, salvando] = useActionState(salvarWhatsapp, {})
  return (
    <form action={acao} className="formulario" key={telefone || ''}>
      <input type="hidden" name="id" value={clienteId} />
      <label>
        WhatsApp do cliente (para enviar as cobranças)
        <input name="telefone" inputMode="tel" placeholder="(71) 99999-9999" defaultValue={telefone || ''} />
      </label>
      {!telefone && telefoneReceita && (
        <p className="vazio pequeno">Sem número cadastrado: o botão usa o telefone da Receita ({telefoneReceita}).</p>
      )}
      <div>
        <button disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar número'}</button>
      </div>
      {estado?.erro && <p className="erro">{estado.erro}</p>}
      {estado?.ok && <p className="ok">{estado.ok}</p>}
    </form>
  )
}
