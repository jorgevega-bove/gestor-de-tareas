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
  // Proyecto de Supabase "bove-backlog" (organización jorgevega-bove)
  supabaseUrl: 'https://jsbossjcemwvcimnytzn.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzYm9zc2pjZW13dmNpbW55dHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwNTE0NzIsImV4cCI6MjExMDYyNzQ3Mn0.-fOodKG9CkUss428ZLlfV-XyuO3FvTwQD0KwETSyPEQ',
  allowedEmailDomain: 'bove.cl', // solo correos @bove.cl pueden entrar
  // Entrar con Google en vez de con un enlace por correo (se activa cuando Google esté conectado en Supabase)
  googleLogin: false,
};
