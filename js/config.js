/*
 * Configuración de la app.
 *
 * Mientras supabaseUrl esté vacío, la app funciona en MODO LOCAL:
 * los datos se guardan solo en este navegador (como hasta ahora).
 *
 * Para pasar al MODO COMPARTIDO (Supabase), completa estos datos.
 * Están en el panel de Supabase › Project Settings › API (o "Data API").
 * Ver SUPABASE.md para el paso a paso.
 *
 * La "anon key" (clave pública) puede ir aquí sin problema: la seguridad
 * la dan los permisos (RLS) de supabase/esquema.sql. NUNCA pongas aquí
 * la "service_role key".
 */
window.APP_CONFIG = {
  supabaseUrl: '',          // ej. 'https://abcdefghijkl.supabase.co'
  supabaseAnonKey: '',      // ej. 'eyJhbGciOi...'
  allowedEmailDomain: '',   // ej. 'empresa.cl' (solo correos de este dominio pueden entrar)
};
