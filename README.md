# Doinglight Sales Panel — APP DOINGLIGHT V2

Panel web interno para `gestion.doinglight.es`.

El mapa funcional recuperado, el último hito confirmado y las áreas pendientes están documentados en [`PROJECT_STATE.md`](./PROJECT_STATE.md). Las reglas para continuar el desarrollo sin depender del historial antiguo están en [`AGENTS.md`](./AGENTS.md).

## Alcance actual

- Login real contra el backend Railway.
- Dashboard comercial.
- Clientes y proveedores.
- Catálogo de productos localizado.
- Presupuestos, albaranes, proformas y facturas.
- Compras, gastos y adjuntos.
- Integración operativa con el backend Doinglight y FacturaDirecta.

## Variables

```bash
VITE_API_BASE_URL=https://doinglight-app-backend-production.up.railway.app
```

En producción, configurar esta variable en Railway antes de desplegar el panel.

Dominio previsto:

```bash
gestion.doinglight.es
```

## Comandos

```bash
npm install
npm run dev
npm run build
npm run start
```

## Roles

El backend controla la visibilidad:

- `commercial`: solo sus leads y presupuestos.
- `distributor_admin`, `manager`, `sales_manager`: datos de su distribuidor/equipo.
- `admin`, `doinglight_admin`, `super_admin`: todo.
