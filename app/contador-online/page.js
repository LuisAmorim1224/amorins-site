import { EMAIL, linkWhatsapp, TELEFONE } from '@/lib/contato'

// Página de destino do anúncio de pesquisa do Google ("contador online").
// O Google reprova anúncios que levam a páginas sobre documentos e serviços de órgãos públicos,
// então esta página fala só de contabilidade e assessoria contábil. Não colocar aqui textos
// sobre regularização na Receita, certidões ou situação cadastral.

export const metadata = {
  title: 'Contador online para a sua empresa · Amorins Contábil',
  description:
    'Contabilidade online para empresas de todo o Brasil, com contador registrado no CRC-BA. Fale direto com o contador pelo WhatsApp.',
  alternates: { canonical: '/contador-online' },
  openGraph: {
    title: 'Contador online para a sua empresa · Amorins Contábil',
    description: 'Contabilidade online para empresas de todo o Brasil, com contador registrado no CRC-BA.',
    url: '/contador-online',
  },
}

const WHATS = linkWhatsapp('Olá! Vim pelo Google e quero falar com o contador sobre a minha empresa.')

const SERVICOS = [
  { titulo: 'Contabilidade mensal', texto: 'Escrituração, balanços e apuração dos impostos da sua empresa todo mês.' },
  { titulo: 'MEI e pequenas empresas', texto: 'Acompanhamento do MEI, controle do faturamento e mudança para ME quando for a hora.' },
  { titulo: 'Folha de pagamento', texto: 'Admissões, folha mensal, férias, rescisões e encargos dos funcionários.' },
  { titulo: 'Planejamento tributário', texto: 'Análise do regime mais vantajoso para pagar menos imposto dentro da lei.' },
  { titulo: 'Consultoria contábil', texto: 'Organização financeira, análise dos números e apoio nas decisões da empresa.' },
  { titulo: 'Cálculos e perícia contábil', texto: 'Cálculos trabalhistas e judiciais, laudos e pareceres técnicos.' },
]

export default function ContadorOnline() {
  return (
    <>
      <header className="site-topo">
        <div className="conteudo">
          <a href="/" className="marca">
            <img src="/logo-96.png" alt="Logo Amorins Contábil" width={40} height={40} />
            Amorins Contábil
          </a>
        </div>
      </header>

      <section className="hero fundo-grade">
        <div className="conteudo">
          <div>
            <span className="selo">Contabilidade online · Atendimento em todo o Brasil</span>
            <h1>
              Contador <em>online</em> para a sua empresa.
            </h1>
            <p className="sub">
              Você fala direto com o contador, pelo WhatsApp, e sabe o valor antes de começar. Atendemos
              MEI, pequenas e médias empresas de qualquer lugar do Brasil.
            </p>
            <div className="acoes">
              <a href={WHATS} className="botao-whatsapp-grande" target="_blank" rel="noreferrer">
                Falar com o contador no WhatsApp
              </a>
            </div>
          </div>
          <div className="cartao-area">
            <h2>Por que a Amorins</h2>
            <ul>
              <li>Contador registrado no CRC-BA cuidando da sua empresa</li>
              <li>Atendimento 100% online, de qualquer lugar do Brasil</li>
              <li>Valor e prazo combinados antes de começar</li>
              <li>Área do Cliente com documentos e impostos em tempo real</li>
            </ul>
            <a href={WHATS} className="botao-primario" target="_blank" rel="noreferrer">Pedir orçamento</a>
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

      <section className="secao branca video-apresentacao">
        <div className="conteudo">
          <p className="rotulo">Conheça a Amorins</p>
          <h2>Quem cuida da sua empresa</h2>
          <video controls playsInline preload="metadata" poster="/videos/apresentacao-capa.jpg" src="/videos/apresentacao.mp4">
            Seu navegador não reproduz vídeos. Fale com a gente pelo WhatsApp.
          </video>
          <p className="nota-video">Vídeo criado com inteligência artificial a partir da imagem e da voz do Luis Amorim.</p>
        </div>
      </section>

      <section className="secao escura fundo-grade" id="servicos">
        <div className="conteudo">
          <p className="rotulo">Serviços</p>
          <h2>Contabilidade completa, sem sair de casa</h2>
          <div className="grid-recursos">
            {SERVICOS.map((s) => (
              <div key={s.titulo}><h3>{s.titulo}</h3><p>{s.texto}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="secao branca">
        <div className="conteudo historia">
          <aside className="perfil">
            <img className="foto" src="/luis-amorim.jpg" alt="Luis Amorim, contador da Amorins Contábil" width={160} height={160} />
            <h3>Luis Amorim</h3>
            <p>Contador · CRC-BA 039792/O-0</p>
          </aside>
          <div className="texto">
            <p className="rotulo">Como funciona</p>
            <h2>Três passos para ter um contador de verdade</h2>
            <p><strong>1. Você manda uma mensagem.</strong> Conta como está a sua empresa, sem precisar enviar documentos no primeiro contato.</p>
            <p><strong>2. Eu analiso e te passo o valor.</strong> Você sabe o que vai ser feito, quanto custa e o prazo antes de fechar.</p>
            <p><strong>3. Sua contabilidade em dia.</strong> Acompanhamento mensal e tudo disponível na Área do Cliente.</p>
            <p style={{ marginTop: 20 }}>
              <a href={WHATS} className="botao-primario" target="_blank" rel="noreferrer">Falar com o contador</a>
            </p>
          </div>
        </div>
      </section>

      <section className="secao" id="contato">
        <div className="conteudo">
          <p className="rotulo">Contato</p>
          <h2>Vamos conversar sobre a sua empresa?</h2>
          <div className="contato-grid">
            <a href={WHATS} target="_blank" rel="noreferrer"><strong>WhatsApp</strong><span>{TELEFONE}</span></a>
            <a href={`mailto:${EMAIL}`}><strong>E-mail</strong><span>{EMAIL}</span></a>
          </div>
        </div>
      </section>

      <footer className="rodape">
        <p>© {new Date().getFullYear()} Amorins Contábil · Contador responsável: Luis Amorim, CRC-BA 039792/O-0</p>
        <p><a href="/privacidade">Política de privacidade</a></p>
      </footer>

      <a href={WHATS} className="whatsapp-flutuante" target="_blank" rel="noreferrer">WhatsApp</a>
    </>
  )
}
