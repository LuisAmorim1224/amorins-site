-- Ficha cadastral completa do cliente: dados da empresa, sócios e tipo/validade dos documentos.
-- Rode uma vez no Supabase depois do schema.sql: SQL Editor > New query > colar > Run.
-- Pode rodar de novo sem problema: nada é apagado.

-- Dados da empresa (ficam no próprio cadastro do cliente, um para um).
alter table public.clientes
  add column if not exists razao_social text,
  add column if not exists nome_fantasia text,
  add column if not exists natureza_juridica text,
  add column if not exists porte text,
  add column if not exists regime_tributario text,
  add column if not exists data_abertura date,
  add column if not exists situacao_cadastral text,
  add column if not exists data_situacao_cadastral date,
  add column if not exists cnae_principal jsonb,
  add column if not exists cnaes_secundarios jsonb not null default '[]'::jsonb,
  add column if not exists endereco jsonb,
  add column if not exists capital_social numeric(14, 2),
  add column if not exists nire text,
  add column if not exists email_receita text,
  add column if not exists telefone_receita text,
  add column if not exists pendencias jsonb not null default '[]'::jsonb,
  add column if not exists dados_receita_em timestamptz;

-- Sócios / responsáveis.
create table if not exists public.socios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nome text not null,
  cpf text,
  rg text,
  data_nascimento date,
  qualificacao text,
  participacao numeric(5, 2),
  administrador boolean not null default false,
  profissao text,
  registro_profissional text,
  criado_em timestamptz not null default now()
);

create index if not exists socios_cliente_idx on public.socios (cliente_id);

alter table public.socios enable row level security;

drop policy if exists "cliente ve os proprios socios" on public.socios;
create policy "cliente ve os proprios socios" on public.socios
  for select using (auth.uid() = cliente_id);

-- Tipo e validade de cada arquivo enviado para a pasta do cliente.
create table if not exists public.documentos_info (
  caminho text primary key,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  tipo text not null default 'outro',
  validade date,
  criado_em timestamptz not null default now()
);

create index if not exists documentos_info_cliente_idx on public.documentos_info (cliente_id);

alter table public.documentos_info enable row level security;

drop policy if exists "cliente ve as informacoes dos proprios documentos" on public.documentos_info;
create policy "cliente ve as informacoes dos proprios documentos" on public.documentos_info
  for select using (auth.uid() = cliente_id);
