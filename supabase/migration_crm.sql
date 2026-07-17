-- ============================================================
-- Migración CRM — Módulo de Clientes
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Ampliar constraint de status (agregar nuevos valores)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (status IN (
  'prospecto', 'contactado', 'sin_respuesta', 'respondio',
  'interesado', 'negociacion', 'presupuesto_enviado', 'esperando_respuesta',
  'cliente', 'cliente_recurrente', 'no_interesado', 'perdido',
  'nuevo', 'inactivo'  -- legacy, compatibilidad con datos existentes
));

-- 2. Nuevas columnas en clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS fecha_primer_contacto    date,
  ADD COLUMN IF NOT EXISTS proxima_accion           text,
  ADD COLUMN IF NOT EXISTS prioridad                text CHECK (prioridad IN ('alta','media','baja')),
  ADD COLUMN IF NOT EXISTS temperatura              text CHECK (temperatura IN ('frio','tibio','caliente')),
  ADD COLUMN IF NOT EXISTS probabilidad_cierre      integer CHECK (probabilidad_cierre >= 0 AND probabilidad_cierre <= 100),
  ADD COLUMN IF NOT EXISTS productos_interes        text,
  ADD COLUMN IF NOT EXISTS proveedor_actual         text,
  ADD COLUMN IF NOT EXISTS presupuesto_estimado     numeric,
  ADD COLUMN IF NOT EXISTS motivo_perdida           text,
  ADD COLUMN IF NOT EXISTS observaciones            text;

-- 3. Tabla de historial cronológico
CREATE TABLE IF NOT EXISTS client_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fecha       timestamptz NOT NULL DEFAULT now(),
  usuario     text        NOT NULL DEFAULT 'sistema',
  accion      text        NOT NULL,
  detalle     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_history_client_id ON client_history(client_id);
CREATE INDEX IF NOT EXISTS idx_client_history_fecha     ON client_history(fecha DESC);

-- 4. RLS para client_history (igual que clients)
ALTER TABLE client_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "allow_all_client_history" ON client_history FOR ALL USING (true) WITH CHECK (true);

-- Listo.
