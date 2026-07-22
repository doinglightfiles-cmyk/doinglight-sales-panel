# Doinglight Sales Panel

Panel web interno para `gestion.doinglight.es`.

## Alcance inicial

- Login real contra el backend Railway.
- Dashboard con métricas básicas.
- Catálogo de productos.
- Leads/clientes.
- Presupuestos básicos.

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
