import { NextResponse } from 'next/server'
import { atualizarNotasDeTodos } from '@/lib/nfse'
import { createAdminClient } from '@/lib/supabase/admin'

// Rotina diária da Vercel (vercel.json): baixa do Emissor Nacional as notas novas de todos os clientes
// com certificado, para o gráfico e a prévia ficarem em dia. Só lê; não emite nada.
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request) {
  // Com CRON_SECRET na Vercel, só a rotina (que manda esse segredo) consegue chamar.
  // Sem ele, aceita só a chamada marcada como rotina da Vercel.
  const segredo = process.env.CRON_SECRET
  const autorizado = segredo
    ? request.headers.get('authorization') === `Bearer ${segredo}`
    : /vercel-cron/i.test(request.headers.get('user-agent') || '')
  if (!autorizado) return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })

  const r = await atualizarNotasDeTodos(createAdminClient())
  console.log('Notas atualizadas:', JSON.stringify(r))
  return NextResponse.json(r)
}
