# Plan de pruebas · Gestor de tareas BOVE

Equipo pequeño (3 personas, hasta 5 en unos meses) que usa la app todos los días y hace varios cambios diarios. El objetivo es encontrar lo que afecte el uso diario: datos que se pierdan, cambios que no aparezcan, acciones bloqueadas por error o permitidas cuando no deberían.

## Cómo se prueba

- **Un solo ambiente.** La app publicada (bove-backlog.vercel.app) con su base de datos de Supabase. Mientras no haya datos reales se puede probar libremente; cuando los haya, las pruebas se hacen en un proyecto **"Pruebas"** que se borra al terminar.
- **Cuentas de prueba.** Se crean 2 o 3 cuentas falsas directamente en Supabase (por ejemplo `prueba1@bove.cl`, `prueba2@bove.cl`) con una contraseña larga y aleatoria. No reciben correos: entran por contraseña, y solo desde los scripts de prueba. Se borran al terminar cada ronda para no dejar puertas abiertas.
- **Pruebas automáticas, guardadas en el repositorio** (carpeta `tests/`), para repetirlas en minutos después de cada cambio:
  - **Interfaz:** un navegador automático recorre la app como lo haría una persona.
  - **Base de datos:** scripts SQL que simulan a cada persona y comprueban qué acepta y qué rechaza Supabase. Corren dentro de una transacción que se deshace, así que no dejan datos.
- **Sesión con el equipo (unos 20 minutos).** Una lista corta para lo que solo se puede comprobar con personas y dispositivos reales: correos, celulares y uso simultáneo de verdad.
- **Respaldos:** manuales, con Exportar antes de cada ronda de pruebas y periódicamente (Configuración › Exportar).

## Pruebas por área (en orden de prioridad)

### 1. Entrar a la app
- El enlace llega al correo (revisar Spam), viene con el diseño de BOVE y lleva directo a la app.
- Un enlace ya usado o vencido muestra un mensaje claro y permite pedir otro.
- Revisar si el antivirus del correo "gasta" el enlace antes de que la persona lo abra (se vio un "enlace inválido" el 19/11).
- Solo entran correos @bove.cl; otros dominios se rechazan con un mensaje entendible.
- La primera vez, la cuenta se vincula con la persona correcta (o se crea una nueva).
- La sesión se mantiene al cerrar y abrir el navegador; cerrar sesión funciona.
- Si la sesión vence mientras se usa la app, se pide entrar de nuevo sin perder lo que se estaba escribiendo.

### 2. El trabajo diario
- Crear tareas (botón, fila nueva, tecla N) y escribir el título en la misma fila.
- Editar cada campo desde la tabla y desde el panel: título, estado, responsables, prioridad, fecha (con y sin hora), proyecto y descripción.
- Eliminar una tarea (pide confirmación) y eliminar varias a la vez.
- Reordenar filas arrastrando y mover tarjetas entre columnas del Kanban.
- Dependencias: "Depende de" y "Condiciona a", cambio automático a "En espera" y de vuelta a "No completada" cuando terminan.
- Proyectos: crear, renombrar, archivar, desarchivar, reordenar, eliminar y buscar.
- Búsqueda, filtros, orden por columna y Propiedades (columnas visibles), y que se recuerden al volver.
- Comentarios: agregar y eliminar los propios.
- Bitácora: los cambios quedan registrados con la persona y la hora correctas.

### 3. Varias personas al mismo tiempo
- Un cambio de una persona aparece en la pantalla de la otra en pocos segundos, sin recargar.
- Dos personas editando campos distintos de la misma tarea: se guardan ambos cambios.
- Cambios en grupo no deshacen lo que otra persona cambió en otros campos.
- Aviso "X también está en esta tarea" aparece y desaparece correctamente.
- Descripción editada por dos personas a la vez: aparece el aviso y "Usar la suya" / "Mantener la mía" funcionan.
- Una persona borra una tarea (o un proyecto) que otra tiene abierta: el panel se cierra sin errores.
- Lo que se está escribiendo no se pierde cuando llegan cambios de otros.

### 4. Permisos por tarea
- Tabla de casos —creador, persona con permiso, persona sin permiso— para cada acción: editar cada campo, eliminar, adjuntar, cambiar permisos, comentar.
- Se comprueba en la app (candado, panel en solo lectura, avisos) y en la base de datos (rechaza aunque se intente saltar la app).
- Cambios en grupo omiten las tareas sin permiso y avisan cuántas.
- No se puede eliminar un proyecto que tenga tareas sin permiso.
- Excepciones permitidas: reordenar y la liberación automática de "En espera".
- Una persona nueva en el equipo queda habilitada en las tareas "Todos" y no en las restringidas.

### 5. Que no se pierdan datos
- Se corta el internet mientras se guarda: al volver, el cambio se envía o se avisa claramente que no se guardó.
- Recargar la página justo después de un cambio.
- Doble clic en "Nueva" o en "Eliminar" no duplica ni falla.
- Cualquier error se muestra en pantalla en vez de fallar en silencio.
- Exportar e importar un respaldo deja todo igual (tareas, dependencias, permisos, comentarios, adjuntos).

### 6. Archivos adjuntos
- Subir (botón y arrastrar), ver imágenes, descargar y eliminar.
- Archivos grandes y nombres con tildes o espacios.
- Respetan los permisos de la tarea; sin sesión no se pueden ver.

### 7. Seguridad básica
- Sin sesión no se ve ningún dato (ni por la app ni consultando la base directamente).
- Revisión con el asesor de seguridad de Supabase y corrección de lo que marque.
- Las claves de la app solo son públicas (nunca la clave de servicio).

### 8. Celular
- Barra superior con logo y menú; el menú abre y cierra la lista de proyectos.
- La tabla se recorre deslizando en ambas direcciones y se ve mejor en horizontal.
- Panel de la tarea, menús y avisos usables con el dedo; el teclado no tapa lo que se escribe.
- Probar en iPhone (Safari) y Android (Chrome).

## Ritmo sugerido

- **Después de cada cambio:** correr las pruebas automáticas de interfaz y base de datos.
- **Al terminar un bloque de cambios:** sesión de 20 minutos con el equipo.
- **Cada semana:** Exportar un respaldo.
