-- Arquivos do mês: mês de referência (competência) de cada arquivo enviado pelo escritório.
-- Os arquivos com competência aparecem na Área do Cliente separados por mês.
-- Rode uma vez no Supabase: SQL Editor > New query > colar > Run.

alter table public.documentos_info
  add column if not exists competencia text check (competencia ~ '^\d{4}-(0[1-9]|1[0-2])$');

create index if not exists documentos_info_competencia_idx
  on public.documentos_info (cliente_id, competencia desc);
