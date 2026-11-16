-- Foto do cliente nas recomendações do site (o escritório sobe no /admin).
-- Rode uma vez no Supabase: SQL Editor > New query > colar > Run.
-- Se o 006_recomendacoes.sql ainda não foi rodado, rode ele antes.

alter table public.recomendacoes add column if not exists foto text;

-- Pasta pública: as fotos aparecem no site. Só o servidor (service role) grava.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-recomendacoes', 'fotos-recomendacoes', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
