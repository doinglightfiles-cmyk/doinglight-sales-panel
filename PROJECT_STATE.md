# APP DOINGLIGHT V2 — estado recuperado

Actualizado: 4 de septiembre de 2026.

## Cambios locales pendientes de despliegue

- El sobre del listado general de presupuestos solo se muestra cuando el envío por correo se ha completado correctamente. El backend lo registra de forma persistente mediante `024_quote_email_tracking.sql`; los enlaces de aceptación históricos permiten recuperar los envíos anteriores verificables.
- Panel y APP móvil permiten convertir un presupuesto a precios netos desde la X situada junto a Descuento: se confirma la acción, se ponen los descuentos a cero, se oculta la columna y también se omite en el PDF. El backend lo conserva con la migración `023_quote_net_pricing.sql`.
- Las líneas de PORTES quedan forzadas a descuento cero en panel, APP y backend, independientemente del nivel comercial del cliente.
- Los presupuestos nuevos creados por `a.jimenez@doinglight.es` arrancan siempre con descuento cero; no se modifica ese comportamiento al editar documentos ya existentes.
- Los listados de presupuestos, proformas, albaranes y facturas muestran el icono del tipo de documento en verde para la plantilla Doinglight y azul para Tubo Solar.
- La APP móvil de gestión muestra la misma distinción mediante una franja lateral en cada tarjeta de venta y respeta el área segura inferior de Android en pantallas y modales.
- El backend incorpora la migración `019_sales_document_pdf_template.sql` para conservar la plantilla al convertir documentos y recuperar la plantilla de los documentos históricos vinculados a un presupuesto.
- Los presupuestos incorporan un check persistente para incluir u ocultar en el PDF el IBAN de Doinglight y un enlace público de pago Redsys. El backend lo conserva mediante `020_quote_payment_details.sql` y solicita la generación automática al puente PayGold existente. Antes de publicarlo hay que desplegar también el nuevo endpoint seguro `/api/payment-links` del bridge y configurar en el backend `PAYGOLD_BRIDGE_URL` y `PAYGOLD_BRIDGE_SECRET`.
- Los compositores de correo de presupuesto, proforma, albarán y factura, tanto en panel como en APP móvil, incluyen por defecto los textos completos de protección de datos y confidencialidad facilitados por Doinglight.
- El correo de presupuesto usa dos cuerpos: con datos de pago muestra IBAN y enlace PayGold tanto en el texto como en un botón; sin datos de pago muestra un botón verde de aceptación. Los correos llevan el logotipo Doinglight y una firma textual provisional de Administración.
- La aceptación usa tokens públicos almacenados únicamente como hash y una pantalla de confirmación intermedia para impedir aceptaciones causadas por escáneres automáticos de correo. Al confirmar por primera vez, el presupuesto pasa a `accepted`, se crea una única proforma y se envía automáticamente en PDF al cliente; si el envío falla, la misma pantalla permite reintentarlo sin duplicar documentos.
- La creación automática de factura tras una confirmación real de pago Redsys sigue pendiente de conectar al callback firmado de PayGold; no debe activarse basándose solamente en que el cliente abra el enlace.
- Estos cambios están verificados localmente y todavía no se han desplegado.

## Punto de continuación confirmado

El panel está desplegado en `https://gestion.doinglight.es` y el repositorio local se encuentra en:

```text
/Users/doinglight/Documents/New project/doinglight-sales-panel
```

Rama activa: `main`.

## Migración de FacturaDirecta completada

El 24 de agosto de 2026 se publicó y ejecutó en producción:

- Importación idempotente de presupuestos, proformas, albaranes y facturas de venta desde FacturaDirecta.
- Separación de los presupuestos normales y las proformas mediante `isProforma`.
- Asociación automática con clientes por NIF/CIF, correo o nombre; los documentos sin coincidencia se conservan igualmente y se contabilizan en el resumen.
- Importación idempotente de facturas de compra y tiques, asociándolos con proveedores por NIF/CIF, correo o nombre.
- Copia de los adjuntos originales de compras a almacenamiento S3 compatible, conservando metadatos, tamaño, checksum y estado de importación; existe respaldo en PostgreSQL cuando S3 no está disponible.
- Pantalla **Ajustes → Integraciones** con vista previa segura y botones para importar por lotes todas las ventas o todas las compras.
- Migración backend `018_fd_sales_document_import.sql`, ejecutada automáticamente por Railway.
- Limpieza previa de 37 documentos locales de prueba: 12 presupuestos, 19 documentos de venta y 6 compras.

