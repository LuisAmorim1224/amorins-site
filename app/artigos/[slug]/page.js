import { notFound } from 'next/navigation'
import { TopoSimples, RodapeSimples, WhatsappFlutuante } from '@/components/site/TopoSimples'
import { artigosPublicados, buscarArtigo } from '@/lib/artigos'
import { linkWhatsapp } from '@/lib/contato'
import { SITE_URL } from '@/lib/site'

// Artigos agendados aparecem sozinhos no dia: a página é gerada na primeira visita.
export const revalidate = 3600
export const dynamicParams = true

export function generateStaticParams() {
  return artigosPublicados().map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const artigo = buscarArtigo(slug)
  if (!artigo) return {}
  return {
    title: `${artigo.titulo} · Amorins Contábil`,
    description: artigo.descricao,
    alternates: { canonical: `/artigos/${artigo.slug}` },
    openGraph: {
      type: 'article',
      title: artigo.titulo,
      description: artigo.descricao,
      url: `/artigos/${artigo.slug}`,
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  }
}

function dataPorExtenso(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function Artigo({ params }) {
  const { slug } = await params
  const artigo = buscarArtigo(slug)
  if (!artigo) notFound()

  const dadosGoogle = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: artigo.titulo,
    description: artigo.descricao,
    datePublished: artigo.data,
    dateModified: artigo.atualizado || artigo.data,
    inLanguage: 'pt-BR',
    mainEntityOfPage: `${SITE_URL}/artigos/${artigo.slug}`,
    author: { '@type': 'Person', name: 'Luis Amorim', jobTitle: 'Contador, CRC-BA 039792/O-0' },
    publisher: { '@type': 'Organization', name: 'Amorins Contábil', logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` } },
  }

  return (
    <>
      <TopoSimples />
      <main className="secao">
        <article className="artigo">
          <a href="/artigos" className="voltar">← Todos os artigos</a>
          <h1 className="titulo-pagina">{artigo.titulo}</h1>
          <p className="autoria">
            Por Luis Amorim, contador (CRC-BA 039792/O-0) · {dataPorExtenso(artigo.atualizado || artigo.data)}
          </p>
          {artigo.secoes.map((s, i) => (
            <section key={i}>
              {s.h2 && <h2>{s.h2}</h2>}
              {s.p?.map((t, j) => <p key={j}>{t}</p>)}
              {s.lista && (
                <ul>
                  {s.lista.map((t, j) => <li key={j}>{t}</li>)}
                </ul>
              )}
            </section>
          ))}
          <div className="chamada-artigo">
            <div>
              <strong>Quer ajuda com a sua empresa?</strong>
              <p>Atendimento online para todo o Brasil. Eu analiso o seu caso e digo o que precisa ser feito.</p>
            </div>
            <a href={linkWhatsapp(artigo.whatsapp)} className="botao-primario" target="_blank" rel="noreferrer">
              Falar no WhatsApp
            </a>
          </div>
        </article>
      </main>
      <RodapeSimples />
      <WhatsappFlutuante mensagem={artigo.whatsapp} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosGoogle) }} />
    </>
  )
}
