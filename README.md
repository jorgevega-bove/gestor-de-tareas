# Gestor de tareas · BOVE

App interna para registrar y seguir los pendientes de BOVE, organizados por proyecto, con estilo minimalista tipo Notion.

## Cómo usarla

Abre `index.html` con Chrome (doble clic). No necesita instalación ni internet.

Por ahora los datos se guardan en el navegador (IndexedDB), así que cada computador tiene sus propios datos.
Desde Cuenta › Configuración se puede descargar un respaldo y restaurarlo.

## Funciones

- Edición directa en las celdas de la tabla; el panel de la tarea se abre solo con el botón ABRIR.
- Columnas con ancho ajustable arrastrando el borde del encabezado (doble clic para volver al ancho por defecto).
- Título del proyecto editable con un clic; proyectos reordenables arrastrándolos en la barra lateral.
- Proyectos en la barra lateral (en curso y archivados), opción "+ Crear proyecto" y "Mostrar todos" para ver las tareas de todos los proyectos en curso.
- Vista de **tabla**: clic en un encabezado para Ordenar o Filtrar (con casillas en Estado, Prioridad, Responsable, Proyecto y Creado por); con columnas que se reordenan arrastrando y se ocultan (botón "Propiedades").
- Vista **Kanban** por estado; las tarjetas se arrastran entre columnas.
- Búsqueda por título, texto, ID, proyecto o responsable (Cmd+F).
- Deshacer y rehacer cambios: ⌘Z / ⌘Y en Mac, Ctrl+Z / Ctrl+Y en Windows.
- Bitácora (menú de la cuenta) con todo el historial de tareas, proyectos y personas: quién, qué y cuándo.
- Panel de detalle con propiedades, comentarios, texto libre y archivos adjuntos (arrastrar al panel para adjuntar).
- Dependencias entre tareas, con cambio automático de estado cuando se completan.
- Por ahora la app se usa como Jorge; Francisco, Ulises y otras personas se pueden asignar como responsables.

## Estados

No completada · En curso · En espera · Completada

## Estructura

```
index.html       Página principal
css/styles.css   Estilos
js/db.js         Capa de datos (local). Se reemplazará por Supabase.
js/seed.js       Datos de ejemplo
js/app.js        Lógica de la interfaz
```

## Pendiente

- Sistema de cuentas e inicio de sesión real

- Registro de nuevos usuarios
- Migrar datos y archivos a Supabase
