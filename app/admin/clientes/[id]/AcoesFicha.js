'use client'

import { useActionState } from 'react'
import { REGIMES } from '@/lib/ficha'
import { atualizarDadosReceita, importarFicha, salvarDadosInternos } from '../../acoes'

function Mensagem({ estado }) {
  if (estado?.erro) return <p className="erro">{estado.erro}</p>
  if (estado?.ok) return <p className="ok">{estado.ok}</p>
  return null
}

export default function AcoesFicha({ clienteId, temCnpj, regime, pendencias }) {
  const [estadoReceita, acaoReceita, consultando] = useActionState(atualizarDadosReceita, {})
  const [estadoFicha, acaoFicha, importando] = useActionState(importarFicha, {})

  return (
    <div className="acoes-ficha">
      {temCnpj && (
        <form action={acaoReceita} className="formulario">
          <input type="hidden" name="id" value={clienteId} />
          <div>
            <button disabled={consultando}>
              {consultando ? 'Consultando a Receita...' : 'Atualizar dados pela Receita Federal'}
            </button>
          </div>
          <Mensagem estado={estadoReceita} />
        </form>
      )}

      <form action={acaoFicha} className="formulario">
        <input type="hidden" name="id" value={clienteId} />
        <label>
          Importar ficha (cadastro-cliente.json)
          <input type="file" name="ficha" accept=".json,application/json" required />
        </label>
        <div>
          <button disabled={importando}>{importando ? 'Importando...' : 'Importar ficha'}</button>
        </div>
        <Mensagem estado={estadoFicha} />
      </form>

      {/* A key recria o formulário quando os dados salvos mudam; sem ela o React reseta o
          select para a opção inicial depois de salvar e o próximo "Salvar" apagaria o regime. */}
      <form
        key={`${regime || ''}|${(pendencias || []).join('\n')}`}
        action={salvarDadosInternos}
        className="formulario"
      >
        <input type="hidden" name="id" value={clienteId} />
        <label>
          Regime tributário
          <select name="regime" defaultValue={regime || ''}>
            <option value="">Não informado</option>
            {REGIMES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          Pendências e observações (uma por linha; o cliente também vê)
          <textarea name="pendencias" rows={5} defaultValue={(pendencias || []).join('\n')} />
        </label>
        <div>
          <button>Salvar</button>
        </div>
      </form>
    </div>
  )
}
