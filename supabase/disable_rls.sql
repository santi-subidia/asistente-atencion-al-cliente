-- Como este es un proyecto de portafolio sin sistema de Login (Autenticación),
-- vamos a deshabilitar las políticas de seguridad a nivel de fila (RLS)
-- para que el backend pueda leer y escribir libremente usando la Anon Key.

ALTER TABLE documentos_rag DISABLE ROW LEVEL SECURITY;
ALTER TABLE turnos DISABLE ROW LEVEL SECURITY;

-- Si tuvieras RLS activado y quisieras dejarlo por seguridad, la alternativa sería:
-- CREATE POLICY "Acceso público" ON documentos_rag FOR ALL USING (true);
-- CREATE POLICY "Acceso público turnos" ON turnos FOR ALL USING (true);
