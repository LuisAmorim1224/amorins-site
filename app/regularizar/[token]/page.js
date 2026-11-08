import { notFound } from 'next/navigation'
import AlertasDiagnostico from '@/components/site/AlertasDiagnostico'
import BotaoRelatorio from '@/components/site/BotaoRelatorio'
import { Procuracao, Relatorio } from '@/components/site/RelatorioDiagnostico'
import TopoSimples from '@/components/site/TopoSimples'
import { dadosDaReceita, formatarCnpj } from '@/lib/cnpj'
import { linkWhatsapp } from '@/lib/contato'
import { integraConfigurado } from '@/lib/diagnosticos'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = { title: 'Seu diagnóstico · Amorins Contábil', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'
// A consulta ao Serpro pode demorar enquanto a Receita gera o relatório.
export const maxDuration = 300

export default async function MeuDiagnostico({ params }) {
  const { token } = await params
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) notFound()
  const { data: diag } = await createAdminClient().from('diagnosticos').select('*').eq('token', token).maybeSingle()
  if (!diag) notFound()
  const automatico = integraConfigurado()
  const pronto = diag.status === 'relatorio_pronto' || diag.status === 'concluido'

  return (
    <>
      <TopoSimples />
      <main className="secao">
        <div className="conteudo diag">
          <p className="rotulo">Seu diagnóstico</p>
          <h1 className="diag-titulo">Olá, {diag.nome.split(' ')[0]}! Este é o diagnóstico da sua empresa.</h1>
          <p className="info">Guarde este link para acompanhar. Ele é só seu.</p>
          <AlertasDiagnostico cnpj={diag.cnpj} empresa={diag.dados_publicos ? dadosDaReceita(diag.dados_publicos) : { razao_social: diag.razao_social }} alertas={diag.alertas} />

          {pronto ? (
            <Relatorio diag={diag} />
          ) : diag.status === 'erro' ? (
            <div className="diag-final">
              <h2>Seu pedido está com o contador</h2>
              <p>Não conseguimos puxar o relatório automaticamente. O contador vai verificar e falar com você pelo WhatsApp.</p>
            </div>
          ) : (
            <>
              <Procuracao />
              {automatico ? (
                <BotaoRelatorio token={token} />
              ) : (
                <div className="diag-final">
                  <p>Depois de cadastrar a procuração, avise pelo WhatsApp. O contador puxa o relatório e te manda o resumo e o valor.</p>
                  <a
                    href={linkWhatsapp(`Olá! Fiz a procuração no e-CAC para o diagnóstico do CNPJ ${formatarCnpj(diag.cnpj)}.`)}
                    className="botao-primario"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Avisar que fiz a procuração
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  )
}
