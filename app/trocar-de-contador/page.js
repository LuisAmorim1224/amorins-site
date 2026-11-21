import { EMAIL, linkWhatsapp, TELEFONE } from '@/lib/contato'

// Página de destino do anúncio do Google "trocar de contador".
// O Google reprova anúncios que levam a páginas sobre documentos e serviços de órgãos públicos,
// então aqui não entram textos sobre Receita, certidões, situação cadastral ou regularização.

export const metadata = {
  title: 'Quer trocar de contador? · Amorins Contábil',
  description:
    'Seu contador não responde? Na Amorins você fala direto com o contador, pelo WhatsApp. A troca é simples e nós cuidamos de tudo.',
  alternates: { canonical: '/trocar-de-contador' },
  openGraph: {
    title: 'Quer trocar de contador? · Amorins Contábil',
    description: 'Fale direto com o contador, pelo WhatsApp. A troca é simples e nós cuidamos de tudo.',
    url: '/trocar-de-contador',
  },
}

const WHATS = linkWhatsapp('Olá! Vim pelo Google e quero trocar de contador. Pode me ajudar?')

const DORES = [
  { titulo: 'Ele não te responde', texto: 'Você manda mensagem e espera dias. Aqui quem responde é o próprio contador, no WhatsApp.' },
  { titulo: 'Você não entende o que paga', texto: 'Guias chegam sem explicação. Aqui você recebe tudo organizado e explicado, na Área do Cliente.' },
  { titulo: 'Paga imposto demais', texto: 'Ninguém revisou o seu regime. Aqui a gente analisa se dá para pagar menos, dentro da lei.' },
  { titulo: 'Só lembra de você na hora de cobrar', texto: 'Aqui você tem acompanhamento todo mês e sabe o valor antes de fechar.' },
  { titulo: 'Deixou a empresa com pendências ou parada', texto: 'Eu assumo a contabilidade, vejo tudo o que ficou para trás e coloco a sua empresa em ordem.' },
]

const PASSOS = [
  { titulo: 'Você me chama no WhatsApp', texto: 'Conta como está a empresa. Não precisa mandar documento no primeiro contato.' },
  { titulo: 'Eu te passo o valor', texto: 'Você sabe o que vai ser feito, quanto custa e o prazo antes de decidir.' },
  { titulo: 'Eu cuido da troca', texto: 'Falo com o contador atual, recebo os arquivos e assumo a contabilidade. Você não precisa se preocupar.' },
]

export default function TrocarDeContador() {
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
            <span className="selo">Atendimento em todo o Brasil</span>
            <h1>
              Seu contador some quando você <em>precisa</em>?
            </h1>
            <p className="sub">
              Aqui você fala direto com o contador, não com um robô nem com uma central de atendimento. A troca
              é simples: eu falo com o seu contador atual e cuido de tudo.
            </p>
            <div className="acoes">
              <a href={WHATS} className="botao-whatsapp-grande" target="_blank" rel="noreferrer">
                Quero trocar de contador
              </a>
            </div>
          </div>
          <div className="cartao-area">
            <h2>Por que trocar para a Amorins</h2>
            <ul>
              <li>Você fala com o contador, Luis Amorim, CRC-BA 039792/O-0</li>
              <li>Resposta pelo WhatsApp, sem fila</li>
              <li>Valor e prazo combinados antes de começar</li>
              <li>Área do Cliente com documentos e impostos em tempo real</li>
            </ul>
            <a href={WHATS} className="botao-primario" target="_blank" rel="noreferrer">Pedir orçamento</a>
          </div>
        </div>
      </section>

      <section className="secao escura fundo-grade">
        <div className="conteudo">
          <p className="rotulo">Você se reconhece?</p>
          <h2>Os motivos mais comuns para trocar de contador</h2>
          <div className="grid-recursos">
            {DORES.map((d) => (
              <div key={d.titulo}><h3>{d.titulo}</h3><p>{d.texto}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="secao branca video-apresentacao">
        <div className="conteudo">
          <p className="rotulo">Conheça a Amorins</p>
          <h2>Quem vai cuidar da sua empresa</h2>
          <video controls playsInline preload="metadata" poster="/videos/apresentacao-capa.jpg" src="/videos/apresentacao.mp4">
            Seu navegador não reproduz vídeos. Fale com a gente pelo WhatsApp.
          </video>
          <p className="nota-video">Vídeo criado com inteligência artificial a partir da imagem e da voz do Luis Amorim.</p>
        </div>
      </section>

      <section className="secao">
        <div className="conteudo historia">
          <aside className="perfil">
            <img className="foto" src="/luis-amorim.jpg" alt="Luis Amorim, contador da Amorins Contábil" width={160} height={160} />
            <h3>Luis Amorim</h3>
            <p>Contador · CRC-BA 039792/O-0</p>
          </aside>
          <div className="texto">
            <p className="rotulo">Como funciona a troca</p>
            <h2>Três passos, sem dor de cabeça</h2>
            {PASSOS.map((p, i) => (
              <p key={p.titulo}><strong>{i + 1}. {p.titulo}.</strong> {p.texto}</p>
            ))}
            <p style={{ marginTop: 20 }}>
              <a href={WHATS} className="botao-primario" target="_blank" rel="noreferrer">Falar com o contador</a>
            </p>
          </div>
        </div>
      </section>

      <section className="secao branca" id="contato">
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
