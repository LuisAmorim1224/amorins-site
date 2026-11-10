-- Guias para pagamento: marca de paga em cada guia (documento do tipo "guia").
-- Rode uma vez no Supabase: SQL Editor > New query > colar > Run.

alter table public.documentos_info
  add column if not exists paga boolean not null default false,
  add column if not exists paga_em timestamptz;
