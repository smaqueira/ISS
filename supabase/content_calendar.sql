create table if not exists content_calendar (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  dia_semana text not null,
  dia_num integer not null,
  audiencia text not null,
  canal text not null,
  tipo text not null,
  hora text not null,
  razon text,
  tematica text not null,
  hook text,
  cta text,
  notas text,
  status text default 'pendiente' check (status in ('pendiente', 'publicado', 'saltado')),
  created_at timestamptz default now()
);

alter table content_calendar disable row level security;
