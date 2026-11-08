import FormDiagnostico from '@/components/site/FormDiagnostico'
import TopoSimples from '@/components/site/TopoSimples'
import { linkWhatsapp } from '@/lib/contato'

export const metadata = {
  title: 'Diagnóstico grátis do CNPJ · Amorins Contábil',
  description:
    'Digite o CNPJ e veja na hora a situação da empresa na Receita Federal. Diagnóstico completo de débitos e declarações em atraso com a Amorins Contábil.',
}

export default function Regularizar() {
  return (
    <>
      <TopoSimples />
      <section className="hero fundo-grade diag-hero">
        <div className="conteudo">
          <div>
            <span className="selo">Regularização de CNPJ · Diagnóstico grátis</span>
            <h1>
              Descubra em segundos a <em>situação</em> do seu CNPJ.
            </h1>
            <p className="sub">
              Digite o CNPJ e veja o que a Receita Federal mostra sobre a sua empresa. Se quiser, seguimos para o
              diagnóstico completo, com débitos, declarações em atraso e o valor para regularizar.
            </p>
          </div>
        </div>
      </section>
      <section className="secao">
        <div className="conteudo">
          <FormDiagnostico />
          <div className="diag-como">
            <h2>Como funciona</h2>
            <ol>
              <li><strong>Diagnóstico parcial, na hora:</strong> situação cadastral, Simples Nacional ou MEI, atividade e alertas, com os dados públicos da Receita.</li>
              <li><strong>Diagnóstico completo:</strong> você autoriza e a Amorins Contábil puxa o Relatório de Situação Fiscal da Receita e da PGFN.</li>
              <li><strong>Plano e valor:</strong> você vê o que precisa ser feito e quanto custa antes de contratar.</li>
            </ol>
            <p>
              Prefere conversar? <a href={linkWhatsapp('Olá! Quero regularizar meu CNPJ. Pode me ajudar?')} target="_blank" rel="noreferrer">Chame no WhatsApp</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
