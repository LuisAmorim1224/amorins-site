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
          E-mail de contato (opcional para CNPJ)
          <input type="email" name="email" />
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
          Senha inicial (só para CPF)
          <input name="senha" minLength={8} autoComplete="off" />
        </label>
      </div>
      <p className="vazio">
        Com CNPJ, o cliente entra com o próprio CNPJ e a senha inicial são os 6 primeiros números
        dele; no primeiro acesso ele é obrigado a criar uma senha nova. Com CPF, informe e-mail e
        senha. Honorário em branco = sem cobrança automática.
      </p>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      <div>
        <button disabled={enviando}>{enviando ? 'Cadastrando...' : 'Cadastrar cliente'}</button>
      </div>
    </form>
  )
}
