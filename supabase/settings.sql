create table settings (
  key text primary key,
  value text not null,
  label text,
  updated_at timestamptz default now()
);

insert into settings (key, value, label) values
  ('GROQ_API_KEY_1',       '', 'Groq API Key 1'),
  ('GROQ_API_KEY_2',       '', 'Groq API Key 2'),
  ('GROQ_API_KEY_3',       '', 'Groq API Key 3'),
  ('GROQ_API_KEY_4',       '', 'Groq API Key 4'),
  ('RESEND_API_KEY',       '', 'Resend API Key'),
  ('RESEND_FROM_EMAIL',    '', 'Email de envío'),
  ('ADMIN_EMAIL',          '', 'Tu email para alertas'),
  ('TELEGRAM_BOT_TOKEN',   '', 'Telegram Bot Token'),
  ('TELEGRAM_CHAT_ID',     '', 'Telegram Chat ID'),
  ('SERPER_API_KEY_1',      '', 'Serper API Key 1'),
  ('SERPER_API_KEY_2',      '', 'Serper API Key 2'),
  ('SERPER_API_KEY_3',      '', 'Serper API Key 3'),
  ('COMPANY_NAME',         'Intelligent Sales System', 'Nombre del sistema'),
  ('COMPANY_WHATSAPP',     '', 'WhatsApp del negocio');
