'use client'

import { useActionState } from 'react'
import { cadastrarSocio, removerSocio, salvarClientesSocio } from './acoes'

function Mensagem({ estado }) {
  if (estado?.erro) return <p className="erro">{estado.erro}</p>
  if (estado?.ok) return <p className="ok">{estado.ok}</p>
  return null
}

function EscolherClientes({ clientes, marcados = [] }) {
  return (
    <fieldset className="escolher-clientes">
      <legend>Clientes que ele pode ver</legend>
      {clientes.map((c) => (
        <label key={c.id} className="opcao">
          <input type="checkbox" name="clientes" value={c.id} defaultChecked={marcados.includes(c.id)} /> {c.nome}
        </label>
      ))}
    </fieldset>
  )
}

function Socio({ socio, clientes }) {
  const [estado, acao, salvando] = useActionState(salvarClientesSocio, {})
  return (
    <li className="socio">
      <div style={{ width: '100%' }}>
        <strong>{socio.nome}</strong> · {socio.email}
        <div className="info">{socio.primeiroAcesso ? 'Aguardando o primeiro acesso' : 'Senha própria criada'}</div>
        <form action={acao} className="formulario" key={socio.clientes.join(',')}>
          <input type="hidden" name="id" value={socio.id} />
          <EscolherClientes clientes={clientes} marcados={socio.clientes} />
          <div style={{ display: 'flex', gap: 12 }}>
            <button disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar clientes liberados'}</button>
          </div>
          <Mensagem estado={estado} />
        </form>
        <form action={removerSocio} onSubmit={(e) => !confirm(`Remover o acesso de ${socio.nome}?`) && e.preventDefault()}>
          <input type="hidden" name="id" value={socio.id} />
          <button className="link">Remover acesso</button>
        </form>
      </div>
    </li>
  )
}

export default function Socios({ socios, clientes }) {
  const [estado, acao, criando] = useActionState(cadastrarSocio, {})
  return (
    <>
      {socios.length > 0 && (
        <ul className="lista">
          {socios.map((s) => (
            <Socio key={s.id} socio={s} clientes={clientes} />
          ))}
        </ul>
      )}
      <details style={{ marginTop: 12 }} open={!socios.length}>
        <summary>Cadastrar sócio</summary>
        <form action={acao} className="formulario" key={estado?.ok || ''}>
          <div className="duas">
            <label>
              Nome
              <input name="nome" required />
            </label>
            <label>
              E-mail (login)
              <input name="email" type="email" required autoComplete="off" />
            </label>
          </div>
          <label>
            Senha inicial (ele troca no primeiro acesso)
            <input name="senha" type="text" minLength={8} required autoComplete="off" />
          </label>
          <EscolherClientes clientes={clientes} />
          <div>
            <button disabled={criando}>{criando ? 'Criando...' : 'Criar acesso'}</button>
          </div>
          <Mensagem estado={estado} />
        </form>
      </details>
    </>
  )
}
