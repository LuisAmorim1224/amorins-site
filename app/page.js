import FormRecomendacao from '@/components/site/FormRecomendacao'
import MenuSite from '@/components/site/MenuSite'
import { assinatura, inicial } from '@/lib/recomendacoes'
import { createAdminClient } from '@/lib/supabase/admin'
import { EMAIL, INSTAGRAM, linkWhatsapp, TELEFONE, WHATSAPP, YOUTUBE } from '@/lib/contato'
import { artigosPublicados } from '@/lib/artigos'
import { SITE_URL } from '@/lib/site'

// Fundo da página inicial: 'fundo-grade' (tecnológico escuro), 'fundo-dados' (gráficos) ou 'fundo-claro'.
const FUNDO = 'fundo-grade'

const WHATS_REGULARIZAR = linkWhatsapp('Olá! Quero regularizar meu CNPJ. Pode me ajudar?')
const WHATS_CONTADOR = linkWhatsapp('Olá! Vim pelo site e quero falar com o contador sobre a minha empresa.')
const WHATS_PERICIA = linkWhatsapp('Olá! Preciso de um cálculo judicial/trabalhista ou de perícia contábil. Pode me ajudar?')

// A página é refeita a cada 5 minutos (e na hora em que o escritório aprova uma recomendação).
export const revalidate = 300

// Cards de serviço: cada um tem um botão de WhatsApp com a mensagem já falando daquele serviço.
const SERVICOS = [
  {
    titulo: 'Regularização de CNPJ',
    principal: true,
    itens: ['Diagnóstico da situação fiscal', 'Declarações em atraso', 'Parcelamento de débitos', 'Certidão negativa', 'Reativação de CNPJ inapto'],
    mensagem: 'Olá! Quero regularizar meu CNPJ. Pode me ajudar?',
  },
  {
    titulo: 'Para MEI',
    itens: ['Abertura e encerramento', 'Inclusão de atividades (CNAE)', 'DAS e declaração anual', 'Controle do limite de faturamento', 'Migração para ME'],
    mensagem: 'Olá! Sou MEI e preciso de ajuda com a minha empresa.',
  },
  {
    titulo: 'Para empresas',
    itens: ['Abertura e alterações contratuais', 'Apuração do Simples Nacional', 'Contabilidade e balanços', 'Folha de pagamento', 'Planejamento tributário'],
    mensagem: 'Olá! Quero um orçamento de contabilidade para a minha empresa.',
  },
  {
    titulo: 'Para pessoa física',
    itens: ['Declaração de Imposto de Renda', 'Regularização de CPF', 'Parcelamento de dívidas fiscais', 'Planejamento financeiro'],
    mensagem: 'Olá! Preciso de ajuda com Imposto de Renda / CPF.',
  },
  {
    titulo: 'Cálculos e perícia contábil',
    itens: ['Cálculos judiciais e liquidação de sentença', 'Atualização monetária e juros de débitos', 'Cálculos trabalhistas: rescisão, horas extras e verbas', 'Perícia contábil judicial e extrajudicial', 'Assistente técnico, laudos e pareceres'],
    mensagem: 'Olá! Preciso de um cálculo judicial/trabalhista ou de perícia contábil. Pode me ajudar?',
  },
]

async function recomendacoesAprovadas() {
  try {
    const { data, error } = await createAdminClient()
      .from('recomendacoes')
      .select('*')
      .eq('aprovado', true)
      .order('criado_em', { ascending: false })
      .limit(9)
    if (error) throw error
    // Só os campos públicos (o contato do cliente nunca vai para a página).
    return (data || []).map(({ id, nome, empresa, cidade, texto, nota, foto }) => ({ id, nome, empresa, cidade, texto, nota, foto }))
  } catch (erro) {
    // Sem banco (ex.: no build) ou tabela ainda não criada: a seção mostra só o formulário.
    console.error('Recomendações indisponíveis:', erro?.message || erro)
    return []
  }
}

