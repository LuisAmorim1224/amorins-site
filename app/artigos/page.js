import { TopoSimples, RodapeSimples } from '@/components/site/TopoSimples'
import { ARTIGOS } from '@/lib/artigos'
import { linkWhatsapp } from '@/lib/contato'

export const metadata = {
  title: 'Artigos sobre CNPJ, MEI e impostos · Amorins Contábil',
  description:
    'Respostas diretas sobre CNPJ inapto, MEI atrasado ou desenquadrado, certidão negativa e outras dúvidas de quem tem empresa.',
  alternates: { canonical: '/artigos' },
}

export default function Artigos() {
  return (
    <>
      <TopoSimples />
      <main className="secao">
        <div className="conteudo">
          <p className="rotulo">Artigos</p>
          <h1 className="titulo-pagina">Dúvidas de quem tem empresa, respondidas por um contador</h1>
          <div className="lista-artigos">
            {ARTIGOS.map((a) => (
              <a key={a.slug} href={`/artigos/${a.slug}`} className="card-artigo">
                <h2>{a.titulo}</h2>
                <p>{a.descricao}</p>
                <span>Ler artigo →</span>
              </a>
            ))}
          </div>
        </div>
      </main>
      <RodapeSimples />
      <a href={linkWhatsapp()} className="whatsapp-flutuante" target="_blank" rel="noreferrer">
        WhatsApp
      </a>
    </>
  )
}
