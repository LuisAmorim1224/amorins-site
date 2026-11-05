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
import { excluirDocumento, tentarCobrancaDeNovo } from '../../acoes'
import { precisaTrocarSenha } from '@/lib/auth'
import { cnpjDoEmailDeLogin, ehEmailDeLogin } from '@/lib/login'
import AcessoCliente from './AcessoCliente'
import AcoesFicha from './AcoesFicha'
import EnviarDocumentos from './EnviarDocumentos'

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
            {cliente.valor_honorario &&
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
            pendencias={cliente.pendencias}
          />
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
          {cliente.valor_honorario && !cliente.asaas_subscription_id && (
            <form action={tentarCobrancaDeNovo} style={{ marginBottom: 12 }}>
              <input type="hidden" name="id" value={id} />
              <p className="erro">A cobrança automática ainda não foi criada no Asaas.</p>
              <button>Criar cobrança agora</button>
            </form>
          )}
          <Cobrancas cobrancas={cobrancas} erro={erroCobrancas} />
        </div>
      </main>
    </>
  )
}
