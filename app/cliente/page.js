import { redirect } from 'next/navigation'
import Barra from '@/components/Barra'
import Cobrancas from '@/components/Cobrancas'
import DocumentosPorPasta from '@/components/cliente/DocumentosPorPasta'
import EnviarParaEscritorio from '@/components/cliente/EnviarParaEscritorio'
import ListaPedidos from '@/components/cliente/ListaPedidos'
import NotasEmitidas from '@/components/cliente/NotasEmitidas'
import PainelResumo from '@/components/cliente/PainelResumo'
import PedidoNota from '@/components/cliente/PedidoNota'
import PreviaImpostos from '@/components/cliente/PreviaImpostos'
import FichaCadastral from '@/components/FichaCadastral'
import PrimeiroAcesso from '@/components/PrimeiroAcesso'
import TrocarSenha from '@/components/TrocarSenha'
import { cobrancaEmAberto, listarCobrancas } from '@/lib/asaas'
import { ehEquipe, getUsuario, precisaTrocarSenha } from '@/lib/auth'
import { linkWhatsapp } from '@/lib/contato'
import { listarDocumentos } from '@/lib/documentos'
import { isoDe, pendenciasAutomaticas } from '@/lib/ficha'
import { createClient } from '@/lib/supabase/server'
import { hojeNaBahia } from '@/lib/vencimento'

export const metadata = { title: 'Área do Cliente · Amorins Contábil' }

// Arquivos das notas aparecem só na lista de notas (com o botão de baixar), não em Documentos.
const caminhosDeNotas = (notas) => new Set((notas || []).flatMap((n) => [n.caminho_arquivo, n.caminho_xml]).filter(Boolean))

export default async function AreaDoCliente() {
  const user = await getUsuario()
  if (!user) redirect('/login')
  if (ehEquipe(user)) redirect('/admin')

  // Ainda com a senha inicial: mostra só a criação de senha, sem buscar nenhum dado.
  if (precisaTrocarSenha(user)) {
    return (
      <>
        <Barra titulo="Área do Cliente" inicio="/cliente" />
        <main className="painel">
          <h1>Primeiro acesso</h1>
          <div className="caixa">
            <PrimeiroAcesso />
          </div>
        </main>
      </>
    )
  }

  const hoje = isoDe(hojeNaBahia())
  const supabase = await createClient()
  const [{ data: cliente }, documentos, { data: socios }, { data: pedidos }, { data: notas }] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', user.id).single(),
    listarDocumentos(supabase, user.id),
    supabase.from('socios').select('*').eq('cliente_id', user.id).order('criado_em'),
    supabase.from('pedidos_nota').select('*').eq('cliente_id', user.id).order('criado_em', { ascending: false }).limit(50),
    supabase.from('notas_emitidas').select('*').eq('cliente_id', user.id).order('data_emissao', { ascending: false }).limit(500),
  ])
  const pendencias = cliente
    ? [...(cliente.pendencias || []), ...pendenciasAutomaticas({ cliente, socios: socios || [], documentos, hoje })]
    : []

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

  const proximaCobranca = cobrancas
    .filter((c) => cobrancaEmAberto(c.status))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
  const ultimaGuia = documentos.filter((d) => d.tipo === 'guia').sort((a, b) => String(b.data).localeCompare(String(a.data)))[0]
  const faturamentoMes = (notas || [])
    .filter((n) => String(n.data_emissao).startsWith(hoje.slice(0, 7)))
    .reduce((t, n) => t + Number(n.valor), 0)
  const pedidosAbertos = (pedidos || []).filter((p) => p.status === 'pendente').length
  const nome = cliente?.nome_fantasia || cliente?.nome || 'cliente'

  return (
    <>
      <Barra titulo="Área do Cliente" inicio="/cliente" whatsapp={linkWhatsapp(`Olá! Sou cliente (${nome}) e preciso de ajuda.`)} />
      <nav className="submenu">
        <a href="#inicio">Início</a>
        <a href="#notas">Notas fiscais</a>
        <a href="#impostos">Impostos</a>
        <a href="#documentos">Documentos</a>
        <a href="#enviar">Enviar arquivos</a>
        <a href="#empresa">Sua empresa</a>
        <a href="#honorarios">Honorários</a>
      </nav>
      <main className="painel">
        <div id="inicio">
          <h1>Olá, {nome}!</h1>
          <p className="vazio">Aqui está o resumo da sua empresa hoje.</p>
        </div>
        <PainelResumo
          pendencias={pendencias.length}
          proximaCobranca={proximaCobranca}
          ultimaGuia={ultimaGuia}
          faturamentoMes={faturamentoMes}
          pedidosAbertos={pedidosAbertos}
        />

        <div className="caixa" id="notas">
          <h2>Pedir nota fiscal</h2>
          <PedidoNota />
          <h3 className="subtitulo">Seus pedidos</h3>
          <ListaPedidos pedidos={pedidos || []} />
        </div>

        <div className="caixa" id="impostos">
          <h2>Faturamento e prévia de impostos</h2>
          {cliente && <PreviaImpostos cliente={cliente} notas={notas || []} hoje={hoje} />}
          <h3 className="subtitulo">Notas emitidas</h3>
          <NotasEmitidas notas={notas || []} documentos={documentos} />
        </div>

        <div className="caixa" id="documentos">
          <h2>Seus documentos</h2>
          <DocumentosPorPasta documentos={documentos.filter((d) => !caminhosDeNotas(notas).has(d.caminho))} />
        </div>

        <div className="caixa" id="enviar">
          <h2>Enviar arquivos para o escritório</h2>
          <p className="vazio">Extratos, comprovantes, notas de compra ou qualquer documento que o escritório pedir.</p>
          <EnviarParaEscritorio />
        </div>

        {cliente && (
          <div className="caixa" id="empresa">
            <h2>Sua empresa</h2>
            <FichaCadastral cliente={cliente} socios={socios || []} pendencias={pendencias} />
          </div>
        )}

        <div className="caixa" id="honorarios">
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
