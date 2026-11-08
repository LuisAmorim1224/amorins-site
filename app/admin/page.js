import Barra from '@/components/Barra'
import { exigirAdmin } from '@/lib/auth'
import { formatarCnpj } from '@/lib/cnpj'
import { reais } from '@/lib/formato'
import { ehEmailDeLogin } from '@/lib/login'
import { createAdminClient } from '@/lib/supabase/admin'
import ListaPedidos from '@/components/cliente/ListaPedidos'
import AcoesPedido from './AcoesPedido'
import NovoCliente from './NovoCliente'
import AtualizarNotas from './AtualizarNotas'
import { aprovarRecomendacao, excluirRecomendacao } from './acoes'
import { assinatura } from '@/lib/recomendacoes'
import { dataBR } from '@/lib/formato'
import { linkWhatsappPara } from '@/lib/contato'
import { TIPOS_PENDENCIA } from '@/lib/situacao-fiscal'
import { integraConfigurado } from '@/lib/diagnosticos'
import { GerarRelatorio, PrecosRegularizacao } from './Diagnosticos'
import { excluirDiagnostico, salvarDiagnostico } from './acoes'

const STATUS_DIAGNOSTICO = {
  aguardando_procuracao: 'aguardando procuração',
  relatorio_pronto: 'relatório pronto',
  erro: 'erro na consulta',
  concluido: 'concluído',
}

export const metadata = { title: 'Administração · Amorins Contábil' }
export const maxDuration = 300

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
  const { data: diagnosticos } = await supabase
    .from('diagnosticos')
    .select('id, token, cnpj, razao_social, nome, whatsapp, email, status, erro, resumo, valor, relatorio_caminho, tentativas, criado_em')
    .order('criado_em', { ascending: false })
    .limit(30)
  const { data: precos } = await supabase.from('precos_regularizacao').select('*')
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
          <h2>Notas emitidas pelos clientes</h2>
          <AtualizarNotas />
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
        <div className="caixa">
          <h2>Diagnósticos de CNPJ pelo site {diagnosticos?.length ? `(${diagnosticos.filter((d) => d.status !== 'concluido').length} em aberto)` : ''}</h2>
          {!integraConfigurado() && (
            <p className="info">
              Consulta automática desligada: falta configurar o Integra Contador (Serpro) na Vercel. Até lá, puxe o
              relatório no e-CAC e defina o valor aqui.
            </p>
          )}
          {diagnosticos?.length ? (
            <ul className="lista">
              {diagnosticos.map((d) => (
                <li key={d.id}>
                  <div>
                    <strong>{d.razao_social || formatarCnpj(d.cnpj)}</strong>
                    <div className="info">
                      {formatarCnpj(d.cnpj)} · {d.nome} ·{' '}
                      <a href={linkWhatsappPara(d.whatsapp, `Olá, ${d.nome.split(' ')[0]}! Aqui é o Luis, da Amorins Contábil, sobre o diagnóstico do seu CNPJ.`)} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                      {d.email ? ` · ${d.email}` : ''} · {dataBR(d.criado_em)}
                    </div>
                    <div className="info">
                      {STATUS_DIAGNOSTICO[d.status] || d.status}
                      {d.resumo?.pendencias?.length ? ` · ${d.resumo.pendencias.map((p) => p.titulo).join(', ')}` : ''}
                      {d.resumo?.semPendencias ? ' · sem pendências' : ''}
                      {d.erro && d.status !== 'relatorio_pronto' ? ` · ${d.erro}` : ''}
                    </div>
                    <div className="info">
                      <a href={`/regularizar/${d.token}`} target="_blank" rel="noreferrer">Página do visitante</a>
                      {d.relatorio_caminho && (
                        <>
                          {' · '}
                          <a href={`/admin/diagnosticos/${d.id}/pdf`} target="_blank" rel="noreferrer">Relatório (PDF)</a>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                    {integraConfigurado() && <GerarRelatorio id={d.id} jaTem={Boolean(d.relatorio_caminho)} />}
                    <form action={salvarDiagnostico} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="hidden" name="id" value={d.id} />
                      <input name="valor" inputMode="decimal" placeholder="valor R$" defaultValue={d.valor ?? ''} style={{ width: 110 }} />
                      <label className="info"><input type="checkbox" name="concluido" defaultChecked={d.status === 'concluido'} /> concluído</label>
                      <button>Salvar</button>
                    </form>
                    <form action={excluirDiagnostico}>
                      <input type="hidden" name="id" value={d.id} />
                      <button className="perigo">Excluir (LGPD)</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vazio">Nenhum pedido ainda. (Se der erro, rode supabase/007_diagnosticos.sql.)</p>
          )}
        </div>
        <div className="caixa">
          <h2>Preços da regularização</h2>
          <PrecosRegularizacao tipos={TIPOS_PENDENCIA} precos={precos} />
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
                    {c.asaas_subscription_id
                      ? `${reais(c.valor_honorario)} todo dia ${c.dia_vencimento}`
                      : 'Cobrança não ativada'}
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
