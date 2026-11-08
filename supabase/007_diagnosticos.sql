-- Diagnóstico online de regularização de CNPJ (página /regularizar).
-- Rode uma vez no Supabase depois do 006: SQL Editor > New query > colar > Run.

-- Cada pedido de diagnóstico completo feito pelo site.
create table if not exists public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,                 -- link secreto que o visitante usa para acompanhar
  cnpj text not null check (cnpj ~ '^[0-9]{14}$'),
  razao_social text,
  dados_publicos jsonb,                       -- resposta da Receita (BrasilAPI) no momento do pedido
  alertas jsonb,                              -- diagnóstico parcial mostrado ao visitante
  nome text not null check (char_length(nome) between 2 and 80),
  whatsapp text not null check (char_length(whatsapp) between 10 and 20),
  email text check (email is null or char_length(email) <= 120),
  consentimento_em timestamptz not null,      -- aceite da LGPD
  status text not null default 'aguardando_procuracao'
    check (status in ('aguardando_procuracao', 'relatorio_pronto', 'erro', 'concluido')),
  tentativas smallint not null default 0,     -- consultas pagas ao Serpro (limitadas)
  ultima_tentativa_em timestamptz,
  erro text,
  relatorio_caminho text,                     -- PDF na pasta privada "diagnosticos"
  resumo jsonb,                               -- pendências encontradas no relatório
  valor numeric(10, 2),                       -- orçamento (tabela de preços ou definido pelo escritório)
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists diagnosticos_criado on public.diagnosticos (criado_em desc);

-- Preço por tipo de pendência, preenchido pelo escritório no /admin. Sem preço = orçamento manual.
create table if not exists public.precos_regularizacao (
  tipo text primary key
    check (tipo in ('omissao', 'debito', 'divida_ativa', 'parcelamento', 'processo', 'outra')),
  valor numeric(10, 2) check (valor is null or valor >= 0),
  por_item boolean not null default false     -- omissões: cobrar por declaração em atraso
);

-- Sem políticas: só o servidor (service role) lê e grava.
alter table public.diagnosticos enable row level security;
alter table public.precos_regularizacao enable row level security;

-- Pasta privada para os PDFs dos relatórios.
insert into storage.buckets (id, name, public)
values ('diagnosticos', 'diagnosticos', false)
on conflict (id) do nothing;
