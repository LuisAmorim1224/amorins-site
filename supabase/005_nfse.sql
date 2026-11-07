-- Emissão automática de NFS-e pelo Emissor Nacional (gratuito), com o certificado A1 de cada cliente.
-- Rode uma vez no Supabase depois do 004: SQL Editor > New query > colar > Run.

-- Configuração fiscal de cada cliente (só o escritório altera).
alter table public.clientes
  add column if not exists nfse_ativa boolean not null default false,
  add column if not exists nfse_ambiente text not null default 'homologacao'
    check (nfse_ambiente in ('homologacao', 'producao')),
  add column if not exists nfse_emissao_automatica boolean not null default false,
  add column if not exists nfse_municipio text not null default '2927408', -- IBGE de Salvador/BA
  add column if not exists nfse_inscricao_municipal text,
  add column if not exists nfse_op_simples text not null default '3'
    check (nfse_op_simples in ('1', '2', '3')), -- 1 não optante, 2 MEI, 3 ME/EPP
  add column if not exists nfse_reg_esp_trib text not null default '0',
  add column if not exists nfse_aliquota_sn numeric(5, 2), -- % aproximado do Simples (obrigatório para ME/EPP)
  add column if not exists nfse_serie text not null default '1',
  add column if not exists nfse_ultimo_ndps bigint not null default 0,
  add column if not exists nfse_ultimo_nsu bigint not null default 0,
  add column if not exists certificado_caminho text,
  add column if not exists certificado_senha text, -- cifrada com NFSE_CHAVE_CERTIFICADOS
  add column if not exists certificado_validade date,
  add column if not exists certificado_titular text;

-- Próximo número da DPS, sem risco de repetir mesmo com dois pedidos ao mesmo tempo.
create or replace function public.proximo_ndps(p_cliente uuid)
returns bigint
language sql
security definer
set search_path = public
as $$
  update public.clientes set nfse_ultimo_ndps = nfse_ultimo_ndps + 1
  where id = p_cliente
  returning nfse_ultimo_ndps;
$$;
revoke all on function public.proximo_ndps(uuid) from public, anon, authenticated;

-- Serviços que cada cliente fatura (ex.: M3 = bombeamento de concreto + marketing).
create table if not exists public.servicos_nota (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nome text not null,
  cod_trib_nac text not null check (cod_trib_nac ~ '^\d{6}$'),
  cod_trib_mun text,
  cod_nbs text check (cod_nbs is null or cod_nbs ~ '^\d{9}$'),
  exige_obra boolean not null default false,
  retem_iss_tomador_pj boolean not null default false,
  aliquota_iss numeric(5, 2),
  palavras_chave text,
  criado_em timestamptz not null default now(),
  unique (cliente_id, cod_trib_nac)
);
alter table public.servicos_nota enable row level security; -- só o servidor (service role) lê

-- Notas anteriores do cliente (do portal ou baixadas do Emissor Nacional): base para
-- escolher o código de serviço repetindo o que já foi usado em descrições parecidas.
create table if not exists public.historico_notas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  chave_acesso text unique,
  numero text,
  data_emissao date,
  descricao text not null,
  cod_trib_nac text not null,
  cod_nbs text,
  valor numeric(14, 2),
  tomador text,
  origem text not null default 'portal' check (origem in ('portal', 'emissor_nacional', 'manual')),
  criado_em timestamptz not null default now()
);
create index if not exists historico_notas_cliente_idx on public.historico_notas (cliente_id, data_emissao desc);
alter table public.historico_notas enable row level security;

-- Pedidos de nota: serviço escolhido, local da obra e resultado da emissão.
alter table public.pedidos_nota
  add column if not exists servico_id uuid references public.servicos_nota (id) on delete set null,
  add column if not exists motivo_servico text,
  add column if not exists obra_cep text,
  add column if not exists obra_logradouro text,
  add column if not exists obra_numero text,
  add column if not exists obra_bairro text,
  add column if not exists n_dps bigint,
  add column if not exists chave_acesso text,
  add column if not exists erro_emissao text;

alter table public.pedidos_nota drop constraint if exists pedidos_nota_status_check;
alter table public.pedidos_nota add constraint pedidos_nota_status_check
  check (status in ('pendente', 'escolher_servico', 'erro', 'emitida', 'cancelada'));

alter table public.notas_emitidas
  add column if not exists chave_acesso text,
  add column if not exists caminho_xml text;

-- Pasta privada só para os certificados (nunca visível ao cliente).
insert into storage.buckets (id, name, public)
values ('certificados', 'certificados', false)
on conflict (id) do nothing;
