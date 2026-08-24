# APP DOINGLIGHT V2 — estado recuperado

Actualizado: 24 de agosto de 2026.

## Punto de continuación confirmado

El panel está desplegado en `https://gestion.doinglight.es` y el repositorio local se encuentra en:

```text
/Users/doinglight/Documents/New project/doinglight-sales-panel
```

Rama activa: `main`.

Último hito desplegado confirmado por el código, Git y el usuario:

```text
a6dcfba — Add FacturaDirecta purchase inventory controls
```

Ese hito añadió en Compras el botón **Inventario FD**, que consulta una muestra de facturas de compra de FacturaDirecta y presenta cuántas tienen adjuntos, número de archivos, tamaño conocido/desconocido, tipos y errores. La consulta es de inventario: no descarga archivos ni modifica datos.

## Hito local pendiente de publicar

El 24 de agosto de 2026 se preparó, todavía sin desplegar ni ejecutar contra producción:

- Importación idempotente de presupuestos, proformas, albaranes y facturas de venta desde FacturaDirecta.
- Separación de los presupuestos normales y las proformas mediante `isProforma`.
- Asociación automática con clientes por NIF/CIF, correo o nombre; los documentos sin coincidencia se conservan igualmente y se contabilizan en el resumen.
- Importación idempotente de facturas de compra y tiques, asociándolos con proveedores por NIF/CIF, correo o nombre.
- Copia de los adjuntos originales de compras a almacenamiento S3 compatible, conservando metadatos, tamaño, checksum y estado de importación.
- Pantalla **Ajustes → Integraciones** con vista previa segura y botones para importar por lotes todas las ventas o todas las compras.
- Migración backend pendiente: `018_fd_sales_document_import.sql`.

Antes de la importación real hay que publicar frontend y backend, ejecutar migraciones y confirmar que Railway tiene configuradas las credenciales de FacturaDirecta y el almacenamiento S3 compatible de adjuntos.

## Arquitectura actual

- Frontend React 19 + Vite 6.
- Servidor estático Node propio en `server.js` para Railway.
- Despliegue configurado mediante `railway.json`.
- Interfaz concentrada principalmente en `src/main.jsx` y `src/styles.css`.
- Sesión guardada en `localStorage` con la clave `doinglight_panel_session`.
- API configurada mediante `VITE_API_BASE_URL`; en desarrollo Vite redirige `/api` al backend Railway.
- Repositorio remoto: `doinglightfiles-cmyk/doinglight-sales-panel`.
- Backend dependiente: repositorio hermano `doinglight-app-backend`.

## Funcionalidad operativa identificada

### Acceso y permisos

- Login real contra `/api/auth/login`.
- Roles contemplados: comercial, responsables de distribuidor/equipo y administradores Doinglight.
- El backend aplica el alcance de datos por usuario/rol.

### Ventas y documentos

- Presupuestos internos: listado, búsqueda, filtros, alta, edición y borrado.
- Facturas, proformas y albaranes internos.
- Conversión entre presupuesto, albarán y factura, con trazabilidad y bloqueos de flujo.
- Estados de documentos, anulación y resaltado de facturas pendientes o vencidas.
- Series y numeración configurables.
- Métodos de pago configurables.
- Selector de responsable del documento.
- Plantillas PDF Doinglight y Tubo Solar.
- Idiomas de documento y catálogo localizado.
- PDF, impresión y envío por correo.
- Notas generales, notas internas y descripciones/notas personalizadas por línea.
- Inversión del sujeto pasivo y validación VIES.
- Lectura espejo de facturas de FacturaDirecta.

### Contactos y catálogo

- Clientes y proveedores con filtros independientes.
- Alta y edición de contactos.
- Búsqueda normalizada, incluida búsqueda sin tildes.
- Niveles/tipos de cliente y datos fiscales.
- Catálogo comercial obtenido del backend, con imágenes y traducciones.
- Imágenes de Google Drive servidas a través del proxy de catálogo del backend.

