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
import { anexoDoServico } from '@/lib/simples'
import { servicosDosCnaes } from '@/lib/cnae-servicos'
import { createAdminClient } from '@/lib/supabase/admin'
import { hojeNaBahia } from '@/lib/vencimento'
import { excluirDocumento, excluirNotaEmitida, pedirNotaPeloEscritorio } from '../../acoes'
import PedidoNota from '@/components/cliente/PedidoNota'
import LinksNota from '@/components/cliente/LinksNota'
import AtivarCobranca from './AtivarCobranca'
import CobrancaAvulsa from './CobrancaAvulsa'
import { precisaTrocarSenha } from '@/lib/auth'
import { cnpjDoEmailDeLogin, ehEmailDeLogin } from '@/lib/login'
import ListaPedidos from '@/components/cliente/ListaPedidos'
import PreviaImpostos, { ComparacaoAnexos } from '@/components/cliente/PreviaImpostos'
import { dataBR } from '@/lib/formato'
import AcoesPedido from '../../AcoesPedido'
import AcessoCliente from './AcessoCliente'
import AcoesFicha from './AcoesFicha'
import EnviarDocumentos from './EnviarDocumentos'
import NotaAutomatica from './NotaAutomatica'

// Arquivos das notas aparecem só na lista de notas (com o botão de baixar), não em Documentos.
const caminhosDeNotas = (notas) => new Set((notas || []).flatMap((n) => [n.caminho_arquivo, n.caminho_xml]).filter(Boolean))

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
  // Anexo de cada nota pelo código de serviço guardado no histórico (por chave de acesso ou número).
  const { data: historico } = await supabase.from('historico_notas').select('chave_acesso, numero, cod_trib_nac').eq('cliente_id', id).limit(2000)
  const semZeros = (n) => String(n || '').replace(/^0+/, '')
  const codPorChave = new Map((historico || []).filter((h) => h.chave_acesso).map((h) => [h.chave_acesso, h.cod_trib_nac]))
  const codPorNumero = new Map((historico || []).filter((h) => h.numero).map((h) => [semZeros(h.numero), h.cod_trib_nac]))
  const notasComAnexo = (notas || []).map((n) => ({
    ...n,
    anexo: anexoDoServico(codPorChave.get(n.chave_acesso) || codPorNumero.get(semZeros(n.numero)), cliente.anexo_simples),
  }))
  const usadosPorCodigo = {}
  for (const h of historico || []) usadosPorCodigo[h.cod_trib_nac] = (usadosPorCodigo[h.cod_trib_nac] || 0) + 1
  const cnaes = servicosDosCnaes(cliente, usadosPorCodigo)
  const anoAtual = isoDe(hojeNaBahia()).slice(0, 4)
  const notasDoAno = (notas || []).filter((n) => String(n.data_emissao).startsWith(`${anoAtual}-`))
  const notasAnterioresAoAno = (notas || []).length - notasDoAno.length
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
          <NotaAutomatica cliente={cliente} servicos={servicos || []} notasAnteriores={notasAnteriores || 0} cnaes={cnaes} />
        </div>
        <div className="caixa">
          <h2>Pedidos de nota fiscal</h2>
          <details>
            <summary>Novo pedido de nota (pelo escritório)</summary>
            <PedidoNota acaoServidor={pedirNotaPeloEscritorio} clienteId={id} servicos={servicos || []} />
          </details>
          <ListaPedidos pedidos={pedidos || []} acoes={AcoesPedido} servicos={{ [id]: servicos || [] }} />
        </div>
        <div className="caixa">
          <h2>Notas emitidas e prévia de impostos</h2>
          {cliente.regime_tributario === 'Simples Nacional' && ['III', 'IV'].includes(cliente.anexo_simples) ? (
            <ComparacaoAnexos cliente={cliente} notas={notasComAnexo} hoje={isoDe(hojeNaBahia())} />
          ) : (
            <PreviaImpostos cliente={cliente} notas={notas || []} hoje={isoDe(hojeNaBahia())} />
          )}
          {notasAnterioresAoAno > 0 && (
            <p className="vazio pequeno">
              Mostrando as notas de {anoAtual}. {notasAnterioresAoAno} nota{notasAnterioresAoAno > 1 ? 's' : ''} de anos anteriores
              ficam guardadas e entram só no cálculo dos últimos 12 meses.
            </p>
          )}
          {notasDoAno.length ? (
            <ul className="lista">
              {notasDoAno.map((n) => (
                <li key={n.id}>
                  <div>
                    <strong>{reais(n.valor)}</strong> · {dataBR(n.data_emissao)}
                    <div className="info">
                      {n.numero ? `Nota nº ${n.numero}` : 'Sem número'}
                      {n.tomador && ` · ${n.tomador}`} · lançada pelo {n.lancada_por === 'escritorio' ? 'escritório' : 'cliente'}
                    </div>
                    <LinksNota nota={n} documentos={documentos} />
                  </div>
                  <form action={excluirNotaEmitida}>
                    <input type="hidden" name="id" value={n.id} />
                    <button className="perigo">Excluir</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vazio">Nenhuma nota lançada em {anoAtual}.</p>
          )}
        </div>
        <div className="caixa">
          <h2>Enviar documentos</h2>
          <EnviarDocumentos clienteId={id} />
        </div>
        <div className="caixa">
          <h2>Documentos do cliente</h2>
          <Documentos documentos={documentos.filter((d) => !caminhosDeNotas(notas).has(d.caminho))} excluir={excluirDocumento} />
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
