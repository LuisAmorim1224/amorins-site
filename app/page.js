import FormRecomendacao from '@/components/site/FormRecomendacao'
import { assinatura } from '@/lib/recomendacoes'
import { createAdminClient } from '@/lib/supabase/admin'
import { EMAIL, linkWhatsapp, TELEFONE, YOUTUBE } from '@/lib/contato'

// Fundo da página inicial: 'fundo-grade' (tecnológico escuro), 'fundo-dados' (gráficos) ou 'fundo-claro'.
const FUNDO = 'fundo-grade'

const WHATS_REGULARIZAR = linkWhatsapp('Olá! Quero regularizar meu CNPJ. Pode me ajudar?')
const WHATS_PERICIA = linkWhatsapp('Olá! Preciso de um cálculo judicial/trabalhista ou de perícia contábil. Pode me ajudar?')

// A página é refeita a cada 5 minutos (e na hora em que o escritório aprova uma recomendação).
export const revalidate = 300

async function recomendacoesAprovadas() {
  try {
    const { data, error } = await createAdminClient()
      .from('recomendacoes')
      .select('id, nome, empresa, cidade, texto, nota')
      .eq('aprovado', true)
      .order('criado_em', { ascending: false })
      .limit(9)
    if (error) throw error
    return data || []
  } catch (erro) {
    // Sem banco (ex.: no build) ou tabela ainda não criada: a seção mostra só o formulário.
    console.error('Recomendações indisponíveis:', erro?.message || erro)
    return []
  }
}