### Compras y gastos

- Listado y filtros de facturas de compra, gastos y tiques.
- Alta, edición y eliminación de compras.
- Proveedores, vencimiento, estado y método de pago.
- Líneas con tratamiento de IVA, IVA no deducible, retenciones y suplidos.
- Adjuntos PDF/JPG de hasta 10 MB por archivo.
- Inventario de adjuntos de compras de FacturaDirecta, reservado a administradores.

### Configuración y panel

- Dashboard con resumen comercial y mercados.
- Datos de empresa y factura electrónica.
- Preferencias de numeración y series.
- Acceso rápido global para crear documentos, compras y contactos.

## Módulos visibles pero todavía parciales o de maqueta

El menú incluye áreas que usan `ModuleWorkspace` y no deben considerarse terminadas solo porque aparezcan en pantalla:

- Bancos.
- Todas las ventas.
- Nóminas.
- Escáner de compras.
- Tareas recurrentes.
- Actividad.
- Remesas bancarias.
- Impuestos.
- Asientos contables.
- Informes.

También están pendientes de configuración las acciones logísticas de SEUR, GLS, DHL y grupaje. En Configuración existen secciones cuyos datos siguen marcados como pendientes de activación o definición.

## Contratos principales con el backend

- `/api/auth/login`
- `/api/sales/dashboard`
- `/api/sales/users`
- `/api/sales/leads`
- `/api/sales/vies/validate`
- `/api/sales/quotes`
- `/api/sales/documents/:type`
- `/api/purchases`
- `/api/purchases/:id/attachments`
- `/api/facturadirecta/purchases/inventory`
- `/api/facturadirecta/import/purchases`
- `/api/facturadirecta/import/sales-documents`
- `/api/catalog/products`
- `/api/catalog/image/:fileId`
- `/api/settings`
- `/api/quotes/documents/send`

Antes de cambiar un contrato, revisar las rutas y servicios correspondientes en `doinglight-app-backend`.

## Riesgos técnicos conocidos

- `src/main.jsx` supera las 10.000 líneas y `src/styles.css` supera las 7.000. Conviene hacer cambios dirigidos y evitar leer o reescribir ambos archivos completos sin necesidad.
- Frontend y backend evolucionan juntos; una función nueva puede requerir cambios coordinados en ambos repositorios.
- El panel trabaja con datos reales a través del backend Railway. Las pruebas destructivas o los despliegues requieren autorización explícita.
- La tarea histórica `APP DOINGLIGHT` llegó a ocupar aproximadamente 35 GB por contexto y adjuntos repetidos. No debe usarse como memoria activa ni reabrirse para continuar el desarrollo.

## Protocolo para la próxima tarea

1. Leer este archivo y `AGENTS.md`.
2. Ejecutar `git status --short --branch`.
3. Identificar la función o pantalla concreta solicitada.
4. Revisar solamente sus componentes, estilos y endpoints asociados.
5. Implementar y ejecutar `npm run build`.
6. No desplegar ni hacer `push` salvo petición explícita.
7. Actualizar este documento si cambia el estado global o el punto de continuación.

## Operación de la importación preparada

Una vez desplegada la versión y ejecutadas las migraciones, un administrador podrá ir a **Ajustes → Integraciones**:

1. Pulsar **Revisar muestra** en Ventas y Compras. No escribe datos y permite comprobar la conexión.
2. Pulsar **Importar todas las ventas** para incorporar presupuestos, proformas, albaranes y facturas.
3. Pulsar **Importar todas las compras** para incorporar facturas de proveedor, tiques y sus archivos originales.
4. Revisar el resumen de errores y documentos sin cliente/proveedor asociado.

Ambas operaciones avanzan por lotes y pueden repetirse o reanudarse sin crear duplicados, usando el identificador de FacturaDirecta como identidad de origen.
