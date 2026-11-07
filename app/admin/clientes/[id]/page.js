import { notFound } from 'next/navigation'
import Barra from '@/components/Barra'
import Cobrancas from '@/components/Cobrancas'
import Documentos from '@/components/Documentos'
import FichaCadastral from '@/components/FichaCadastral'
import { listarCobrancas } from '@/lib/asaas'
import { exigirAdmin } from '@/lib/auth'
import { listarDocumentos } from '@/lib/documentos'
import { isoDe, pendenciasAutomaticas } from '@/lib/ficha'
import { reais } from '@/lib/formato'
import { createAdminClient } from '@/lib/supabase/admin'
import { hojeNaBahia } from '@/lib/vencimento'
import { excluirDocumento, excluirNotaEmitida } from '../../acoes'
import AtivarCobranca from './AtivarCobranca'
import CobrancaAvulsa from './CobrancaAvulsa'
import { precisaTrocarSenha } from '@/lib/auth'
import { cnpjDoEmailDeLogin, ehEmailDeLogin } from '@/lib/login'
import ListaPedidos from '@/components/cliente/ListaPedidos'
import PreviaImpostos from '@/components/cliente/PreviaImpostos'
import { dataBR } from '@/lib/formato'
import AcoesPedido from '../../AcoesPedido'
import AcessoCliente from './AcessoCliente'
import AcoesFicha from './AcoesFicha'
import EnviarDocumentos from './EnviarDocumentos'
import NotaAutomatica from './NotaAutomatica'

export default async function Cliente({ params }) {
  await exigirAdmin()
  const { id } = await params
  const supabase = createAdminClient()
  const { data: cliente } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle()
  if (!cliente) notFound()

  const { data: acesso } = await supabase.auth.admin.getUserById(id)
  const usuario = acesso?.user
  const documentos = await listarDocumentos(supabase, id)
  const { data: socios } = await supabase.from('socios').select('*').eq('cliente_id', id).order('criado_em')
  const { data: pedidos } = await supabase.from('pedidos_nota').select('*').eq('cliente_id', id).order('criado_em', { ascending: false }).limit(50)
  const { data: servicos } = await supabase.from('servicos_nota').select('*').eq('cliente_id', id).order('nome')
  const { count: notasAnteriores } = await supabase
    .from('historico_notas')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', id)
  const { data: notas } = await supabase.from('notas_emitidas').select('*').eq('cliente_id', id).order('data_emissao', { ascending: false }).limit(500)
  const pendencias = [
    ...(cliente.pendencias || []),
    ...pendenciasAutomaticas({ cliente, socios: socios || [], documentos, hoje: isoDe(hojeNaBahia()) }),
  ]
  let cobrancas = []
  let erroCobrancas = false
  if (cliente.asaas_customer_id) {
    try {
      cobrancas = await listarCobrancas(cliente.asaas_customer_id)
    } catch (e) {
      console.error('Erro ao buscar cobranças no Asaas:', e)
      erroCobrancas = true
    }
  }

  return (
    <>
      <Barra titulo="Administração" inicio="/admin" />
      <main className="painel">
        <div>
          <a href="/admin">← Clientes</a>
          <h1>{cliente.nome}</h1>
          <p className="vazio">
            {ehEmailDeLogin(cliente.email) ? 'Sem e-mail de contato' : cliente.email} · {cliente.cpf_cnpj}
            {cliente.asaas_subscription_id &&
              ` · ${reais(cliente.valor_honorario)} todo dia ${cliente.dia_vencimento}`}
          </p>
        </div>
        <div className="caixa">
          <h2>Acesso à Área do Cliente</h2>
          <AcessoCliente
            clienteId={id}
            porCnpj={Boolean(cnpjDoEmailDeLogin(usuario?.email))}
            aguardandoPrimeiroAcesso={precisaTrocarSenha(usuario)}
          />
        </div>
        <div className="caixa">
          <h2>Ficha cadastral</h2>
          <FichaCadastral cliente={cliente} socios={socios || []} pendencias={pendencias} />
          <AcoesFicha
            clienteId={id}
            temCnpj={cliente.cpf_cnpj?.length === 14}
            regime={cliente.regime_tributario}
            anexo={cliente.anexo_simples}
            pendencias={cliente.pendencias}
          />
        </div>
        <div className="caixa">
          <h2>Nota fiscal automática (Emissor Nacional)</h2>
          <NotaAutomatica cliente={cliente} servicos={servicos || []} notasAnteriores={notasAnteriores || 0} />
        </div>
        <div className="caixa">
          <h2>Pedidos de nota fiscal</h2>
          <ListaPedidos pedidos={pedidos || []} acoes={AcoesPedido} servicos={{ [id]: servicos || [] }} />
        </div>
        <div className="caixa">
          <h2>Notas emitidas e prévia de impostos</h2>
          <PreviaImpostos cliente={cliente} notas={notas || []} hoje={isoDe(hojeNaBahia())} />
          {notas?.length ? (
            <ul className="lista">
              {notas.map((n) => (
                <li key={n.id}>
                  <div>
                    <strong>{reais(n.valor)}</strong> · {dataBR(n.data_emissao)}
                    <div className="info">
                      {n.numero ? `Nota nº ${n.numero}` : 'Sem número'}
                      {n.tomador && ` · ${n.tomador}`} · lançada pelo {n.lancada_por === 'escritorio' ? 'escritório' : 'cliente'}
                    </div>
                  </div>
                  <form action={excluirNotaEmitida}>
                    <input type="hidden" name="id" value={n.id} />
                    <button className="perigo">Excluir</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vazio">Nenhuma nota lançada.</p>
          )}
        </div>
        <div className="caixa">
          <h2>Enviar documentos</h2>
          <EnviarDocumentos clienteId={id} />
        </div>
        <div className="caixa">
          <h2>Documentos do cliente</h2>
          <Documentos documentos={documentos} excluir={excluirDocumento} />
        </div>
        <div className="caixa">
          <h2>Cobranças</h2>
          {!cliente.asaas_subscription_id && (
            <AtivarCobranca clienteId={id} valorAtual={cliente.valor_honorario} />
          )}
          <Cobrancas cobrancas={cobrancas} erro={erroCobrancas} />
          <details style={{ marginTop: 16 }}>
            <summary>Gerar cobrança avulsa (mês em atraso, serviço extra)</summary>
            <CobrancaAvulsa clienteId={id} valorSugerido={cliente.valor_honorario} />
          </details>
        </div>
      </main>
    </>
  )
}
