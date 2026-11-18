# Pasar el gestor de tareas a Supabase

Esta guía explica cómo pasar la app del **modo local** (datos solo en el navegador de cada computador) al **modo compartido** (datos en Supabase, compartidos por todo el equipo).

Todo el código ya está preparado. Solo faltan los datos de la cuenta de Supabase de la empresa.

---

## Qué está preparado

| Archivo | Para qué sirve |
|---|---|
| `supabase/esquema.sql` | Crea las tablas, los permisos, el espacio para archivos adjuntos y el tiempo real. Se ejecuta una vez en Supabase. |
| `js/config.js` | Aquí van la URL y la clave de Supabase. **Mientras esté vacío, la app sigue en modo local.** |
| `js/db.supabase.js` | Hace que la app guarde y lea todo desde Supabase. No hay que tocarlo. |

En modo compartido la app agrega:

- **Inicio de sesión** con el correo de la empresa. Llega un código al correo y se escribe en la app; no hay contraseñas.
- **Vínculo con una persona:** la primera vez que alguien entra, elige su nombre (por ejemplo, "Jorge") o se crea uno nuevo.
- **Cambios de otros en vivo:** si Francisco cambia algo, aparece solo en la pantalla de Ulises.
- **Archivos adjuntos en Supabase Storage,** privados y visibles solo para el equipo.

Diferencias con el modo local:

- **Deshacer y rehacer (⌘Z / ⌘Y) no están disponibles.** Con varias personas editando, deshacer de golpe podría borrar cambios de otros. Queda como mejora futura.
- **"Restablecer datos de ejemplo" no aparece,** para no borrar por accidente los datos de la empresa.

---

## Qué pedir en la empresa

- [ ] **Acceso a la cuenta (organización) de Supabase** de la empresa, con permiso para crear un proyecto.
- [ ] **Aprobación del plan.** El gratuito sirve para probar, pero **se pausa tras una semana sin uso** y limita los archivos. Para uso real conviene el plan **Pro** (unos 25 USD al mes).
- [ ] **El dominio del correo de la empresa**, por ejemplo `empresa.cl`. Solo esos correos podrán entrar.
- [ ] **Datos de un servidor de correo (SMTP)** para enviar los códigos de inicio de sesión: servidor, puerto, usuario y contraseña. Puede ser el de Google Workspace o Microsoft 365 de la empresa, o un servicio como Resend o SendGrid. Ver el paso 3.
- [ ] (Opcional) **Dónde publicar la app** para el equipo. Ver el paso 7.

---

## Paso a paso

### 1. Descargar un respaldo de los datos actuales (antes de todo)

Con la app todavía en modo local, ve a **Jorge › Configuración › Descargar respaldo**. Guarda el archivo `bove-respaldo-AAAA-MM-DD.json`. Es lo que se sube a Supabase en el paso 6.

> Hazlo **antes** de llenar `config.js`. Después, la app ya no lee los datos locales.

### 2. Crear el proyecto y la base de datos

1. En [supabase.com](https://supabase.com), dentro de la organización de la empresa, crea un **New project**.
   - **Nombre:** por ejemplo, "Gestor de tareas BOVE".
   - **Región:** la más cercana a Chile, **South America (São Paulo)**.
   - **Contraseña de la base de datos:** guárdala en un lugar seguro. La app no la usa.
2. Cuando el proyecto esté listo, abre **SQL Editor › New query**.
3. Abre el archivo `supabase/esquema.sql`, copia todo y pégalo.
4. Antes de ejecutar, busca `'empresa.cl'` y cámbialo por el dominio real de la empresa.
5. Presiona **Run**. Debe terminar sin errores. Si lo ejecutas dos veces no pasa nada.

### 3. Configurar el correo con el código para entrar

**a) Plantilla del correo.** En **Authentication › Emails › Templates**, abre la plantilla **Magic Link** y reemplázala por algo así (lo importante es `{{ .Token }}`):

- Asunto: `Tu código para entrar al Gestor de tareas`
- Mensaje:

```html
<h2>Gestor de tareas · BOVE</h2>
<p>Tu código para entrar es:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>Si no lo pediste, ignora este correo.</p>
```

**b) Servidor de correo propio (SMTP).** En **Authentication › Emails › SMTP Settings**, activa **Custom SMTP** y completa los datos que te dio la empresa.

> Sin este paso, el correo que trae Supabase **solo llega a los miembros del equipo del proyecto en Supabase** y permite **unos 2 correos por hora**. Sirve para una primera prueba, pero no para el equipo.

**c) (Opcional)** En **Authentication › Sign In / Providers › Email** puedes ajustar cuánto dura el código. Por defecto dura 1 hora.

### 4. Conectar la app con el proyecto

