import MenuSite from '@/components/site/MenuSite'
import { linkWhatsapp } from '@/lib/contato'

const LINKS = [
  { href: '/#regularizacao', texto: 'Regularização de CNPJ' },
  { href: '/#servicos', texto: 'Serviços' },
  { href: '/artigos', texto: 'Artigos' },
  { href: '/#contato', texto: 'Contato' },
]

// Topo e rodapé das páginas internas do site (artigos, privacidade).
export function TopoSimples() {
  return (
    <header className="site-topo">
      <div className="conteudo">
        <a href="/" className="marca">
          <img src="/logo-96.png" alt="Logo Amorins Contábil" width={40} height={40} />
          Amorins Contábil
        </a>
        <MenuSite links={LINKS} />
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
      <p><a href="/privacidade">Política de privacidade</a></p>
    </footer>
  )
}

export function WhatsappFlutuante({ mensagem }) {
  return (
    <a href={linkWhatsapp(mensagem)} className="whatsapp-flutuante" target="_blank" rel="noreferrer">
      WhatsApp
    </a>
  )
}
