// Topo das páginas públicas internas (ex.: /regularizar).
export default function TopoSimples() {
  return (
    <header className="site-topo">
      <div className="conteudo">
        <a href="/" className="marca">
          <img src="/logo.png" alt="Logo Amorins Contábil" />
          Amorins Contábil
        </a>
        <nav>
          <a href="/#servicos">Serviços</a>
          <a href="/#contato">Contato</a>
          <a href="/login" className="btn-area">Área do Cliente</a>
        </nav>
      </div>
    </header>
  )
}
