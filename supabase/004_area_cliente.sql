-- Área do Cliente: envio de documentos pelo cliente, pedidos de nota fiscal,
-- notas emitidas e anexo do Simples para a prévia de impostos.
-- Rode uma vez no Supabase depois do 003: SQL Editor > New query > colar > Run.

-- Quem enviou o documento: o escritório ou o próprio cliente.
alter table public.documentos_info
  add column if not exists origem text not null default 'escritorio';

-- Anexo do Simples (I a V) usado na prévia do DAS. Definido pelo escritório.
alter table public.clientes
  add column if not exists anexo_simples text check (anexo_simples in ('I', 'II', 'III', 'IV', 'V'));

-- Pedidos de nota fiscal feitos pelo cliente. O escritório emite e marca como emitida.
create table if not exists public.pedidos_nota (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  tomador_documento text not null,
  tomador_nome text not null,
  tomador_email text,
  tomador_endereco text,
  descricao text not null,
  valor numeric(14, 2) not null check (valor > 0),
  data_desejada date,
  iss_retido boolean not null default false,
  observacoes text,
  status text not null default 'pendente' check (status in ('pendente', 'emitida', 'cancelada')),
  numero_nota text,
  resposta text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists pedidos_nota_cliente_idx on public.pedidos_nota (cliente_id, criado_em desc);
alter table public.pedidos_nota enable row level security;
drop policy if exists "cliente ve os proprios pedidos de nota" on public.pedidos_nota;
create policy "cliente ve os proprios pedidos de nota" on public.pedidos_nota
  for select using (auth.uid() = cliente_id and public.senha_liberada());

-- Notas fiscais já emitidas (base da prévia do Simples e do limite do MEI).
create table if not exists public.notas_emitidas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  numero text,
  data_emissao date not null,
  valor numeric(14, 2) not null check (valor > 0),
  tomador text,
  caminho_arquivo text,
  pedido_id uuid references public.pedidos_nota (id) on delete set null,
  lancada_por text not null default 'cliente',
  criado_em timestamptz not null default now()
);
create index if not exists notas_emitidas_cliente_idx on public.notas_emitidas (cliente_id, data_emissao desc);
alter table public.notas_emitidas enable row level security;
drop policy if exists "cliente ve as proprias notas" on public.notas_emitidas;
create policy "cliente ve as proprias notas" on public.notas_emitidas
  for select using (auth.uid() = cliente_id and public.senha_liberada());
