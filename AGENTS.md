# APP DOINGLIGHT V2 — reglas de trabajo

## Alcance

- Este repositorio contiene únicamente el panel web de gestión publicado en `https://gestion.doinglight.es`.
- El backend que consume el panel está en el repositorio hermano `doinglight-app-backend`. No modificarlo salvo que la tarea lo requiera expresamente.
- Las aplicaciones móviles `doinglight-app-fresh` y la antigua Sales App quedan fuera de alcance.

## Fuente de verdad

- El estado funcional recuperado está en `PROJECT_STATE.md`.
- El código y el historial Git prevalecen sobre conversaciones antiguas.
- Antes de comenzar una función, comprobar `git status`, leer la zona afectada y confirmar los endpoints disponibles.
- Al terminar un hito relevante, actualizar `PROJECT_STATE.md` con lo completado y el siguiente paso.

## Desarrollo y verificación

- Instalar dependencias con `npm install` y validar cambios con `npm run build`.
- No desplegar, hacer `push`, cambiar variables de Railway ni tocar datos de producción sin una petición explícita.
- No introducir secretos, tokens, contraseñas ni contenido de `.env` en archivos, commits o respuestas.
- Mantener compatibilidad con el backend Railway y con `VITE_API_BASE_URL`.
- Preservar los cambios existentes del usuario y evitar refactorizaciones amplias si no son necesarias para la tarea.

## Gestión del contexto

- No volver a cargar ni copiar íntegramente la tarea histórica `APP DOINGLIGHT`; su archivo local es extremadamente grande.
- No incrustar capturas, PDF o binarios en documentos de contexto. Referenciarlos por ruta cuando sean necesarios.
- Para orientarse en la aplicación, usar primero el mapa de `PROJECT_STATE.md` y búsquedas dirigidas en `src/main.jsx`.

