'use client'

import { useActionState } from 'react'
import { pedirNota } from '@/app/cliente/acoes'

export default function PedidoNota() {
  const [estado, acao, enviando] = useActionState(pedirNota, {})
  return (
    <form action={acao} className="formulario" key={estado.ok || 'pedido'}>
      <p className="vazio">Preencha os dados da nota que você precisa. O escritório confere e emite para você.</p>
      <div className="duas">
        <label>
          CPF ou CNPJ de quem vai receber a nota
          <input name="tomador_documento" required inputMode="numeric" placeholder="00.000.000/0000-00" />
        </label>
        <label>
          Nome ou razão social
          <input name="tomador_nome" required />
        </label>
        <label>
          E-mail do cliente (opcional)
          <input name="tomador_email" type="email" placeholder="financeiro@empresa.com.br" />
        </label>
        <label>
          Valor da nota (R$)
          <input name="valor" required inputMode="decimal" placeholder="1.500,00" />
        </label>
      </div>
      <label>
        Endereço do cliente (opcional)
        <input name="tomador_endereco" placeholder="Rua, número, bairro, cidade/UF, CEP" />
      </label>
      <label>
        Descrição do serviço ou produto
        <textarea name="descricao" rows={3} required placeholder="Ex.: Consultoria em tecnologia referente a outubro/2026" />
      </label>
      <div className="duas">
        <label>
          Data em que precisa da nota (opcional)
          <input name="data_desejada" type="date" />
        </label>
        <label>
          O cliente vai reter o ISS?
          <select name="iss_retido" defaultValue="nao">
            <option value="nao">Não / não sei</option>
            <option value="sim">Sim, o ISS será retido</option>
          </select>
        </label>
      </div>
      <label>
        Observações (opcional)
        <textarea name="observacoes" rows={2} placeholder="Número do contrato, pedido de compra, dados bancários na nota..." />
      </label>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      {estado.ok && <p className="ok">{estado.ok}</p>}
      <div>
        <button disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar pedido de nota'}</button>
      </div>
    </form>
  )
}
