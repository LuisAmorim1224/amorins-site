import FormRecomendacao from '@/components/site/FormRecomendacao'
import { TopoSimples, RodapeSimples } from '@/components/site/TopoSimples'
import { linkWhatsapp } from '@/lib/contato'

// Link que o escritório manda aos clientes pelo WhatsApp para eles deixarem um depoimento.
// Não aparece no Google: é só para quem recebe o link.
export const metadata = {
  title: 'Conte como é ser cliente · Amorins Contábil',
  description: 'Deixe seu depoimento sobre o atendimento da Amorins Contábil.',
  robots: { index: false, follow: false },
}

const WHATS_DEPOIMENTO = linkWhatsapp(
  'Olá, Luis! Quero deixar meu depoimento sobre a Amorins Contábil (pode publicar no site): '
)

export default function Recomendar() {
  return (
    <>
      <TopoSimples />
      <main className="secao pagina-recomendar">
        <div className="conteudo">
          <p className="rotulo">Seu depoimento</p>
          <h1 className="titulo-pagina">Como é ser cliente da Amorins Contábil?</h1>
          <p className="intro">
            Obrigado por confiar no meu trabalho! Leva um minuto e ajuda outros empreendedores a encontrar um
            contador de confiança. Algumas ideias do que contar:
          </p>
          <ul className="ideias">
            <li>Qual problema você tinha quando chegou (CNPJ, impostos, MEI...)</li>
            <li>Como foi o atendimento e a comunicação</li>
            <li>O que mudou na sua empresa depois</li>
          </ul>
          <div className="caixa-recomendacao">
            <FormRecomendacao />
          </div>
          <p className="alternativa-whats">
            Prefere mandar por texto ou áudio?{' '}
            <a href={WHATS_DEPOIMENTO} target="_blank" rel="noreferrer">Enviar pelo WhatsApp →</a>
          </p>
        </div>
      </main>
      <RodapeSimples />
    </>
  )
}
