import { redirect } from 'next/navigation'
import Barra from '@/components/Barra'
import PrimeiroAcesso from '@/components/PrimeiroAcesso'
import { getUsuario, precisaTrocarSenha } from '@/lib/auth'
import { ehSocio } from '@/lib/equipe'

export const metadata = { title: 'Primeiro acesso · Amorins Contábil' }

// Sócio entrando pela primeira vez: cria a senha própria antes de ver qualquer cliente.
export default async function PrimeiroAcessoSocio() {
  const user = await getUsuario()
  if (!user) redirect('/login')
  if (!ehSocio(user) || !precisaTrocarSenha(user)) redirect('/admin')
  return (
    <>
      <Barra titulo="Administração" inicio="/admin" />
      <main className="painel">
        <h1>Primeiro acesso</h1>
        <div className="caixa">
          <PrimeiroAcesso texto="Bem-vindo! Por segurança, crie agora uma senha só sua. A senha inicial deixa de funcionar." />
        </div>
      </main>
    </>
  )
}