export default async function Inicio() {
  const recomendacoes = await recomendacoesAprovadas()
  return (
    <>
      <header className="site-topo">
        <div className="conteudo">
          <a href="#" className="marca">
            <img src="/logo.png" alt="Logo Amorins Contábil" />
            Amorins Contábil
          </a>
          <nav>
            <a href="#apresentacao">Apresentação</a>
            <a href="#regularizacao">Regularização de CNPJ</a>
            <a href="#servicos">Serviços</a>
            <a href="#recomendacoes">Recomendações</a>
            <a href="#historia">Quem sou</a>
            <a href="#contato">Contato</a>
            <a href="/login" className="btn-area">Área do Cliente</a>
          </nav>
        </div>
      </header>

      <section className={`hero ${FUNDO}`}>
        <div className="conteudo">
          <div>
            <span className="selo">Contabilidade digital · Atendimento em todo o Brasil</span>
            <h1>
              Números em <em>ordem</em>. Decisões com segurança.
            </h1>
            <p className="sub">
              Acompanhe impostos e faturamento em tempo real. Contabilidade com tecnologia e um contador
              de verdade cuidando da sua empresa, de qualquer lugar do Brasil.
            </p>
            <div className="acoes">
              <a href="/login" className="botao-primario">Acessar Área do Cliente →</a>
              <a href={WHATS_REGULARIZAR} className="botao-secundario" target="_blank" rel="noreferrer">
                Regularizar meu CNPJ
              </a>
            </div>
          </div>
          <div className="cartao-area">
            <img src="/logo.png" alt="" />
            <h2>Área do Cliente</h2>
            <ul>
              <li>Documentos e guias organizados por pasta</li>
              <li>Pedido de nota fiscal em poucos cliques</li>
              <li>Prévia do Simples e alerta de limite do MEI</li>
              <li>Pendências da empresa sempre à vista</li>
            </ul>
            <a href="/login" className="botao-primario">Entrar com meu CNPJ</a>
          </div>
        </div>
      </section>

      <div className="faixa-numeros">
        <div className="conteudo">
          <div><strong>100% online</strong><span>atendimento em todo o Brasil</span></div>
          <div><strong>Contador registrado</strong><span>CRC-BA 039792/O-0</span></div>
          <div><strong>Formação UFBA</strong><span>pós e mestrado em controladoria</span></div>
          <div><strong>Desde 2017</strong><span>cuidando de empresas</span></div>
        </div>
      </div>

      <section className="secao branca video-apresentacao" id="apresentacao">
        <div className="conteudo">
          <p className="rotulo">Conheça a Amorins</p>
          <h2>Quem somos e como podemos ajudar a sua empresa</h2>
          <video
            controls
            playsInline
            preload="metadata"
            poster="/videos/apresentacao-capa.jpg"
            src="/videos/apresentacao.mp4"
          >
            Seu navegador não reproduz vídeos. Fale com a gente pelo WhatsApp.
          </video>
          <p className="nota-video">Vídeo criado com inteligência artificial a partir da imagem e da voz do Luis Amorim.</p>
        </div>
      </section>

      <section className="secao" id="regularizacao">
        <div className="conteudo destaque-cnpj">
          <div>
            <p className="rotulo">Carro-chefe</p>
            <h2>Regularização de CNPJ com agilidade e segurança</h2>
            <p className="intro">
              CNPJ inapto, dívidas no Simples, declarações atrasadas, certidão negativada ou MEI
              desenquadrado? Eu analiso a situação da sua empresa diretamente nos sistemas da Receita,
              monto o plano de regularização e acompanho cada etapa até a sua empresa voltar a ficar em dia.
              Tudo online, de qualquer lugar do Brasil.
            </p>
            <div className="problemas">
              <span>CNPJ inapto ou suspenso</span>
              <span>Declarações em atraso</span>
              <span>Dívidas do Simples / MEI</span>
              <span>Certidão positiva</span>
              <span>Parcelamentos</span>
              <span>MEI desenquadrado</span>
            </div>
            <div className="acoes" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href={WHATS_REGULARIZAR} className="botao-primario" target="_blank" rel="noreferrer">
                Quero regularizar meu CNPJ
              </a>
            </div>
          </div>
          <div className="passos">
            <div className="passo">
              <b>1</b>
              <div><h3>Diagnóstico completo</h3><p>Consulta da situação fiscal, pendências e débitos na Receita, no Simples e no município.</p></div>
            </div>
            <div className="passo">
              <b>2</b>
              <div><h3>Plano claro, sem surpresas</h3><p>Você recebe o que precisa ser feito, o custo e o prazo antes de começar.</p></div>
            </div>
            <div className="passo">
              <b>3</b>
              <div><h3>Regularização e parcelamentos</h3><p>Entrega das declarações em atraso e negociação dos débitos nas melhores condições.</p></div>
            </div>
            <div className="passo">
              <b>4</b>
              <div><h3>Empresa em dia, de verdade</h3><p>Certidão emitida e acompanhamento mensal para o problema não voltar.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="secao branca" id="servicos">
        <div className="conteudo">
          <p className="rotulo">Serviços</p>
          <h2>Contabilidade completa para cada fase da sua empresa</h2>
          <p className="intro">
            Empresas de todos os portes, do MEI que está começando à empresa que precisa de planejamento
            tributário, além de cálculos e perícia contábil para processos judiciais.
          </p>
          <div className="grid-servicos">
            <div className="card-servico principal">
              <h3>Regularização de CNPJ</h3>
              <ul>
                <li>Diagnóstico da situação fiscal</li>
                <li>Declarações em atraso</li>
                <li>Parcelamento de débitos</li>
                <li>Certidão negativa</li>
                <li>Reativação de CNPJ inapto</li>
              </ul>
            </div>
            <div className="card-servico">
              <h3>Para MEI</h3>
              <ul>
                <li>Abertura e encerramento</li>
                <li>Inclusão de atividades (CNAE)</li>
                <li>DAS e declaração anual</li>
                <li>Controle do limite de faturamento</li>
                <li>Migração para ME</li>
              </ul>
            </div>
            <div className="card-servico">
              <h3>Para empresas</h3>
              <ul>
                <li>Abertura e alterações contratuais</li>
                <li>Apuração do Simples Nacional</li>
                <li>Contabilidade e balanços</li>
                <li>Folha de pagamento</li>
                <li>Planejamento tributário</li>
              </ul>
            </div>
            <div className="card-servico">
              <h3>Para pessoa física</h3>
              <ul>
                <li>Declaração de Imposto de Renda</li>
                <li>Regularização de CPF</li>
                <li>Parcelamento de dívidas fiscais</li>
                <li>Planejamento financeiro</li>
              </ul>
            </div>
            <div className="card-servico">
              <h3>Cálculos e perícia contábil</h3>
              <ul>
                <li>Cálculos judiciais e liquidação de sentença</li>
                <li>Atualização monetária e juros de débitos</li>
                <li>Cálculos trabalhistas: rescisão, horas extras e verbas</li>
                <li>Perícia contábil judicial e extrajudicial</li>
                <li>Assistente técnico, laudos e pareceres</li>
              </ul>
            </div>
          </div>
          <div className="faixa-pericia">
            <div>
              <h3>Cálculos judiciais, trabalhistas e perícia contábil</h3>
              <p>
                Para advogados, empresas e pessoas físicas: cálculos com memória detalhada, laudos e
                pareceres técnicos assinados por contador registrado no CRC-BA.
              </p>
            </div>
            <a href={WHATS_PERICIA} className="botao-primario" target="_blank" rel="noreferrer">
              Solicitar orçamento
            </a>
          </div>
        </div>
      </section>

      <section className="secao" id="recomendacoes">
        <div className="conteudo">
          <p className="rotulo">Recomendações</p>
          <h2>Já foi atendido? Deixe sua recomendação</h2>
          <p className="intro">
            Sua opinião ajuda outros empreendedores a encontrar um contador de confiança. A recomendação
            aparece aqui depois de revisada.
          </p>
          {recomendacoes.length > 0 && (
            <div className="grid-recomendacoes">
              {recomendacoes.map((r) => (
                <figure className="card-recomendacao" key={r.id}>
                  {r.nota && <span className="estrelas" aria-label={`Nota ${r.nota} de 5`}>{'★'.repeat(r.nota)}{'☆'.repeat(5 - r.nota)}</span>}
                  <blockquote>{r.texto}</blockquote>
                  <figcaption>{assinatura(r)}</figcaption>
                </figure>
              ))}
            </div>
          )}
          <div className="caixa-recomendacao">
            <FormRecomendacao />
          </div>
        </div>
      </section>

      <section className="secao branca" id="historia">
        <div className="conteudo historia">
          <aside className="perfil">
            <img className="foto" src="/luis-amorim.jpg" alt="Luis Amorim, contador da Amorins Contábil" width={160} height={160} />
            <h3>Luis Amorim</h3>
            <p>Contador · CRC-BA 039792/O-0</p>
            <ul>
              <li>Bacharel em Ciências Contábeis pela UFBA</li>
              <li>Pós-graduado em Controladoria</li>
              <li>Mestrando em Controladoria</li>
              <li>Fundador da Amorins Contábil</li>
            </ul>
          </aside>
          <div className="texto">
            <p className="rotulo">Quem cuida da sua empresa</p>
            <h2>Uma história construída número a número</h2>
            <p>
              Sou Luis Amorim, contador formado pela Universidade Federal da Bahia. Escolhi a
              contabilidade porque acredito que por trás de cada número existe uma pessoa tentando
              construir algo: um sonho de empreender, o sustento de uma família, o futuro de uma equipe.
            </p>
            <p>
              Antes de abrir meu próprio escritório, fiz questão de passar por todas as áreas da
              contabilidade. Trabalhei com fiscal e tributário, com departamento pessoal, com
              contabilidade societária e com controladoria. Vi de perto o que acontece quando uma empresa
              é bem acompanhada — e também o custo de uma guia esquecida, de uma declaração atrasada ou de
              um CNPJ que ninguém olhou a tempo.
            </p>
            <blockquote>Foi daí que nasceu a Amorins Contábil: contabilidade séria, próxima e sem complicação.</blockquote>
            <p>
              Para ir além do dia a dia, me especializei com uma pós-graduação em Controladoria e hoje
              sou mestrando na mesma área. Isso significa olhar para a sua empresa não só para cumprir
              obrigações, mas para entender os números e ajudar você a tomar decisões melhores.
            </p>
            <p>
              Hoje uno essa experiência à tecnologia: atendo empresas de todo o Brasil de forma 100%
              online, com uma Área do Cliente onde você acompanha tudo em tempo real. Aqui você não é um
              número de protocolo — você fala com quem conhece a sua empresa.
            </p>
            <div className="linha-tempo">
              <div><strong>2014</strong><span>Bacharel em Ciências Contábeis — UFBA</span></div>
              <div><strong>2015</strong><span>Registro profissional no CRC-BA</span></div>
              <div><strong>2017</strong><span>Fundação da Amorins Contábil</span></div>
              <div><strong>Hoje</strong><span>Pós em Controladoria e mestrado em andamento</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="secao escura fundo-grade">
        <div className="conteudo">
          <p className="rotulo">Área do Cliente</p>
          <h2>Sua empresa na palma da mão</h2>
          <p className="intro">Entre com o seu CNPJ e tenha tudo da sua empresa organizado, a qualquer hora.</p>
          <div className="grid-recursos">
            <div><h3>Documentos por pasta</h3><p>Guias, notas, contratos e folha separados por tipo e por mês.</p></div>
            <div><h3>Pedido de nota fiscal</h3><p>Informe os dados da nota e o escritório emite para você.</p></div>
            <div><h3>Prévia de impostos</h3><p>Acompanhe o faturamento, a prévia do Simples e o limite do MEI.</p></div>
            <div><h3>Envio de documentos</h3><p>Mande extratos e comprovantes direto pela plataforma.</p></div>
          </div>
          <p style={{ marginTop: 30 }}>
            <a href="/login" className="botao-primario">Acessar Área do Cliente →</a>
          </p>
        </div>
      </section>

      <section className="secao branca" id="contato">
        <div className="conteudo">
          <p className="rotulo">Contato</p>
          <h2>Vamos conversar sobre a sua empresa?</h2>
          <p className="intro">Atendimento online para todo o Brasil.</p>
          <div className="contato-grid">
            <a href={linkWhatsapp()} target="_blank" rel="noreferrer"><strong>WhatsApp</strong><span>{TELEFONE}</span></a>
            <a href={`mailto:${EMAIL}`}><strong>E-mail</strong><span>{EMAIL}</span></a>
            <a href={YOUTUBE} target="_blank" rel="noreferrer"><strong>YouTube</strong><span>Dicas de contabilidade no canal @AmorinsContabil</span></a>
            <a href="/login"><strong>Área do Cliente</strong><span>Já é cliente? Entre com seu CNPJ</span></a>
          </div>
        </div>
      </section>

      <footer className="rodape">
        <p>
          © {new Date().getFullYear()} Amorins Contábil · CNPJ 29.195.194/0001-00 · Contador responsável:
          Luis Amorim, CRC-BA 039792/O-0
        </p>
      </footer>

      <a href={linkWhatsapp()} className="whatsapp-flutuante" target="_blank" rel="noreferrer">
        WhatsApp
      </a>
    </>
  )
}