1. En Supabase, ve a **Project Settings › API**. En versiones nuevas puede decir **API Keys** o **Data API**.
2. Copia la **Project URL**, que se ve como `https://abcdefghijkl.supabase.co`.
3. Copia la clave pública: **anon / public**, o **publishable key** en versiones nuevas.
4. Abre `js/config.js` y complétalo:

```js
window.APP_CONFIG = {
  supabaseUrl: 'https://abcdefghijkl.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...',
  allowedEmailDomain: 'empresa.cl',
};
```

> La clave pública puede estar en el código sin problema: la seguridad la dan los permisos de la base de datos. **Nunca** pongas aquí la clave **service_role** o **secret**.

### 5. Entrar por primera vez

1. Abre `index.html` (o recarga la página).
2. Escribe tu correo de la empresa y presiona **Enviar código**.
3. Escribe el código que llegó al correo.
4. En **¿Quién eres?**, crea tu persona ("Jorge"). La app crea un primer proyecto llamado **General**.

### 6. Subir los datos que tenías en modo local

1. Ve a **Jorge › Configuración › Restaurar respaldo** y elige el archivo del paso 1.
2. Confirma. Se cargan proyectos, tareas, responsables, dependencias, comentarios, archivos adjuntos y la bitácora.
   - El proyecto "General" se reemplaza por los tuyos.
   - Tu cuenta queda vinculada con "Jorge" (por el mismo ID).

> Restaurar un respaldo **reemplaza** proyectos y tareas en Supabase. Úsalo para la migración inicial, no con el equipo ya trabajando.

### 7. Publicar la app para el equipo

Puedes probar abriendo `index.html` desde tu computador, pero para el equipo conviene publicarla en una dirección web. Algunas opciones gratuitas o baratas, que se conectan directo con el repositorio de GitHub:

- **Netlify** o **Vercel:** "Import from GitHub", eliges `gestor-de-tareas` y listo. Cada commit se publica solo.
- **GitHub Pages:** para un repositorio privado requiere un plan pagado de GitHub.

Después, cada persona entra a esa dirección con su correo y, la primera vez, elige su nombre (por ejemplo, "Francisco" o "Ulises").

---

## Cómo viajan los datos

La app está pensada para que cada acción cueste lo mismo aunque se acumulen miles de tareas (idea tomada de planner7):

- **Al entrar** se descargan personas, proyectos y tareas una sola vez y se guarda una foto de lo último sincronizado.
- **Al guardar** se compara contra esa foto: viaja solo el campo que cambió (por ejemplo, la prioridad de una tarea), sin volver a leer nada antes. Si cambian varias tareas a la vez (reordenar, selección múltiple), se envían juntas en un solo lote. De responsables y dependencias se envía solo lo que se agregó o quitó.
- **Cambios de otras personas**: llegan en tiempo real fila por fila y se aplican a la foto. No se vuelve a descargar todo.
- **Comentarios y archivos** se piden solo al abrir una tarea.
- **Si un envío falla** se reintenta 3 veces. Si aun así no se puede, la app avisa y vuelve a descargar los datos para no quedar distinta de la nube.

A diferencia de planner7 (que guarda los hábitos como un documento por persona), aquí cada tarea es una fila con sus columnas: así dos personas pueden editar campos distintos de la misma tarea al mismo tiempo sin pisarse.

## Volver al modo local

Deja vacíos `supabaseUrl` y `supabaseAnonKey` en `js/config.js` y recarga. La app vuelve a usar los datos guardados en el navegador. Los datos de Supabase no se tocan.

---

## Si algo no funciona

| Síntoma | Causa probable |
|---|---|
| "Email address not authorized" al pedir el código | Falta configurar el SMTP propio (paso 3b). |
| No llega el código | Revisa spam. Supabase permite pedir un código cada 60 segundos. Revisa los datos del SMTP. |
| Entra, pero no se ve nada o aparece un error de permisos | El dominio en `app_config` no coincide con el correo. En el SQL Editor: `update public.app_config set value = 'empresa.cl' where key = 'dominio_correo';` |
| La página queda en blanco | Revisa que la URL y la clave de `config.js` estén bien copiadas, entre comillas. |
| Los cambios de otros no aparecen solos | Revisa que el paso 2 terminara sin errores (incluye el tiempo real). Recargar la página siempre trae lo último. |

---

## Nota sobre las pruebas

- El esquema SQL se probó en una base Postgres: se puede ejecutar dos veces, rechaza datos inválidos, deja entrar solo correos del dominio configurado y borra en cascada.
- La app en modo compartido se probó de punta a punta con un **Supabase simulado**: inicio de sesión, vínculo de cuenta, restauración del respaldo con adjuntos, crear, editar y borrar tareas, comentarios, archivos, bitácora y cambios en vivo.
- La primera vez con el proyecto real conviene revisar con calma que todo funcione igual.
