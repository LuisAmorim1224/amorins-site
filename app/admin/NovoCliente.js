'use client'

import { useActionState } from 'react'
import { cadastrarCliente } from './acoes'

export default function NovoCliente() {
  const [estado, acao, enviando] = useActionState(cadastrarCliente, {})
  return (
    <form action={acao} className="formulario">
      <div className="duas">
        <label>
          Nome ou razão social
          <input name="nome" required />
        </label>
        <label>
          CPF ou CNPJ
          <input name="cpf_cnpj" required inputMode="numeric" />
        </label>
        <label>
          E-mail (usado para entrar)
          <input type="email" name="email" required />
        </label>
        <label>
          Celular (opcional)
          <input name="telefone" inputMode="tel" placeholder="71999999999" />
        </label>
        <label>
          Honorário mensal (R$)
          <input name="valor" inputMode="decimal" placeholder="300,00" />
        </label>
        <label>
          Dia do vencimento
          <input type="number" name="dia" min={1} max={28} defaultValue={5} />
        </label>
        <label>
          Senha inicial do cliente
          <input name="senha" minLength={8} required autoComplete="off" />
        </label>
      </div>
      <p className="vazio">
        Se você deixar o honorário em branco, o cliente só terá acesso aos documentos, sem cobrança
        automática.
      </p>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      <div>
        <button disabled={enviando}>{enviando ? 'Cadastrando...' : 'Cadastrar cliente'}</button>
      </div>
    </form>
  )
}
