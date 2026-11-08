import { NextResponse } from 'next/server'
import { exigirAdmin } from '@/lib/auth'
import { PASTA_DIAGNOSTICOS } from '@/lib/diagnosticos'
import { createAdminClient } from '@/lib/supabase/admin'

// Abre o PDF do relatório de situação fiscal (só para o escritório).
export async function GET(_req, { params }) {
  await exigirAdmin()
  const { id } = await params
  const supabase = createAdminClient()
  const { data: diag } = await supabase.from('diagnosticos').select('relatorio_caminho').eq('id', id).maybeSingle()
  if (!diag?.relatorio_caminho) return new NextResponse('Relatório não encontrado.', { status: 404 })
  const { data, error } = await supabase.storage.from(PASTA_DIAGNOSTICOS).createSignedUrl(diag.relatorio_caminho, 120)
  if (error) return new NextResponse(error.message, { status: 500 })
  return NextResponse.redirect(data.signedUrl)
}
