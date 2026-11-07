-- Recomendações deixadas no site por quem já foi atendido.
-- Rode uma vez no Supabase depois do 005: SQL Editor > New query > colar > Run.
-- Nada aparece no site sem aprovação do escritório (painel /admin).

create table if not exists public.recomendacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 80),
  empresa text check (empresa is null or char_length(empresa) <= 80),
  cidade text check (cidade is null or char_length(cidade) <= 60),
  texto text not null check (char_length(texto) between 20 and 800),
  nota smallint check (nota between 1 and 5),
  contato text check (contato is null or char_length(contato) <= 120), -- só o escritório vê
  aprovado boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists recomendacoes_aprovadas on public.recomendacoes (aprovado, criado_em desc);

-- Sem políticas: só o servidor (service role) lê e grava. O formulário passa pelo servidor.
alter table public.recomendacoes enable row level security;
