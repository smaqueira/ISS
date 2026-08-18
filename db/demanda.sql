-- BUSCADOR DE DEMANDA IA — esquema
-- Correr en Supabase → SQL Editor → New query → Run.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- QUÉ VENDO (productos / servicios con sus palabras clave)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.demand_products (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  categoria   text,
  descripcion text,
  marcas      text[] not null default '{}',
  variantes   text[] not null default '{}',
  keywords    text[] not null default '{}',   -- langostino, langostinos, camarón…
  sinonimos   text[] not null default '{}',
  precio      numeric,
  disponible  boolean not null default true,
  zona        text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);
create index if not exists demand_products_activo_idx on public.demand_products (activo);

-- ─────────────────────────────────────────────────────────────
-- OPORTUNIDADES detectadas (señal + análisis IA + gestión)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.demand_opportunities (
  id            uuid primary key default gen_random_uuid(),

  -- Señal original (fuente pública)
  fuente        text,          -- google | rss | manual
  url           text,
  titulo        text,
  fragmento     text,          -- extracto para contexto
  publicado_en  timestamptz,

  -- Análisis IA
  producto_id      uuid references public.demand_products(id) on delete set null,
  producto_nombre  text,
  match_pct        integer,    -- 0-100 coincidencia con mi producto
  intencion        text,       -- ninguna | baja | alta | muy_alta
  score            integer,    -- 0-100
  score_detalle    jsonb,      -- desglose del puntaje
  explicacion      text,       -- por qué es oportunidad
  accion           text,       -- acción recomendada

  -- Entidades extraídas (null = "No identificado")
  cantidad        text,
  unidad          text,
  ubicacion       text,
  tipo_comprador  text,
  urgencia        text,
  presupuesto     text,
  necesidad       text,

  -- Gestión
  estado     text not null default 'nueva',  -- nueva|revisada|contactar|contactada|respondio|negociacion|venta|descartada|no_relevante|sin_respuesta|perdida
  feedback   text,                            -- relevante|no_relevante|venta|no_sirve
  hash       text unique,                     -- dedup por url/contenido
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists demand_opp_estado_idx  on public.demand_opportunities (estado);
create index if not exists demand_opp_score_idx   on public.demand_opportunities (score desc);
create index if not exists demand_opp_created_idx on public.demand_opportunities (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- APRENDIZAJE: señales de feedback agregadas (la IA ajusta prioridades)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.demand_learning (
  id         uuid primary key default gen_random_uuid(),
  dimension  text not null,   -- tipo_comprador | ubicacion | producto | fuente
  valor      text not null,   -- restaurante | Tigre | Langostino…
  positivos  integer not null default 0,
  negativos  integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (dimension, valor)
);

-- RLS (el server entra por service_role)
alter table public.demand_products      enable row level security;
alter table public.demand_opportunities enable row level security;
alter table public.demand_learning      enable row level security;
