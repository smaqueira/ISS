-- Community Finder: directorio de comunidades públicas
-- Ejecutar en Supabase → SQL Editor

create table if not exists communities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  link text unique not null,
  platform text not null,          -- whatsapp | telegram | discord | facebook | reddit
  members int,
  categoria text,                  -- asignada por IA, puede crear nuevas
  provincia text,
  ciudad text,
  idioma text default 'es',
  score int,                       -- 0-100 calidad estimada por IA
  status text default 'activo',    -- activo | caido
  source_query text,               -- query que lo descubrió
  discovered_at timestamptz default now(),
  last_checked timestamptz default now()
);

create index if not exists idx_communities_platform on communities (platform);
create index if not exists idx_communities_categoria on communities (categoria);
create index if not exists idx_communities_provincia on communities (provincia);
create index if not exists idx_communities_status on communities (status);
create index if not exists idx_communities_members on communities (members desc nulls last);

-- Búsqueda full-text en español sobre título + descripción
create index if not exists idx_communities_fts on communities
  using gin (to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, '')));
