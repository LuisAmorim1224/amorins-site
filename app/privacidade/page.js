import { TopoSimples, RodapeSimples, WhatsappFlutuante } from '@/components/site/TopoSimples'
import { EMAIL, TELEFONE } from '@/lib/contato'

export const metadata = {
  title: 'Política de privacidade · Amorins Contábil',
  description: 'Como a Amorins Contábil trata os dados de quem visita o site, deixa uma recomendação ou usa a Área do Cliente.',
  alternates: { canonical: '/privacidade' },
}

export default function Privacidade() {
  return (
    <>
      <TopoSimples />
      <main className="secao">
        <article className="texto-legal">
          <p className="rotulo">Privacidade</p>
          <h1 className="titulo-pagina">Política de privacidade</h1>
          <p>
            Esta página explica quais dados a Amorins Contábil (CNPJ 29.195.194/0001-00) coleta neste site, para
            que eles servem e como você pode pedir para vê-los, corrigi-los ou apagá-los, conforme a Lei Geral de
            Proteção de Dados (Lei 13.709/2018).
          </p>

          <h2>Quais dados coletamos</h2>
          <ul>
            <li>
              <strong>Recomendações:</strong> nome, empresa, cidade, nota, texto e, se você quiser, um WhatsApp ou
              e-mail. O contato não aparece no site; serve só para confirmarmos a recomendação.
            </li>
            <li>
              <strong>Área do Cliente:</strong> os dados cadastrais e os documentos da empresa atendida, usados para
              prestar o serviço contábil contratado.
            </li>
            <li>
              <strong>Conversas no WhatsApp:</strong> quando você clica em um botão de WhatsApp, a conversa acontece
              no próprio WhatsApp, e usamos o que você enviar só para responder e fazer o orçamento.
            </li>
            <li>
              <strong>Cookies de medição e anúncios:</strong> só se você clicar em “Aceitar” no aviso de cookies.
              Eles registram as páginas visitadas e os cliques nos botões de contato.
            </li>
          </ul>

          <h2>Cookies de terceiros</h2>
          <p>
            Com a sua autorização, o site usa o Pixel da Meta (Facebook e Instagram) e a tag do Google (Google
            Analytics e Google Ads). Essas ferramentas medem as visitas e permitem mostrar nossos anúncios a quem já
            visitou o site (remarketing). Se você clicar em “Recusar”, nada disso é carregado. Para mudar a sua
            escolha, apague os dados deste site no seu navegador e o aviso aparece de novo.
          </p>

          <h2>Com quem os dados são compartilhados</h2>
          <p>
            Não vendemos dados. Eles ficam guardados nos serviços que mantêm o site no ar (hospedagem e banco de
            dados) e, no caso dos cookies aceitos, com a Meta e o Google. Dados de clientes também podem ser
            enviados aos órgãos públicos quando a obrigação contábil ou fiscal exigir.
          </p>

          <h2>Por quanto tempo guardamos</h2>
          <p>
            Recomendações ficam guardadas enquanto estiverem publicadas ou até você pedir a exclusão. Documentos de
            clientes seguem os prazos exigidos pela legislação contábil e fiscal.
          </p>

          <h2>Seus direitos</h2>
          <p>
            Você pode pedir para saber quais dados temos sobre você, corrigi-los ou apagá-los, além de retirar a
            autorização dada. Basta falar com o responsável, Luis Amorim, pelo e-mail{' '}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a> ou pelo WhatsApp {TELEFONE}.
          </p>

          <p style={{ marginTop: 28, fontSize: '0.9em', color: 'var(--texto-suave)' }}>Atualizada em 16 de novembro de 2026.</p>
        </article>
      </main>
      <RodapeSimples />
      <WhatsappFlutuante />
    </>
  )
}
