-- Reglas de automatización de DMs
create table if not exists instagram_triggers (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('dm_keyword', 'comment_keyword', 'welcome', 'story_mention')),
  keyword text,                        -- palabra clave que lo activa (null para welcome/story)
  keyword_match text default 'contains' check (keyword_match in ('exact', 'contains', 'starts_with')),
  response_message text not null,      -- mensaje DM a enviar
  also_reply_comment boolean default false,  -- para comment triggers: también responder públicamente
  comment_reply_text text,             -- texto de la respuesta pública al comentario
  active boolean default true,
  sent_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Historial de conversaciones (para no mandar welcome dos veces)
create table if not exists instagram_conversations (
  id uuid primary key default gen_random_uuid(),
  instagram_user_id text unique not null,
  username text,
  welcome_sent boolean default false,
  last_dm_at timestamptz,
  dm_count integer default 0,
  created_at timestamptz default now()
);

-- Log de DMs enviados
create table if not exists instagram_dm_logs (
  id uuid primary key default gen_random_uuid(),
  trigger_id uuid references instagram_triggers(id),
  instagram_user_id text not null,
  username text,
  trigger_type text not null,
  trigger_text text,        -- el mensaje/comentario que lo activó
  response_sent text not null,
  success boolean default true,
  error_msg text,
  sent_at timestamptz default now()
);

alter table instagram_triggers disable row level security;
alter table instagram_conversations disable row level security;
alter table instagram_dm_logs disable row level security;

-- Trigger de bienvenida por defecto
insert into instagram_triggers (type, response_message, active) values (
  'welcome',
  '¡Hola! 👋 Gracias por escribirnos. Somos Vitto Mare — mariscos y pescados frescos en Buenos Aires 🐟

¿En qué te puedo ayudar?

• Ver el catálogo → mandame "CATÁLOGO"
• Precios → mandame "PRECIOS"
• Zona de entrega → mandame "ENVÍO"
• Hablar con alguien → https://wa.me/5491100000000',
  true
) on conflict do nothing;
