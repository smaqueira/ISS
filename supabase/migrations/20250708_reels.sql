-- ─── Módulo Reels IA ──────────────────────────────────────────────────────────

create table if not exists reels (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  descripcion   text not null default '',
  producto_id   text,
  producto_nombre text,
  categoria     text not null default 'general',
  objetivo      text not null default 'venta',
  duracion      int,
  estado        text not null default 'borrador',
  plataforma    text not null default 'instagram',
  hashtags      text[] not null default '{}',
  cta           text not null default '',
  thumbnail_url text,
  video_url     text,
  script        jsonb,
  ai_provider   text,
  publicado_at  timestamptz,
  programado_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists reel_jobs (
  id         uuid primary key default gen_random_uuid(),
  reel_id    uuid not null references reels(id) on delete cascade,
  tipo       text not null,
  estado     text not null default 'esperando',
  proveedor  text not null default 'groq',
  input      jsonb,
  output     jsonb,
  error      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reel_publications (
  id               uuid primary key default gen_random_uuid(),
  reel_id          uuid not null references reels(id) on delete cascade,
  plataforma       text not null,
  estado           text not null default 'programado',
  programado_at    timestamptz,
  publicado_at     timestamptz,
  url_publicacion  text,
  error            text,
  created_at       timestamptz not null default now()
);

create table if not exists reel_automation_rules (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  trigger    text not null,
  objetivo   text not null default 'venta',
  plataforma text not null default 'instagram',
  activa     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Índices útiles
create index if not exists reels_estado_idx     on reels(estado);
create index if not exists reels_plataforma_idx on reels(plataforma);
create index if not exists reel_jobs_reel_id_idx on reel_jobs(reel_id);
create index if not exists reel_jobs_estado_idx  on reel_jobs(estado);

-- RLS deshabilitado (igual que el resto del ISS)
alter table reels                  disable row level security;
alter table reel_jobs              disable row level security;
alter table reel_publications      disable row level security;
alter table reel_automation_rules  disable row level security;

-- Reglas de automatización de ejemplo
insert into reel_automation_rules (nombre, trigger, objetivo, plataforma, activa) values
  ('Nuevo producto → Reel de presentación', 'producto_nuevo', 'novedad', 'instagram', false),
  ('Oferta → Reel de promoción', 'producto_oferta', 'oferta', 'todos', false),
  ('Stock alto → Reel de venta', 'stock_alto', 'venta', 'instagram', false)
on conflict do nothing;
