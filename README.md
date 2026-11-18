# Gestor de tareas

App interna para registrar y seguir los pendientes de la empresa, con estilo minimalista tipo Notion.

## Cómo usarla

Abre `index.html` con Chrome (doble clic). No necesita instalación ni internet.

Por ahora los datos se guardan en el navegador (IndexedDB), así que cada computador tiene sus propios datos.

## Funciones

- Vista de **tabla** ordenable por columna, con columnas que se reordenan arrastrando y se ocultan (botón "Propiedades").
- Vista de **tablero** (Kanban) por estado; las tarjetas se arrastran entre columnas.
- Búsqueda por título, texto, ID, proyecto o responsable (Cmd+F).
- Panel de detalle con propiedades, comentarios, texto libre, fotos y archivos adjuntos.
- Dependencias entre tareas, con cambio automático de estado cuando se completan.
- Usuarios de prueba: Jorge, Francisco y Ulises.

## Estados

No completada · En curso · Dependencia interna · Dependencia externa · Dependencia mixta · Completada

## Estructura

```
index.html       Página principal
css/styles.css   Estilos
js/db.js         Capa de datos (local). Se reemplazará por Supabase.
js/seed.js       Datos de ejemplo
js/app.js        Lógica de la interfaz
```

## Pendiente

- Registro de nuevos usuarios
- Migrar datos y archivos a Supabase