// Dados da empresa no formato que o Google entende (aparecem melhor na busca).
const DADOS_GOOGLE = {
  '@context': 'https://schema.org',
  '@type': 'AccountingService',
  name: 'Amorins Contábil',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/logo.png`,
  telephone: `+${WHATSAPP}`,
  email: EMAIL,
  areaServed: { '@type': 'Country', name: 'Brasil' },
  address: { '@type': 'PostalAddress', addressLocality: 'Salvador', addressRegion: 'BA', addressCountry: 'BR' },
  founder: { '@type': 'Person', name: 'Luis Amorim', jobTitle: 'Contador, CRC-BA 039792/O-0' },
  foundingDate: '2017',
  sameAs: [INSTAGRAM, YOUTUBE],
  knowsAbout: ['Regularização de CNPJ', 'MEI', 'Simples Nacional', 'Imposto de Renda', 'Perícia contábil', 'Cálculos trabalhistas'],
}

export default async function Inicio() {
  const recomendacoes = await recomendacoesAprovadas()
  return (
    <>
      <header className="site-topo">
        <div className="conteudo">
          <a href="#" className="marca">
            <img src="/logo-96.png" alt="Logo Amorins Contábil" width={40} height={40} />
            Amorins Contábil
          </a>
          <MenuSite
            links={[
              { href: '#regularizacao', texto: 'Regularização de CNPJ' },
              { href: '#servicos', texto: 'Serviços' },
              ...(recomendacoes.length > 0 ? [{ href: '#recomendacoes', texto: 'Recomendações' }] : []),
              { href: '#historia', texto: 'Quem sou' },
              { href: '/artigos', texto: 'Artigos' },
              { href: '#contato', texto: 'Contato' },
            ]}
          />
        </div>
      </header>

      <section className={`hero ${FUNDO}`}>
        <div className="conteudo">
          <div>
            <span className="selo">Contabilidade digital · Atendimento em todo o Brasil</span>
            <h1>
              Contador <em>online</em> para a sua empresa, em todo o Brasil.
            </h1>
            <p className="sub">
              Especialista em regularizar CNPJ: inapto, com dívidas no Simples ou no MEI, declarações
              atrasadas ou certidão positiva. Também cuido da contabilidade de empresas de todos os portes,
              com um contador de verdade falando direto com você.
            </p>
            <div className="acoes">
              <a href={WHATS_CONTADOR} className="botao-whatsapp-grande" target="_blank" rel="noreferrer">
                Falar com o contador no WhatsApp
              </a>
              <a href="#regularizacao" className="botao-secundario">
                Regularizar meu CNPJ
              </a>
            </div>
            <p className="ja-cliente">Já é cliente? <a href="/login">Entrar na Área do Cliente →</a></p>
          </div>
          <div className="cartao-area">
            <h2>Por que a Amorins</h2>
            <ul>
              <li>Contador registrado no CRC-BA cuidando do seu caso</li>
              <li>Atendimento 100% online, de qualquer lugar do Brasil</li>
              <li>Custo e prazo combinados antes de começar</li>
              <li>Área do Cliente com documentos e impostos em tempo real</li>
            </ul>
            <a href={WHATS_CONTADOR} className="botao-primario" target="_blank" rel="noreferrer">Pedir orçamento</a>
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
            {SERVICOS.map((sv) => (
              <div key={sv.titulo} className={`card-servico${sv.principal ? ' principal' : ''}`}>
                <h3>{sv.titulo}</h3>
                <ul>
                  {sv.itens.map((i) => <li key={i}>{i}</li>)}
                </ul>
                <a href={linkWhatsapp(sv.mensagem)} className="link-servico" target="_blank" rel="noreferrer">
                  Falar sobre isso no WhatsApp →
                </a>
              </div>
            ))}
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
          {recomendacoes.length > 0 ? (
            <>
              <h2>O que dizem os clientes</h2>
              <div className="grid-recomendacoes">
                {recomendacoes.map((r) => (
                  <figure className="card-recomendacao" key={r.id}>
                    {r.nota && <span className="estrelas" aria-label={`Nota ${r.nota} de 5`}>{'★'.repeat(r.nota)}{'☆'.repeat(5 - r.nota)}</span>}
                    <blockquote>{r.texto}</blockquote>
                    <figcaption>
                      {r.foto ? <img src={r.foto} alt="" className="avatar-recomendacao" /> : <span className="avatar-recomendacao">{inicial(r.nome)}</span>}
                      {assinatura(r)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          ) : (
            <h2>Já é cliente? Conte como foi</h2>
          )}
          <details className="caixa-recomendacao">
            <summary>Deixar uma recomendação</summary>
            <p className="intro">
              Sua opinião ajuda outros empreendedores a encontrar um contador de confiança. A recomendação
              aparece aqui depois de revisada.
            </p>
            <FormRecomendacao />
          </details>
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

      <section className="secao" id="artigos">
        <div className="conteudo">
          <p className="rotulo">Artigos</p>
          <h2>Dúvidas comuns de quem tem empresa</h2>
          <div className="lista-artigos">
            {artigosPublicados().slice(0, 6).map((a) => (
              <a key={a.slug} href={`/artigos/${a.slug}`} className="card-artigo">
                <h3>{a.titulo}</h3>
                <p>{a.descricao}</p>
                <span>Ler artigo →</span>
              </a>
            ))}
          </div>
          <p style={{ marginTop: 20 }}><a href="/artigos">Ver todos os artigos →</a></p>
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
            <a href={INSTAGRAM} target="_blank" rel="noreferrer"><strong>Instagram</strong><span>@amorinscontabil</span></a>
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
        <p><a href="/privacidade">Política de privacidade</a></p>
      </footer>

      <a href={linkWhatsapp()} className="whatsapp-flutuante" target="_blank" rel="noreferrer">
        WhatsApp
      </a>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(DADOS_GOOGLE) }} />
    </>
  )
}
