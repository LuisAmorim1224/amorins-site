export default function Inicio() {
  return (
    <>
      <header className="topo">
        <img src="/logo.png" alt="Logo Amorins Contábil" />
        <h1>Bem-vindo à Amorins Contábil</h1>
        <p className="sub">
          Oferecemos serviços financeiros especializados para MEI, empresas e pessoas físicas, com
          atendimento personalizado e soluções eficientes para suas necessidades.
        </p>
        <div className="cta">
          <a href="https://www.youtube.com/@AmorinsContabil" className="btn-red" target="_blank" rel="noreferrer">
            Inscreva-se no Canal
          </a>
          <a href="/login" className="btn-blue">
            Área do Cliente
          </a>
          <a href="#servicos" className="btn-blue">
            Conheça Nossos Serviços
          </a>
        </div>
      </header>

      <nav className="menu">
        <a href="#servicos">Serviços</a>
        <a href="#contato">Fale Conosco</a>
        <a href="/login">Área do Cliente</a>
      </nav>

      <section id="servicos">
        <h2>Nossos Serviços</h2>
        <div className="grid">
          <div className="card">
            <h3>Para MEI</h3>
            <ul>
              <li>Abertura de MEI</li>
              <li>Encerramento de MEI</li>
              <li>Inclusão de CNAE</li>
              <li>Geração de DAS</li>
              <li>Declaração Anual</li>
              <li>Acompanhamento</li>
            </ul>
          </div>
          <div className="card">
            <h3>Para Empresas</h3>
            <ul>
              <li>Abertura de Empresa</li>
              <li>Acompanhamento do Simples Nacional</li>
              <li>Regularização de CNPJ</li>
              <li>Acompanhamento Contábil</li>
              <li>Planejamento Tributário</li>
              <li>Alterações Contratuais</li>
            </ul>
          </div>
          <div className="card">
            <h3>Para Pessoa Física</h3>
            <ul>
              <li>Declaração de IRPF</li>
              <li>Regularização Fiscal</li>
              <li>Parcelamento de Dívidas Fiscais</li>
              <li>Planejamento Financeiro</li>
              <li>Consultoria Tributária</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="contato">
        <h2>Entre em Contato</h2>
        <div className="grid">
          <div className="card">
            <p>
              <strong>Canal no YouTube:</strong>
              <br />
              <a href="https://www.youtube.com/@AmorinsContabil" target="_blank" rel="noreferrer">
                youtube.com/@AmorinsContabil
              </a>
            </p>
            <p>
              <strong>Email:</strong>
              <br /> amorinscontabil@gmail.com
            </p>
            <p>
              <strong>Telefone:</strong>
              <br /> (71) 99945-4356
            </p>
            <p>
              <strong>Localização:</strong>
              <br /> Brasil
            </p>
          </div>
        </div>
      </section>

      <footer>
        <p>© {new Date().getFullYear()} Amorins Contábil. Todos os direitos reservados.</p>
      </footer>
    </>
  )
}
