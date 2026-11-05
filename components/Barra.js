import { sair } from '@/app/acoes'

export default function Barra({ titulo, inicio, whatsapp }) {
  return (
    <div className="barra">
      <a href={inicio} className="marca">
        <img src="/logo.png" alt="" />
        Amorins Contábil · {titulo}
      </a>
      <div className="barra-acoes">
        {whatsapp && (
          <a href={whatsapp} className="botao-whats" target="_blank" rel="noreferrer">
            Falar no WhatsApp
          </a>
        )}
        <form action={sair}>
          <button className="link">Sair</button>
        </form>
      </div>
    </div>
  )
}
