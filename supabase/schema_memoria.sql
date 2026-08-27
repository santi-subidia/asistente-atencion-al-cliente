-- Tabla para persistir las sesiones de chat
CREATE TABLE IF NOT EXISTS sesiones_chat (
  session_id text PRIMARY KEY,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Deshabilitar RLS para acceso anónimo (solo para propósitos de portafolio)
ALTER TABLE sesiones_chat DISABLE ROW LEVEL SECURITY;
