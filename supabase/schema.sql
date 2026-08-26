-- 1. Habilitar la extensión pgvector para nuestra Base de Datos Vectorial
create extension if not exists vector;

-- 2. Crear tabla de Documentos RAG
create table if not exists documentos_rag (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  contenido text not null,
  -- text-embedding-3-small de OpenAI usa 1536 dimensiones, pero si usamos Gemini (text-embedding-004) usa 768 dimensiones.
  -- Usaremos 768 ya que usaremos la API gratuita de Google Gemini.
  embedding vector(768)
);

-- 3. Crear tabla de Turnos Médicos/Odontológicos
create table if not exists turnos (
  id uuid primary key default gen_random_uuid(),
  nombre_paciente text not null,
  -- Guardaremos la fecha y la hora separadas para facilitar las consultas del asistente
  fecha date not null,
  hora time not null,
  tratamiento text not null,
  estado text not null check (estado in ('agendado', 'cancelado', 'completado')) default 'agendado',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Evitar que se superpongan turnos (misma fecha y misma hora) para turnos agendados
create unique index on turnos (fecha, hora) where estado = 'agendado';

-- 4. Función RPC para realizar la búsqueda vectorial por similitud (Cosine Similarity)
-- Esta función será llamada desde el código de Next.js mediante el SDK de Supabase
create or replace function match_documentos (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  titulo text,
  contenido text,
  similarity float
)
language sql stable
as $$
  select
    documentos_rag.id,
    documentos_rag.titulo,
    documentos_rag.contenido,
    1 - (documentos_rag.embedding <=> query_embedding) as similarity
  from documentos_rag
  where 1 - (documentos_rag.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
