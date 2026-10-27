import { redirect } from 'next/navigation'
import Barra from '@/components/Barra'
import Cobrancas from '@/components/Cobrancas'
import Documentos from '@/components/Documentos'
import TrocarSenha from '@/components/TrocarSenha'
import { listarCobrancas } from '@/lib/asaas'
import { ehAdmin, getUsuario } from '@/lib/auth'
import { listarDocumentos } from '@/lib/documentos'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Área do Cliente · Amorins Contábil' }

export default async function AreaDoCliente() {
  const user = await getUsuario()
  if (!user) redirect('/login')
  if (ehAdmin(user)) redirect('/admin')

  const supabase = await createClient()
  const { data: cliente } = await supabase.from('clientes').select('*').eq('id', user.id).single()
  const documentos = await listarDocumentos(supabase, user.id)

  let cobrancas = []
  let erroCobrancas = false
  if (cliente?.asaas_customer_id) {
    try {
      cobrancas = await listarCobrancas(cliente.asaas_customer_id)
    } catch (e) {
      console.error('Erro ao buscar cobranças no Asaas:', e)
      erroCobrancas = true
    }
  }

  return (
    <>
      <Barra titulo="Área do Cliente" inicio="/cliente" />
      <main className="painel">
        <h1>Olá, {cliente?.nome?.split(' ')[0] || 'cliente'}!</h1>
        <div className="caixa">
          <h2>Seus documentos</h2>
          <Documentos documentos={documentos} />
        </div>
        <div className="caixa">
          <h2>Honorários</h2>
          <Cobrancas cobrancas={cobrancas} erro={erroCobrancas} />
        </div>
        <div className="caixa">
          <h2>Trocar senha</h2>
          <TrocarSenha />
        </div>
      </main>
    </>
  )
}