Resultado verificado contra producción:

- 16.242 documentos de venta: 7.851 presupuestos, 1.737 proformas, 2.981 albaranes y 3.673 facturas.
- 2.443 compras y 2.432 adjuntos, con 711,2 MB almacenados.
- Auditoría por identificador: 2.443 compras en FacturaDirecta y 2.443 en el panel; 0 extras y 0 ausentes.
- 0 errores de importación pendientes.
- 887 ventas históricas sin contacto asociado y 6 compras sin proveedor asociado; se conservan sin asignación para evitar relaciones ambiguas.

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
- `/api/facturadirecta/import/recent-errors`
- `/api/facturadirecta/import/audit-purchases`
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

## Hito: notificaciones operativas

- El panel muestra una campana con contador de notificaciones pendientes.
- La bandeja separa notificaciones activas y archivadas; nunca se eliminan.
- Las asignaciones de responsable generan una notificación al usuario asignado.
- Los pagos Redsys confirmados generan avisos para Administración, Marketing e Info.
- La acción **Enviar a preparación** crea un único albarán aunque actúen varios destinatarios y deja preparada la futura orden del entorno de almacén.
- El backend conserva las notificaciones y el vínculo entre la orden Redsys y el documento de venta.

## Hito: destinatarios de correo vinculados al cliente

- Los modales de envío del panel y de la app precargan el correo principal del cliente en **Para**.
- Al activar el campo para añadir destinatarios se muestran como sugerencias el correo principal y todos los contactos de comunicación guardados en la ficha de la compañía.
- Los correos se normalizan sin distinguir mayúsculas de minúsculas y no se duplican.
- Los documentos de venta internos exponen la ficha completa del cliente para mantener este comportamiento en presupuestos, proformas, albaranes y facturas.
- Los cambios están verificados localmente; queda pendiente desplegar backend/panel y generar una APK cuando se solicite.

## Hito: línea de portes en presupuestos

- El editor de presupuestos incorpora un botón **PORTES** con icono de camión.
- El botón abre un modal de importe y crea o actualiza una única línea especial de transporte.
- Los portes forman parte de la base imponible, del cálculo del IVA y del total final.
- La línea conserva el icono del camión al reabrir el documento y al generar el PDF; también se mantiene al transformar el presupuesto en otros documentos de venta.
- En presupuestos, la referencia se selecciona exclusivamente entre productos existentes del catálogo y ya no admite texto libre.
- Panel y backend están verificados localmente; el despliegue queda pendiente de autorización.

## Hito: referencias controladas y producto especial

- El campo de referencia de los presupuestos vuelve a permitir escritura y ofrece las referencias del catálogo como sugerencias.
- Una referencia escrita que no coincida con un producto real bloquea tanto la creación de otra línea como el guardado del documento.
- `ALMORCHON` es la única referencia especial admitida fuera del catálogo y habilita descripción y precio manuales.
- El backend valida también la referencia especial, su descripción y que su importe sea mayor que cero.
- La app móvil muestra el IVA en formato compacto por país (`ES: 21%`, `PT: 23%`, etc.) y reserva ancho suficiente para evitar texto apilado.
- Los cambios están comprobados localmente y pendientes de despliegue/compilación nativa.

## Operación de la importación

La versión está desplegada y un administrador puede ir a **Ajustes → Integraciones**:

1. Pulsar **Revisar muestra** en Ventas y Compras. No escribe datos y permite comprobar la conexión.
2. Pulsar **Importar todas las ventas** para incorporar presupuestos, proformas, albaranes y facturas.
3. Pulsar **Importar todas las compras** para incorporar facturas de proveedor, tiques y sus archivos originales.
4. Revisar el resumen de errores y documentos sin cliente/proveedor asociado.
5. Usar **Auditar compras** para comparar los identificadores locales con FacturaDirecta sin modificar datos.

Ambas operaciones avanzan por lotes y pueden repetirse o reanudarse sin crear duplicados, usando el identificador de FacturaDirecta como identidad de origen.
