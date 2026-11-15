// Topo e rodapé das páginas internas do site (artigos).
export function TopoSimples() {
  return (
    <header className="site-topo">
      <div className="conteudo">
        <a href="/" className="marca">
          <img src="/logo.png" alt="Logo Amorins Contábil" />
          Amorins Contábil
        </a>
        <nav>
          <a href="/#regularizacao">Regularização de CNPJ</a>
          <a href="/#servicos">Serviços</a>
          <a href="/artigos">Artigos</a>
          <a href="/#contato">Contato</a>
          <a href="/login" className="btn-area">Área do Cliente</a>
        </nav>
      </div>
    </header>
  )
}

export function RodapeSimples() {
  return (
    <footer className="rodape">
      <p>
        © {new Date().getFullYear()} Amorins Contábil · CNPJ 29.195.194/0001-00 · Contador responsável:
        Luis Amorim, CRC-BA 039792/O-0
      </p>
    </footer>
  )
}
