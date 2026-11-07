import Barra from '@/components/Barra'
import { exigirAdmin } from '@/lib/auth'
import { formatarCnpj } from '@/lib/cnpj'
import { reais } from '@/lib/formato'
import { ehEmailDeLogin } from '@/lib/login'
import { createAdminClient } from '@/lib/supabase/admin'
import ListaPedidos from '@/components/cliente/ListaPedidos'
import AcoesPedido from './AcoesPedido'
import NovoCliente from './NovoCliente'
import { aprovarRecomendacao, excluirRecomendacao } from './acoes'
import { assinatura } from '@/lib/recomendacoes'

export const metadata = { title: 'Administração · Amorins Contábil' }

export default async function Admin() {
  await exigirAdmin()
  const supabase = createAdminClient()
  const { data: clientes } = await supabase.from('clientes').select('*').order('nome')
  const { data: pendentes } = await supabase
    .from('pedidos_nota')
    .select('*, clientes(nome)')
    .in('status', ['pendente', 'escolher_servico', 'erro'])
    .order('criado_em')
  const { data: recomendacoes } = await supabase
    .from('recomendacoes')
    .select('*')
    .order('aprovado')
    .order('criado_em', { ascending: false })
    .limit(30)
  const { data: listaServicos } = await supabase.from('servicos_nota').select('*').order('nome')
  const servicos = {}
  for (const s of listaServicos || []) (servicos[s.cliente_id] ||= []).push(s)

  return (
    <>
      <Barra titulo="Administração" inicio="/admin" />
      <main className="painel">
        <div className="caixa">
          <h2>Notas fiscais para emitir {pendentes?.length ? `(${pendentes.length})` : ''}</h2>
          <ListaPedidos pedidos={pendentes || []} acoes={AcoesPedido} servicos={servicos} mostrarCliente />
        </div>
        <div className="caixa">
          <h2>Recomendações do site {recomendacoes?.some((r) => !r.aprovado) ? `(${recomendacoes.filter((r) => !r.aprovado).length} para revisar)` : ''}</h2>
          {recomendacoes?.length ? (
            <ul className="lista">
              {recomendacoes.map((r) => (
                <li key={r.id}>
                  <div>
                    <strong>{assinatura(r)}</strong> {r.nota ? `· ${r.nota}/5` : ''}
                    <div>{r.texto}</div>
                    <div className="info">
                      {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                      {r.contato ? ` · contato: ${r.contato}` : ''} · {r.aprovado ? 'publicada no site' : 'aguardando aprovação'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {!r.aprovado && (
                      <form action={aprovarRecomendacao}>
                        <input type="hidden" name="id" value={r.id} />
                        <button>Publicar</button>
                      </form>
                    )}
                    <form action={excluirRecomendacao}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="perigo">{r.aprovado ? 'Tirar do site' : 'Excluir'}</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vazio">Nenhuma recomendação recebida ainda. (Se der erro, rode supabase/006_recomendacoes.sql.)</p>
          )}
        </div>
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
                    <div className="info">
                      {ehEmailDeLogin(c.email) ? `Acesso pelo CNPJ ${formatarCnpj(c.cpf_cnpj)}` : c.email}
                    </div>
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
