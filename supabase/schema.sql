-- CLIENTS
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text check (type in ('b2b','b2c')) not null,
  rubro text,
  phone text,
  email text,
  city text,
  instagram text,
  website text,
  status text check (status in ('nuevo','contactado','interesado','cliente','inactivo')) default 'nuevo',
  score integer default 50,
  channel text check (channel in ('whatsapp','email','telefono','instagram','web')),
  notes text,
  tags text[],
  last_contact timestamptz,
  next_followup timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PRODUCTS
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price_retail numeric not null,
  price_wholesale numeric not null,
  unit text default 'kg',
  stock numeric,
  image_url text,
  active boolean default true,
  created_at timestamptz default now()
);

-- ORDERS
create table orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  type text check (type in ('b2b','b2c')) not null,
  status text check (status in ('pendiente','confirmado','preparacion','enviado','entregado')) default 'pendiente',
  total numeric default 0,
  delivery_date date,
  delivery_address text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ORDER ITEMS
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  qty numeric not null,
  unit_price numeric not null,
  subtotal numeric not null
);

-- INTERACTIONS (todo queda registrado acá)
create table interactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  channel text check (channel in ('whatsapp','email','telefono','instagram','web','sistema')),
  type text not null,
  notes text not null,
  ai_generated boolean default false,
  created_at timestamptz default now()
);

-- DAILY TASKS (tareas generadas por la IA)
create table daily_tasks (
  id text primary key,
  priority text check (priority in ('urgente','importante','rutina')) not null,
  title text not null,
  description text not null,
  client_id uuid references clients(id) on delete set null,
  client_name text,
  action text not null,
  payload jsonb,
  done boolean default false,
  date date default current_date,
  created_at timestamptz default now()
);

-- Trigger: updated_at automático
create or replace function set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger clients_updated_at before update on clients for each row execute function set_updated_at();
create trigger orders_updated_at before update on orders for each row execute function set_updated_at();
