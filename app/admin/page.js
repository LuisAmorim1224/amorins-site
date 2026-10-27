import Barra from '@/components/Barra'
import { exigirAdmin } from '@/lib/auth'
import { reais } from '@/lib/formato'
import { createAdminClient } from '@/lib/supabase/admin'
import NovoCliente from './NovoCliente'

export const metadata = { title: 'Administração · Amorins Contábil' }

export default async function Admin() {
  await exigirAdmin()
  const { data: clientes } = await createAdminClient()
    .from('clientes')
    .select('*')
    .order('nome')

  return (
    <>
      <Barra titulo="Administração" inicio="/admin" />
      <main className="painel">
        <h1>Clientes</h1>
        <div className="caixa">
          {clientes?.length ? (
            <ul className="lista">
              {clientes.map((c) => (
                <li key={c.id}>
                  <div>
                    <a href={`/admin/clientes/${c.id}`}>
                      <strong>{c.nome}</strong>
                    </a>
                    <div className="info">{c.email}</div>
                  </div>
                  <div className="info">
                    {c.valor_honorario
                      ? `${reais(c.valor_honorario)} todo dia ${c.dia_vencimento}`
                      : 'Sem cobrança automática'}
                    {c.valor_honorario && !c.asaas_subscription_id && (
                      <span className="erro"> · cobrança pendente</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vazio">Nenhum cliente cadastrado ainda.</p>
          )}
        </div>
        <div className="caixa">
          <h2>Cadastrar cliente</h2>
          <NovoCliente />
        </div>
      </main>
    </>
  )
}
