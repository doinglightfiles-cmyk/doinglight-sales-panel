import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BadgeCent,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Fingerprint,
  Gift,
  ImageIcon,
  Landmark,
  ListOrdered,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Paintbrush,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  Truck,
  Type,
  History,
  UsersRound,
  X,
  UserRound
} from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const SESSION_KEY = "doinglight_panel_session";

function money(value) {
  if (value === null || value === undefined || value === "") return "-";

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value));
}

function shortDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function dateOnly(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function addDays(value, days) {
  if (!value) return null;
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

async function apiRequest(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Error HTTP ${response.status}`);
  }
  return payload;
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function roleLabel(role) {
  const labels = {
    admin: "Administrador",
    doinglight_admin: "Administrador",
    super_admin: "Administrador",
    distributor_admin: "Distribuidor",
    manager: "Manager",
    sales_manager: "Manager",
    commercial: "Comercial"
  };
  return labels[role] || role || "Usuario";
}

function getDriveFileId(url) {
  return (
    String(url || "").match(/[?&]id=([^&]+)/)?.[1] ||
    String(url || "").match(/\/d\/([^/]+)/)?.[1] ||
    ""
  );
}

function imageUrlForDisplay(url, width = 600) {
  const driveFileId = getDriveFileId(url);
  if (driveFileId) {
    return `${API_BASE_URL}/api/catalog/image/${driveFileId}?w=${width}`;
  }

  return url || "";
}

function getProductImage(product) {
  if (product?.mainImageUrl) return product.mainImageUrl;
  return (product?.media || []).find((item) => item.type === "main_image")?.url || product?.media?.[0]?.url || "";
}

function getProductGallery(product) {
  const seen = new Set();
  return [getProductImage(product), ...(product?.media || []).map((item) => item.url)]
    .filter(Boolean)
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}

function ProductThumbnail({ product, size = "small" }) {
  const imageUrl = imageUrlForDisplay(getProductImage(product), size === "large" ? 1000 : 300);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  if (!imageUrl || failed) {
    return (
      <div className={`product-thumb ${size} empty-thumb`} aria-label="Producto sin imagen">
        <ImageIcon size={size === "large" ? 34 : 18} />
      </div>
    );
  }

  return (
    <img
      className={`product-thumb ${size}`}
      src={imageUrl}
      alt={product.title || product.sku}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function LoginView({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await apiRequest("/api/auth/login", {
        method: "POST",
        body: { email, password }
      });
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      onLogin(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand-mark">Doinglight</div>
        <h1>Panel de gestión</h1>
        <form onSubmit={submit} className="login-form">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </label>
          <label>
            Contraseña
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [session, setSession] = useState(readSession);
  const [activeView, setActiveView] = useState("dashboard");

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  if (!session?.token) {
    return <LoginView onLogin={setSession} />;
  }

  return (
    <PanelShell session={session} activeView={activeView} onNavigate={setActiveView} onLogout={logout} />
  );
}

function PanelShell({ session, activeView, onNavigate, onLogout }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [contactsInitialFilter, setContactsInitialFilter] = useState("all");
  const primaryNav = [
    { id: "dashboard", label: "Inicio" },
    { id: "invoices", label: "Facturas" },
    { id: "purchases", label: "Compras" },
    { id: "contacts", label: "Contactos" },
    { id: "banks", label: "Bancos" }
  ];
  const moreGroups = [
    {
      title: "Ventas",
      items: [
        { id: "invoices", label: "Facturas" },
        { id: "quotes", label: "Presupuestos" },
        { id: "delivery-notes", label: "Albaranes" },
        { id: "all-sales", label: "Todas las ventas" }
      ]
    },
    {
      title: "Compras",
      items: [
        { id: "purchases", label: "Compras/Gastos" },
        { id: "payroll", label: "Nóminas" },
        { id: "purchase-scan", label: "Escáner Compras" }
      ]
    },
    {
      title: "Gestión",
      items: [
        { id: "contacts", label: "Contactos" },
        { id: "catalog", label: "Productos" },
        { id: "downloads", label: "Descargas" },
        { id: "recurring-tasks", label: "Tareas recurrentes" },
        { id: "activity", label: "Actividad" }
      ]
    },
    {
      title: "Finanzas y contabilidad",
      items: [
        { id: "banks", label: "Bancos" },
        { id: "bank-remittances", label: "Remesas bancarias" },
        { id: "taxes", label: "Impuestos" },
        { id: "accounting-entries", label: "Asientos contables" },
        { id: "reports", label: "Informes" }
      ]
    }
  ];
  const moreNav = moreGroups.flatMap((group) => group.items);
  const activeMoreItem = moreNav.find((item) => item.id === activeView && !primaryNav.some((navItem) => navItem.id === item.id));
  const visibleNav = activeMoreItem ? [...primaryNav, activeMoreItem] : primaryNav;

  function navigate(viewId, options = {}) {
    setMoreOpen(false);
    if (viewId === "contacts" && options.contactFilter) {
      setContactsInitialFilter(options.contactFilter);
    } else if (viewId !== "contacts") {
      setContactsInitialFilter("all");
    }
    onNavigate(viewId);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="header-brand" type="button" onClick={() => navigate("dashboard")} aria-label="Ir a Inicio">
          <img src="/logo-backend.png" alt="Doinglight Intranet" />
        </button>
        <nav className="main-nav" aria-label="Navegación principal">
          {visibleNav.map((item) => {
            if (item.id === "contacts") {
              return (
                <div className="nav-dropdown" key={item.id}>
                  <button
                    className={activeView === item.id ? "nav-item active" : "nav-item"}
                    onClick={() => navigate(item.id)}
                    aria-haspopup="menu"
                  >
                    {item.label}
                  </button>
                  <div className="nav-submenu" role="menu">
                    <button type="button" onClick={() => navigate("contacts", { contactFilter: "clients" })} role="menuitem">
                      Clientes
                    </button>
                    <button type="button" onClick={() => navigate("contacts", { contactFilter: "suppliers" })} role="menuitem">
                      Proveedores
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                className={activeView === item.id ? "nav-item active" : "nav-item"}
                onClick={() => navigate(item.id)}
              >
                {item.label}
              </button>
            );
          })}
          <div className="more-nav">
            <button
              className={moreOpen ? "nav-item active" : "nav-item"}
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              <Menu size={20} />
              Más
            </button>
            {moreOpen ? (
              <div className="more-menu" role="menu">
                <button className="more-menu-close" type="button" onClick={() => setMoreOpen(false)} aria-label="Cerrar menú">
                  <X size={18} />
                </button>
                <div className="more-menu-grid">
                  {moreGroups.map((group) => (
                    <section className="more-menu-group" key={group.title}>
                      <h3>{group.title}</h3>
                      <div>
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            className={activeView === item.id ? "more-menu-item active" : "more-menu-item"}
                            type="button"
                            onClick={() => navigate(item.id)}
                            role="menuitem"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </nav>
        <div className="header-user">
          <UserRound size={18} />
          <div>
            <strong>{session.user.fullName || session.user.email}</strong>
            <span>{roleLabel(session.user.role)}</span>
          </div>
          <div className="header-actions">
            <button className="icon-button header-action-button" type="button" aria-label="Notificaciones">
              <Bell size={18} />
            </button>
            <button className="icon-button header-action-button" type="button" onClick={() => navigate("settings")} aria-label="Opciones">
              <Settings size={18} />
            </button>
            <button className="icon-button header-action-button" onClick={onLogout} aria-label="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="main-area">
        <section className="content">
          {activeView === "dashboard" ? <Dashboard token={session.token} locale={session.user.locale} /> : null}
          {activeView === "settings" ? <SettingsView /> : null}
          {activeView === "invoices" ? <ModuleWorkspace moduleId="invoices" /> : null}
          {activeView === "purchases" ? <ModuleWorkspace moduleId="purchases" /> : null}
          {activeView === "contacts" ? <ContactsView token={session.token} initialFilter={contactsInitialFilter} /> : null}
          {activeView === "banks" ? <ModuleWorkspace moduleId="banks" /> : null}
          {activeView === "delivery-notes" ? <ModuleWorkspace moduleId="delivery-notes" /> : null}
          {activeView === "all-sales" ? <ModuleWorkspace moduleId="all-sales" /> : null}
          {activeView === "payroll" ? <ModuleWorkspace moduleId="payroll" /> : null}
          {activeView === "purchase-scan" ? <ModuleWorkspace moduleId="purchase-scan" /> : null}
          {activeView === "recurring-tasks" ? <ModuleWorkspace moduleId="recurring-tasks" /> : null}
          {activeView === "activity" ? <ModuleWorkspace moduleId="activity" /> : null}
          {activeView === "bank-remittances" ? <ModuleWorkspace moduleId="bank-remittances" /> : null}
          {activeView === "taxes" ? <ModuleWorkspace moduleId="taxes" /> : null}
          {activeView === "accounting-entries" ? <ModuleWorkspace moduleId="accounting-entries" /> : null}
          {activeView === "reports" ? <ModuleWorkspace moduleId="reports" /> : null}
          {activeView === "catalog" ? <CatalogView token={session.token} locale={session.user.locale} /> : null}
          {activeView === "leads" ? <LeadsView token={session.token} /> : null}
          {activeView === "quotes" ? <QuotesView token={session.token} /> : null}
          {activeView === "downloads" ? <DownloadsView /> : null}
        </section>
      </div>
    </div>
  );
}

const MODULES = {
  invoices: {
    title: "Facturas",
    actionLabel: "Nueva factura",
    filterLabel: "Todas las facturas",
    searchPlaceholder: "Buscar por cliente, número o importe",
    metrics: ["Borradores", "Pendientes", "Vencidas", "Cobradas"],
    columns: ["Número", "Cliente", "Fecha", "Vencimiento", "Estado", "Total"],
    empty: "No hay facturas todavía."
  },
  purchases: {
    title: "Compras",
    actionLabel: "Nueva compra",
    filterLabel: "Todas las compras",
    searchPlaceholder: "Buscar por proveedor, número o importe",
    metrics: ["Pendientes", "Pagadas", "Vencidas", "Deducibles"],
    columns: ["Número", "Proveedor", "Fecha", "Vencimiento", "Estado", "Total"],
    empty: "No hay compras registradas todavía."
  },
  banks: {
    title: "Bancos",
    actionLabel: "Añadir banco",
    filterLabel: "Todas las cuentas",
    searchPlaceholder: "Buscar banco, cuenta o movimiento",
    metrics: ["Cuentas", "Saldo previsto", "Pendiente conciliar", "Remesas"],
    columns: ["Banco", "Cuenta", "IBAN", "Saldo", "Último movimiento", "Estado"],
    empty: "No hay cuentas bancarias conectadas todavía."
  },
  "delivery-notes": {
    title: "Albaranes",
    actionLabel: "Nuevo albarán",
    filterLabel: "Todos los albaranes",
    searchPlaceholder: "Buscar por cliente, número o estado",
    metrics: ["Borradores", "Preparados", "Servidos", "Facturados"],
    columns: ["Número", "Cliente", "Fecha", "Estado", "Origen", "Total"],
    empty: "No hay albaranes todavía."
  },
  "all-sales": {
    title: "Todas las ventas",
    actionLabel: "Nueva venta",
    filterLabel: "Todos los documentos",
    searchPlaceholder: "Buscar en ventas",
    metrics: ["Presupuestos", "Albaranes", "Facturas", "Cobros"],
    columns: ["Tipo", "Número", "Contacto", "Fecha", "Estado", "Total"],
    empty: "No hay documentos de venta todavía."
  },
  payroll: {
    title: "Nóminas",
    actionLabel: "Nueva nómina",
    filterLabel: "Todas las nóminas",
    searchPlaceholder: "Buscar empleado o periodo",
    metrics: ["Borradores", "Pendientes", "Pagadas", "Archivadas"],
    columns: ["Empleado", "Periodo", "Fecha", "Estado", "Bruto", "Neto"],
    empty: "No hay nóminas todavía."
  },
  "purchase-scan": {
    title: "Escáner Compras",
    actionLabel: "Subir documento",
    filterLabel: "Todos los documentos",
    searchPlaceholder: "Buscar documento escaneado",
    metrics: ["Pendientes", "Procesados", "Con error", "Archivados"],
    columns: ["Documento", "Proveedor", "Fecha subida", "Estado", "Importe", "Acción"],
    empty: "No hay documentos escaneados todavía."
  },
  "recurring-tasks": {
    title: "Tareas recurrentes",
    actionLabel: "Nueva tarea",
    filterLabel: "Todas las tareas",
    searchPlaceholder: "Buscar tarea recurrente",
    metrics: ["Activas", "Pausadas", "Próximas", "Fallidas"],
    columns: ["Tarea", "Frecuencia", "Próxima ejecución", "Estado", "Responsable", "Último resultado"],
    empty: "No hay tareas recurrentes configuradas."
  },
  activity: {
    title: "Actividad",
    actionLabel: "Exportar",
    filterLabel: "Toda la actividad",
    searchPlaceholder: "Buscar evento, usuario o documento",
    metrics: ["Hoy", "Esta semana", "Usuarios", "Alertas"],
    columns: ["Fecha", "Usuario", "Acción", "Módulo", "Documento", "Detalle"],
    empty: "No hay actividad registrada todavía."
  },
  "bank-remittances": {
    title: "Remesas bancarias",
    actionLabel: "Nueva remesa",
    filterLabel: "Todas las remesas",
    searchPlaceholder: "Buscar remesa",
    metrics: ["Borradores", "Enviadas", "Aceptadas", "Devueltas"],
    columns: ["Remesa", "Banco", "Fecha", "Estado", "Recibos", "Importe"],
    empty: "No hay remesas bancarias todavía."
  },
  taxes: {
    title: "Impuestos",
    actionLabel: "Nuevo modelo",
    filterLabel: "Todos los impuestos",
    searchPlaceholder: "Buscar modelo, periodo o estado",
    metrics: ["Pendientes", "Presentados", "Borradores", "Vencidos"],
    columns: ["Modelo", "Periodo", "Fecha límite", "Estado", "Base", "Resultado"],
    empty: "No hay impuestos preparados todavía."
  },
  "accounting-entries": {
    title: "Asientos contables",
    actionLabel: "Nuevo asiento",
    filterLabel: "Todos los asientos",
    searchPlaceholder: "Buscar cuenta, asiento o documento",
    metrics: ["Hoy", "Pendientes", "Bloqueados", "Exportados"],
    columns: ["Asiento", "Fecha", "Cuenta", "Concepto", "Debe", "Haber"],
    empty: "No hay asientos contables todavía."
  },
  reports: {
    title: "Informes",
    actionLabel: "Nuevo informe",
    filterLabel: "Todos los informes",
    searchPlaceholder: "Buscar informe",
    metrics: ["Ventas", "Compras", "Tesorería", "Contabilidad"],
    columns: ["Informe", "Categoría", "Periodo", "Formato", "Última generación", "Estado"],
    empty: "No hay informes generados todavía."
  }
};

function ModuleWorkspace({ moduleId }) {
  const module = MODULES[moduleId] || {
    title: "Sección",
    actionLabel: "Nuevo",
    filterLabel: "Todos",
    searchPlaceholder: "Buscar",
    metrics: ["Total", "Pendiente", "Activo", "Archivado"],
    columns: ["Detalle", "Fecha", "Estado", "Importe"],
    empty: "No hay datos todavía."
  };
  const [query, setQuery] = useState("");

  return (
    <div className="module-page">
      <header className="module-page-header">
        <h3>{module.title}</h3>
        <button className="primary-button" type="button">
          <Plus size={16} />
          {module.actionLabel}
        </button>
      </header>

      <div className="module-metrics">
        {module.metrics.map((metric) => (
          <Metric key={metric} label={metric} value="0" />
        ))}
      </div>

      <section className="module-panel">
        <div className="module-toolbar">
          <select defaultValue="all" aria-label={`Filtro ${module.title}`}>
            <option value="all">{module.filterLabel}</option>
            <option value="draft">Borradores</option>
            <option value="pending">Pendientes</option>
            <option value="closed">Cerrados</option>
          </select>
          <div className="module-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={module.searchPlaceholder} />
          </div>
        </div>
        <div className="module-filters">
          <button className="filter-chip" type="button">Estado</button>
          <button className="filter-chip" type="button">Fecha</button>
          <button className="filter-chip" type="button">Contacto</button>
          <button className="text-button" type="button">
            <Plus size={16} />
            Añadir filtro
          </button>
        </div>
        <div className="table-wrap">
          <table className="module-table">
            <thead>
              <tr>
                <th className="select-column">
                  <input type="checkbox" aria-label={`Seleccionar ${module.title}`} />
                </th>
                {module.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="empty-table-row">
                <td colSpan={module.columns.length + 1}>{module.empty}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ComingSoonView({ title }) {
  return (
    <Panel title={title}>
      <p className="empty">Sección preparada para desarrollar.</p>
    </Panel>
  );
}

const SETTINGS_SECTIONS = [
  { id: "company", title: "Empresa", description: "Datos fiscales, logo, dirección y factura electrónica", icon: Building2 },
  { id: "users", title: "Usuarios y roles", description: "Gestiona usuarios, roles y el propietario de la cuenta", icon: UsersRound },
  { id: "taxes", title: "Impuestos", description: "Operador intracomunitario e impuestos habituales", icon: Landmark },
  { id: "verifactu", title: "VeriFactu", description: "Configura VeriFactu", icon: Fingerprint },
  { id: "sales", title: "Ventas", description: "Cálculo de impuestos, creación de facturas y firma digital", icon: Truck },
  { id: "custom-fields", title: "Campos personalizados", description: "Campos de texto adicionales para documentos", icon: Type },
  { id: "purchases", title: "Compras", description: "Creación de facturas y escáner de documentos", icon: BadgeCent },
  { id: "payment-methods", title: "Métodos de pago", description: "Gestiona los métodos de pago", icon: CreditCard },
  { id: "numbering", title: "Numeración", description: "Numeración y series de facturas, presupuestos y albaranes", icon: ListOrdered },
  { id: "email", title: "Envío de correo electrónico", description: "Configuración del envío por correo electrónico", icon: Mail },
  { id: "advanced", title: "Avanzado", description: "Monedas, formatos, bloqueo de documentos y certificados", icon: SlidersHorizontal },
  { id: "templates", title: "Plantillas", description: "Colores, textos...", icon: Paintbrush },
  { id: "accounting", title: "Ajustes de contabilidad", description: "Consulta y personaliza el plan contable de tu empresa", icon: Share2 },
  { id: "api", title: "API e integraciones", description: "API, Sandbox, Google Drive, Shopify, Zapier...", icon: Share2 },
  { id: "subscription", title: "Suscripción", description: "Gestiona tu plan y método de pago", icon: CreditCard },
  { id: "referral", title: "Plan amigo", description: "Gana meses gratis invitando a amigos a Doinglight", icon: Gift }
];

const SETTINGS_PANELS = {
  users: {
    title: "Usuarios y roles",
    description: "Gestiona quién puede entrar al panel y qué permisos tiene cada perfil.",
    actionLabel: "Nuevo usuario",
    fields: [
      ["Administradores", "marketing@doinglight.es · info@doinglight.es"],
      ["Distribuidores", "Italia, Francia y Portugal"],
      ["Roles activos", "Administrador, distribuidor y comercial"],
      ["Acceso", "Panel interno Doinglight"]
    ]
  },
  taxes: {
    title: "Impuestos",
    description: "Configura impuestos habituales, fiscalidades por país y posiciones fiscales.",
    actionLabel: "Nuevo impuesto",
    fields: [
      ["IVA España", "21%"],
      ["IVA Portugal", "23%"],
      ["IVA Italia", "22%"],
      ["IVA Francia", "20%"],
      ["IVA Alemania", "19%"],
      ["Exento", "0%"]
    ]
  },
  verifactu: {
    title: "VeriFactu",
    description: "Preparación del módulo de facturación verificable para cuando emitamos facturas reales.",
    actionLabel: "Configurar",
    fields: [
      ["Estado", "Pendiente de activación"],
      ["Modo", "Diseño preparado, envío desactivado"],
      ["Documentos afectados", "Facturas emitidas"],
      ["Fecha objetivo", "Antes de activar facturación definitiva"]
    ]
  },
  sales: {
    title: "Ventas",
    description: "Ajustes de presupuestos, albaranes, facturas, impuestos y firma digital.",
    actionLabel: "Modificar",
    fields: [
      ["Serie presupuestos", "P-"],
      ["Serie albaranes", "A-"],
      ["Serie facturas", "F-"],
      ["Precios", "Sin IVA por defecto"],
      ["Conversión", "Presupuesto → Albarán → Factura"]
    ]
  },
  "custom-fields": {
    title: "Campos personalizados",
    description: "Campos adicionales para contactos, productos y documentos.",
    actionLabel: "Nuevo campo",
    fields: [
      ["Contactos", "Tipo, distribuidor, origen"],
      ["Productos", "Familia, diámetro, imágenes"],
      ["Presupuestos", "Notas internas y condiciones"],
      ["Facturas", "Referencia y observaciones"]
    ]
  },
  purchases: {
    title: "Compras",
    description: "Ajustes para facturas recibidas, proveedores y escáner de documentos.",
    actionLabel: "Modificar",
    fields: [
      ["Proveedores", "Separados de clientes"],
      ["Cuenta contable", "600000"],
      ["Escáner", "Pendiente de conectar"],
      ["Impuestos", "IVA soportado"]
    ]
  },
  "payment-methods": {
    title: "Métodos de pago",
    description: "Gestiona formas de cobro y pago usadas en documentos.",
    actionLabel: "Nuevo método",
    fields: [
      ["Transferencia", "Activa"],
      ["Tarjeta", "Preparada para PayGold"],
      ["Recibo bancario", "Pendiente"],
      ["Efectivo", "Desactivado"]
    ]
  },
  numbering: {
    title: "Numeración",
    description: "Series y contadores para facturas, presupuestos, albaranes y compras.",
    actionLabel: "Nueva serie",
    fields: [
      ["Presupuestos", "P-{año}-{número}"],
      ["Albaranes", "A-{año}-{número}"],
      ["Facturas", "F-{año}-{número}"],
      ["Compras", "C-{año}-{número}"]
    ]
  },
  email: {
    title: "Envío de correo electrónico",
    description: "Plantillas y remitentes para enviar documentos desde el panel.",
    actionLabel: "Modificar",
    fields: [
      ["Remitente", "info@doinglight.es"],
      ["Presupuestos", "Plantilla pendiente"],
      ["Facturas", "Plantilla pendiente"],
      ["Copias internas", "Configurable"]
    ]
  },
  advanced: {
    title: "Avanzado",
    description: "Monedas, formatos, certificados, bloqueo de documentos e integridad.",
    actionLabel: "Modificar",
    fields: [
      ["Moneda", "EUR"],
      ["Formato fecha", "dd/mm/aaaa"],
      ["Bloqueo documental", "Pendiente"],
      ["Certificados", "Pendiente"]
    ]
  },
  templates: {
    title: "Plantillas",
    description: "Diseño de documentos PDF, textos, colores y condiciones comerciales.",
    actionLabel: "Nueva plantilla",
    fields: [
      ["Presupuesto", "Doinglight estándar"],
      ["Albarán", "Pendiente"],
      ["Factura", "Pendiente"],
      ["Color principal", "#9cc31b"]
    ]
  },
  accounting: {
    title: "Ajustes de contabilidad",
    description: "Plan contable, cuentas por defecto y reglas automáticas.",
    actionLabel: "Modificar",
    fields: [
      ["Ventas", "700000"],
      ["Clientes", "430000"],
      ["Compras", "600000"],
      ["Proveedores", "400000"]
    ]
  },
  api: {
    title: "API e integraciones",
    description: "Conexiones con FacturaDirecta, Google Drive, Railway y futuros conectores.",
    actionLabel: "Nueva integración",
    fields: [
      ["FacturaDirecta", "Conectado en modo lectura"],
      ["Google Drive", "Catálogo e imágenes"],
      ["Railway", "Backend Doinglight"],
      ["Modo escritura", "Desactivado"]
    ]
  },
  subscription: {
    title: "Suscripción",
    description: "Información interna de plan, uso y acceso al sistema.",
    actionLabel: "Modificar",
    fields: [
      ["Plan", "Doinglight interno"],
      ["Usuarios", "Sin límite definido"],
      ["Entorno", "Producción"],
      ["Facturación", "No aplica"]
    ]
  },
  referral: {
    title: "Plan amigo",
    description: "Sección heredada del modelo original. Pendiente de decidir si se mantiene.",
    actionLabel: "Ocultar sección",
    fields: [
      ["Estado", "No prioritario"],
      ["Uso Doinglight", "Pendiente de definición"],
      ["Recomendación", "Probablemente eliminar"]
    ]
  }
};

function SettingsView() {
  const [activeSection, setActiveSection] = useState("company");
  const session = readSession();

  return (
    <div className="settings-page">
      <header className="settings-page-header">
        <h3>Ajustes</h3>
        <div className="settings-search">
          <Search size={18} />
          <input placeholder="Buscar..." />
        </div>
      </header>

      <div className="settings-layout">
        <aside className="settings-menu" aria-label="Secciones de ajustes">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                className={activeSection === section.id ? "settings-menu-item active" : "settings-menu-item"}
                type="button"
                onClick={() => setActiveSection(section.id)}
              >
                <Icon size={18} />
                <span>
                  <strong>{section.title}</strong>
                  <small>{section.description}</small>
                </span>
              </button>
            );
          })}
          <p className="settings-version">Versión: 2026-07-21-doinglight</p>
        </aside>

        <main className="settings-content">
          {activeSection === "company" ? (
            <CompanySettingsPanel token={session?.token} />
          ) : (
            <GenericSettingsPanel config={SETTINGS_PANELS[activeSection]} />
          )}
        </main>
      </div>
    </div>
  );
}

function GenericSettingsPanel({ config }) {
  if (!config) return null;

  return (
    <div className="settings-card-stack">
      <section className="settings-card">
        <header className="settings-card-header">
          <div>
            <h3>{config.title}</h3>
            <p>{config.description}</p>
          </div>
          <button className="settings-outline-button" type="button">{config.actionLabel}</button>
        </header>

        <div className="settings-simple-grid">
          {config.fields.map(([label, value]) => (
            <SettingField key={label} label={label} value={value} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CompanySettingsPanel({ token }) {
  const [editingCompany, setEditingCompany] = useState(false);
  const [editingElectronicInvoice, setEditingElectronicInvoice] = useState(false);
  const settings = useResource(() => apiRequest("/api/settings", { token }), [token]);
  const companyData = settings.data?.item?.companyData || {};
  const electronicInvoice = settings.data?.item?.electronicInvoice || {};

  const display = (value) => value || "-";

  return (
    <div className="settings-card-stack">
      {settings.error ? <p className="form-error">{settings.error}</p> : null}
      <section className="settings-card">
        <header className="settings-card-header">
          <div>
            <h3>Datos de tu empresa</h3>
            <p>Información básica de tu empresa</p>
          </div>
          <button className="settings-outline-button" type="button" onClick={() => setEditingCompany(true)}>Modificar</button>
        </header>

        <div className="company-data-grid">
          <SettingField label="Nombre de empresa" value={display(companyData.companyName)} wide />
          <div className="settings-logo-preview">
            <img src={companyData.logoUrl || "/logo-backend.png"} alt="Doinglight" />
          </div>
          <SettingField label="NIF de la empresa" value={display(companyData.taxId)} />
          <SettingField label="País" value={countryLabel(companyData.country)} />
          <SettingField label="Calle" value={display(companyData.street)} wide />
          <SettingField label="Código postal" value={display(companyData.postalCode)} />
          <SettingField label="Población" value={display(companyData.city)} />
          <SettingField label="Provincia" value={display(companyData.province)} />
          <SettingField label="Correo electrónico" value={display(companyData.email)} />
          <SettingField label="Teléfono" value={display(companyData.phone)} />
          <SettingField label="Página web" value={display(companyData.website)} />
        </div>
      </section>

      <section className="settings-card">
        <header className="settings-card-header">
          <div>
            <h3>Datos para Factura Electrónica</h3>
            <p>Información del Registro Mercantil que quieres que aparezca en tus facturas electrónicas</p>
          </div>
          <button className="settings-outline-button" type="button" onClick={() => setEditingElectronicInvoice(true)}>Modificar</button>
        </header>

        <div className="electronic-invoice-grid">
          <SettingField label="Libro" value={display(electronicInvoice.book)} />
          <SettingField label="Registro Mercantil" value={display(electronicInvoice.registry)} />
          <SettingField label="Hoja" value={display(electronicInvoice.sheet)} />
          <SettingField label="Folio" value={display(electronicInvoice.folio)} />
          <SettingField label="Sección" value={display(electronicInvoice.section)} />
          <SettingField label="Tomo" value={display(electronicInvoice.volume)} />
          <SettingField label="Otros datos registrales" value={display(electronicInvoice.otherRegistryData)} wide />
        </div>
      </section>
      {editingCompany ? (
        <CompanyEditModal
          token={token}
          initialData={companyData}
          onClose={() => setEditingCompany(false)}
          onSaved={() => {
            setEditingCompany(false);
            settings.reload();
          }}
        />
      ) : null}
      {editingElectronicInvoice ? (
        <ElectronicInvoiceEditModal
          token={token}
          initialData={electronicInvoice}
          onClose={() => setEditingElectronicInvoice(false)}
          onSaved={() => {
            setEditingElectronicInvoice(false);
            settings.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function CompanyEditModal({ token, initialData = {}, onClose, onSaved }) {
  const [form, setForm] = useState({
    companyName: initialData.companyName || "DOINGLIGHT TECHNOLOGIES, SLU",
    brandName: initialData.brandName || "Doinglight Skylights",
    taxId: initialData.taxId || "B02555001",
    country: initialData.country || "ES",
    street: initialData.street || "Polígono Industrial Campollano, Calle E n° 24",
    postalCode: initialData.postalCode || "02007",
    city: initialData.city || "ALBACETE",
    province: initialData.province || "Albacete",
    email: initialData.email || "info@doinglight.es",
    phone: initialData.phone || "658856869",
    website: initialData.website || "www.doinglight.es",
    logoUrl: initialData.logoUrl || "/logo-backend.png"
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      await apiRequest("/api/settings/company_data", { token, method: "PATCH", body: form });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Modificar empresa" eyebrow="Ajustes de empresa" size="wide-modal" onClose={onClose}>
      <form className="company-edit-form">
        <section className="form-section">
          <div className="form-section-header">
            <h4>Datos fiscales</h4>
            <span className="form-section-note">Campos base según el perfil de empresa expuesto por FacturaDirecta</span>
          </div>
          <label>
            Nombre de empresa
            <input value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
          </label>
          <label>
            Nombre comercial / marca
            <input value={form.brandName} onChange={(event) => setForm({ ...form, brandName: event.target.value })} />
          </label>
          <label>
            NIF de la empresa
            <input value={form.taxId} onChange={(event) => setForm({ ...form, taxId: event.target.value })} />
          </label>
          <label>
            País
            <select value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })}>
              <option value="ES">España</option>
              <option value="PT">Portugal</option>
              <option value="FR">Francia</option>
              <option value="IT">Italia</option>
              <option value="DE">Alemania</option>
            </select>
          </label>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <h4>Logo de empresa</h4>
            <span className="form-section-note">Se usará en menú principal y documentos internos</span>
          </div>
          <div className="logo-upload-panel">
            <div className="logo-upload-preview">
              <img src={form.logoUrl || "/logo-backend.png"} alt="Logo actual Doinglight" />
            </div>
            <div className="logo-upload-controls">
              <button className="secondary-button" type="button">Cambiar logo</button>
              <button className="text-button" type="button">Eliminar logo</button>
              <p>Formato recomendado: PNG o SVG horizontal con fondo transparente.</p>
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <h4>Dirección y contacto</h4>
          </div>
          <label className="wide-field">
            Calle
            <input value={form.street} onChange={(event) => setForm({ ...form, street: event.target.value })} />
          </label>
          <label>
            Código postal
            <input value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
          </label>
          <label>
            Población
            <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          </label>
          <label>
            Provincia
            <input value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} />
          </label>
          <label>
            Correo electrónico
            <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" />
          </label>
          <label>
            Teléfono
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
          <label>
            Página web
            <input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
          </label>
        </section>

        {error ? <p className="form-error">{error}</p> : null}
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="button" onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</button>
        </div>
      </form>
    </ModalShell>
  );
}

function ElectronicInvoiceEditModal({ token, initialData = {}, onClose, onSaved }) {
  const [form, setForm] = useState({
    book: initialData.book || "",
    registry: initialData.registry || "",
    sheet: initialData.sheet || "",
    folio: initialData.folio || "",
    section: initialData.section || "",
    volume: initialData.volume || "",
    otherRegistryData: initialData.otherRegistryData || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      await apiRequest("/api/settings/electronic_invoice", { token, method: "PATCH", body: form });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Datos para Factura Electrónica" eyebrow="Factura electrónica" size="wide-modal" onClose={onClose}>
      <form className="electronic-invoice-edit-form">
        <header className="modal-form-intro">
          <h4>Datos para Factura Electrónica</h4>
          <p>Información del Registro Mercantil que quieres que aparezca en tus facturas electrónicas</p>
        </header>
        <input placeholder="Libro" value={form.book} onChange={(event) => setForm({ ...form, book: event.target.value })} />
        <input placeholder="Registro Mercantil" value={form.registry} onChange={(event) => setForm({ ...form, registry: event.target.value })} />
        <input placeholder="Hoja" value={form.sheet} onChange={(event) => setForm({ ...form, sheet: event.target.value })} />
        <input placeholder="Folio" value={form.folio} onChange={(event) => setForm({ ...form, folio: event.target.value })} />
        <input placeholder="Sección" value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} />
        <input placeholder="Tomo" value={form.volume} onChange={(event) => setForm({ ...form, volume: event.target.value })} />
        <input placeholder="Otros datos registrales" value={form.otherRegistryData} onChange={(event) => setForm({ ...form, otherRegistryData: event.target.value })} />
        {error ? <p className="form-error">{error}</p> : null}
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="button" onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar y cerrar"}</button>
        </div>
      </form>
    </ModalShell>
  );
}

function SettingField({ label, value, wide = false }) {
  return (
    <div className={wide ? "setting-field wide" : "setting-field"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function useResource(loader, deps) {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  async function load() {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await loader();
      setState({ loading: false, error: "", data });
    } catch (err) {
      setState({ loading: false, error: err.message, data: null });
    }
  }

  useEffect(() => {
    load();
  }, deps);

  return { ...state, reload: load };
}

const DASHBOARD_MARKETS = [
  { country: "ES", label: "España", flag: "🇪🇸" },
  { country: "IT", label: "Italia", email: "info@doinglight.it", flag: "🇮🇹" },
  { country: "FR", label: "Francia", email: "info@doinglight.fr", flag: "🇫🇷" },
  { country: "PT", label: "Portugal", email: "maria.teixeira@doinglight.pt", flag: "🇵🇹" }
];

function findMarketSummary(markets, country) {
  return (markets || []).find((market) => market.country === country) || null;
}

function Dashboard({ token, locale = "es" }) {
  const dashboard = useResource(() => apiRequest("/api/sales/dashboard", { token }), [token]);
  const catalog = useResource(
    () => apiRequest(`/api/catalog/products?locale=${encodeURIComponent(locale || "es")}&channel=sales_app`, { token }),
    [token, locale]
  );

  const totals = dashboard.data?.totals || {};
  const markets = dashboard.data?.markets || [];

  return (
    <div className="stack">
      <div className="metrics-grid">
        <Metric label="Clientes" value={totals.leadCount ?? "-"} />
        <Metric label="Presupuestos" value={totals.quoteCount ?? "-"} />
        <Metric label="Catálogo" value={catalog.data?.count ?? "-"} />
        <Metric label="Importe general" value={money(totals.quoteTotal)} />
      </div>

      {dashboard.error ? <p className="form-error">{dashboard.error}</p> : null}

      <div className="country-dashboard">
        {DASHBOARD_MARKETS.map((market) => (
          <CountrySummaryCard
            key={market.country}
            market={market}
            summary={findMarketSummary(markets, market.country)}
            loading={dashboard.loading}
          />
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CountrySummaryCard({ market, summary, loading }) {
  const users = summary?.users || [];
  const primaryUser = users.find((user) => user.email === market.email) || users[0];
  const displayEmail = market.email || primaryUser?.email || "";

  return (
    <section className="country-card">
      <header className="country-card-header">
        <div className="country-title">
          <span className="country-flag" aria-hidden="true">{market.flag}</span>
          <div>
            <h3>{market.label}</h3>
            {displayEmail ? <p>{displayEmail}</p> : null}
          </div>
        </div>
        <strong>{summary?.distributorName || "Doinglight"}</strong>
      </header>
      <div className="country-metrics">
        <Metric label="Clientes" value={loading ? "-" : summary?.leadCount ?? 0} />
        <Metric label="Presupuestos" value={loading ? "-" : summary?.quoteCount ?? 0} />
        <Metric label="Importe" value={loading ? "-" : money(summary?.quoteTotal || 0)} />
      </div>
    </section>
  );
}

function Panel({ title, children, action }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h3>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function CompactList({ items, render, empty }) {
  if (!items.length) return <p className="empty">{empty}</p>;
  return (
    <div className="compact-list">
      {items.map((item) => (
        <div className="compact-row" key={item.id || item.sku || item.quoteNumber}>
          {render(item)}
        </div>
      ))}
    </div>
  );
}

function CatalogView({ token, locale = "es" }) {
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const catalog = useResource(
    () => apiRequest(`/api/catalog/products?locale=${encodeURIComponent(locale || "es")}&channel=sales_app`, { token }),
    [token, locale]
  );
  const products = catalog.data?.products || [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) =>
      [product.sku, product.title, product.family, product.subcategory].some((value) =>
        String(value || "").toLowerCase().includes(needle)
      )
    );
  }, [products, query]);

  return (
    <Panel
      title="Catálogo"
      action={<RefreshButton onClick={catalog.reload} loading={catalog.loading} />}
    >
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar por SKU, nombre o familia" />
      {catalog.error ? <p className="form-error">{catalog.error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Imagen</th>
              <th>SKU</th>
              <th>Producto</th>
              <th>Familia</th>
              <th>Ø</th>
              <th>PVP</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr
                key={product.sku}
                className="clickable-row"
                onClick={() => setSelectedProduct(product)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedProduct(product);
                  }
                }}
              >
                <td className="image-cell">
                  <ProductThumbnail product={product} />
                </td>
                <td>{product.sku}</td>
                <td>
                  <strong>{product.title || product.slug}</strong>
                  <span>{product.shortDescription}</span>
                </td>
                <td>{product.family || product.subcategory}</td>
                <td>{product.diameterMm ? `${product.diameterMm} mm` : "-"}</td>
                <td>{money(product.pricePvpEur)}</td>
                <td className="row-action">
                  <ChevronRight size={17} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedProduct ? (
        <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      ) : null}
    </Panel>
  );
}

function ProductDetailModal({ product, onClose }) {
  const gallery = getProductGallery(product);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article
        className="product-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="product-detail-header">
          <div>
            <p>{product.sku}</p>
            <h3 id="product-detail-title">{product.title || product.slug}</h3>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar ficha">
            <X size={18} />
          </button>
        </header>

        <div className="product-detail-body">
          <div className="product-media-panel">
            <ProductThumbnail product={product} size="large" />
            {gallery.length > 1 ? (
              <div className="product-gallery">
                {gallery.slice(0, 6).map((url) => (
                  <img key={url} src={imageUrlForDisplay(url, 300)} alt="" loading="lazy" />
                ))}
              </div>
            ) : null}
          </div>

          <div className="product-info-panel">
            <div className="detail-grid">
              <DetailItem label="Familia" value={product.family} />
              <DetailItem label="Categoría" value={product.subcategory} />
              <DetailItem label="Diámetro" value={product.diameterMm ? `${product.diameterMm} mm` : "-"} />
              <DetailItem label="PVP" value={money(product.pricePvpEur)} />
              <DetailItem label="Estado" value={product.status} />
              <DetailItem label="Orden" value={product.sortOrder} />
            </div>

            {product.shortDescription ? (
              <section className="detail-copy">
                <h4>Descripción corta</h4>
                <p>{product.shortDescription}</p>
              </section>
            ) : null}

            {product.longDescription ? (
              <section className="detail-copy">
                <h4>Descripción</h4>
                <p>{product.longDescription}</p>
              </section>
            ) : null}

            <section className="detail-copy">
              <h4>Datos técnicos</h4>
              <dl className="technical-list">
                <div>
                  <dt>Slug</dt>
                  <dd>{product.slug || "-"}</dd>
                </div>
                <div>
                  <dt>Moneda</dt>
                  <dd>{product.currency || "-"}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </article>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function customerTypeLabel(value) {
  const labels = {
    company: "Empresa",
    empresa: "Empresa",
    business: "Empresa",
    individual: "Particular",
    particular: "Particular"
  };
  return labels[String(value || "").toLowerCase()] || "Particular";
}

function countryLabel(value) {
  const country = EUROPEAN_COUNTRIES.find((item) => item.code === String(value || "").toUpperCase());
  return country?.label || value || "-";
}

const EUROPEAN_COUNTRIES = [
  { code: "ES", label: "España" },
  { code: "PT", label: "Portugal" },
  { code: "FR", label: "Francia" },
  { code: "IT", label: "Italia" },
  { code: "DE", label: "Alemania" },
  { code: "NL", label: "Países Bajos" },
  { code: "BE", label: "Bélgica" },
  { code: "LU", label: "Luxemburgo" },
  { code: "IE", label: "Irlanda" },
  { code: "DK", label: "Dinamarca" },
  { code: "SE", label: "Suecia" },
  { code: "FI", label: "Finlandia" },
  { code: "AT", label: "Austria" },
  { code: "CZ", label: "Chequia" },
  { code: "SK", label: "Eslovaquia" },
  { code: "SI", label: "Eslovenia" },
  { code: "HR", label: "Croacia" },
  { code: "HU", label: "Hungría" },
  { code: "PL", label: "Polonia" },
  { code: "EE", label: "Estonia" },
  { code: "LV", label: "Letonia" },
  { code: "LT", label: "Lituania" },
  { code: "GR", label: "Grecia" },
  { code: "CY", label: "Chipre" },
  { code: "MT", label: "Malta" },
  { code: "BG", label: "Bulgaria" },
  { code: "RO", label: "Rumanía" },
  { code: "NO", label: "Noruega" },
  { code: "CH", label: "Suiza" },
  { code: "GB", label: "Reino Unido" },
  { code: "AD", label: "Andorra" }
];

const CUSTOMER_LEVELS = [
  {
    id: "level_1",
    label: "Nivel 1",
    title: "Particular",
    description: "Clientes particulares",
    customerType: "particular",
    country: "ES",
    discountPercent: 5
  },
  {
    id: "level_2",
    label: "Nivel 2",
    title: "Profesional",
    description: "Instaladores, arquitectos, constructores y decoradores",
    customerType: "empresa",
    country: "ES",
    discountPercent: 25
  },
  {
    id: "level_3",
    label: "Nivel 3",
    title: "Almacén / vendedor online",
    description: "Almacenes y vendedores online",
    customerType: "empresa",
    country: "ES",
    discountPercent: 45,
    discountMaxPercent: 50
  },
  {
    id: "level_4_it",
    label: "Nivel 4",
    title: "Distribuidor Italia",
    description: "Distribuidor por país",
    customerType: "empresa",
    country: "IT",
    discountPercent: 55
  },
  {
    id: "level_4_fr",
    label: "Nivel 4",
    title: "Distribuidor Francia",
    description: "Distribuidor por país",
    customerType: "empresa",
    country: "FR",
    discountPercent: 50
  },
  {
    id: "level_4_pt",
    label: "Nivel 4",
    title: "Distribuidor Portugal",
    description: "Distribuidor por país",
    customerType: "empresa",
    country: "PT",
    discountPercent: 70
  }
];

function customerLevelById(value) {
  return CUSTOMER_LEVELS.find((level) => level.id === value) || CUSTOMER_LEVELS[0];
}

function customerLevelLabel(value) {
  const level = CUSTOMER_LEVELS.find((item) => item.id === value);
  return level ? `${level.label} · ${level.title}` : "-";
}

function discountLabel(min, max = min) {
  const first = Number(min || 0);
  const second = Number(max || first);
  return second && second !== first ? `${first}-${second}%` : `${first}%`;
}

function taxIdentifierPlaceholder(type) {
  if (type === "cif") {
    return "B12345678 / ESB12345678";
  }

  if (type === "sujeto_pasivo") {
    return "ESB12345678 / ES12345678Z";
  }

  return "12345678Z / ES12345678Z";
}

function emptyAdditionalAddress(country = "ES") {
  return { label: "", address: "", postalCode: "", city: "", province: "", country };
}

function emptyCommunicationContact() {
  return { name: "", email: "", phone: "" };
}

function leadToDraft(lead) {
  return {
    customerLevel: lead.customerLevel || "level_1",
    customerType: lead.customerType || "particular",
    defaultDiscountPercent: lead.defaultDiscountPercent || 0,
    defaultDiscountMaxPercent: lead.defaultDiscountMaxPercent || lead.defaultDiscountPercent || 0,
    defaultTaxRate: lead.defaultTaxRate ?? 21,
    firstName: lead.fullName || "",
    lastName: "",
    fullName: lead.fullName || "",
    companyName: lead.companyName || "",
    taxIdentifierType: lead.taxIdentifierType || "nif",
    viesEnabled: Boolean(lead.viesEnabled),
    viesValid: Boolean(lead.viesValid),
    taxId: lead.taxId || "",
    email: lead.email || "",
    phone: lead.phone || "",
    mobilePhone: lead.mobilePhone || "",
    whatsappStatus: lead.whatsappStatus || "unknown",
    whatsappCheckedAt: lead.whatsappCheckedAt || null,
    address: lead.address || "",
    postalCode: lead.postalCode || "",
    population: lead.population || "",
    city: lead.city || "",
    province: lead.province || "",
    country: lead.country || "ES",
    source: lead.source || "sales_app",
    status: lead.status || "new",
    notes: lead.notes || "",
    additionalAddresses: lead.additionalAddresses || [],
    communicationContacts: lead.communicationContacts || [],
    preferredPaymentMethod: lead.preferredPaymentMethod || "",
    paymentTermDays: lead.paymentTermDays || "",
    paymentNotificationsEnabled: Boolean(lead.paymentNotificationsEnabled)
  };
}

function fullNameFromDraft(form) {
  return [form.firstName, form.lastName].filter(Boolean).join(" ").trim() || form.fullName;
}

function ContactsView({ token, initialFilter = "all" }) {
  const [showForm, setShowForm] = useState(false);
  const [showContactTypePicker, setShowContactTypePicker] = useState(false);
  const [newContactType, setNewContactType] = useState("client");
  const [newCustomerLevel, setNewCustomerLevel] = useState(CUSTOMER_LEVELS[0]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [contactFilter, setContactFilter] = useState(initialFilter);
  const [customerLevelFilter, setCustomerLevelFilter] = useState("all");
  const [query, setQuery] = useState("");
  const leads = useResource(() => apiRequest("/api/sales/leads?limit=200", { token }), [token]);
  const clientContacts = (leads.data?.items || []).map((lead) => ({ ...lead, contactClass: "client" }));
  const supplierContacts = [];
  const contacts = contactFilter === "suppliers" ? supplierContacts : contactFilter === "clients" ? clientContacts : [...clientContacts, ...supplierContacts];

  useEffect(() => {
    setContactFilter(initialFilter);
  }, [initialFilter]);
  const filteredContacts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return contacts.filter((contact) => {
      const matchesLevel =
        customerLevelFilter === "all" ||
        (customerLevelFilter === "level_4"
          ? String(contact.customerLevel || "").startsWith("level_4")
          : contact.customerLevel === customerLevelFilter);

      if (!matchesLevel) return false;
      if (!needle) return true;

      return [
        contact.fullName,
        contact.companyName,
        contact.taxId,
        contact.email,
        contact.phone,
        contact.population,
        contact.city,
        contact.province,
        contact.country
      ].some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [contacts, customerLevelFilter, query]);

  function openContactForm(type, level = CUSTOMER_LEVELS[0]) {
    setNewContactType(type);
    setNewCustomerLevel(level);
    setShowContactTypePicker(false);
    setShowForm(true);
  }

  return (
    <div className="contacts-page">
      <header className="contacts-page-header">
        <h3>Contactos</h3>
        <button className="primary-button contact-new-button" type="button" onClick={() => setShowContactTypePicker(true)}>
          Nuevo contacto
        </button>
      </header>

      <section className="contacts-panel">
        <div className="contacts-toolbar">
          <select value={contactFilter} onChange={(event) => setContactFilter(event.target.value)} aria-label="Tipo de contacto">
            <option value="all">Todos los contactos</option>
            <option value="clients">Clientes</option>
            <option value="suppliers">Proveedores</option>
          </select>
          <div className="contacts-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar..." />
          </div>
        </div>

        <div className="contacts-filters">
          <select value={customerLevelFilter} onChange={(event) => setCustomerLevelFilter(event.target.value)} aria-label="Nivel de cliente">
            <option value="all">Todos los niveles</option>
            <option value="level_1">Nivel 1 · Particular</option>
            <option value="level_2">Nivel 2 · Profesional</option>
            <option value="level_3">Nivel 3 · Almacén / vendedor online</option>
            <option value="level_4">Nivel 4 · Distribuidores</option>
          </select>
          <button className="text-button" type="button">
            <Plus size={16} />
            Añadir filtro
          </button>
        </div>

        {leads.error ? <p className="form-error">{leads.error}</p> : null}
        <div className="table-wrap contacts-table-wrap">
          <table className="contacts-table">
            <thead>
              <tr>
                <th className="select-column">
                  <input type="checkbox" aria-label="Seleccionar todos los contactos" />
                </th>
                <th></th>
                <th>Detalle</th>
                <th>Nivel</th>
                <th>Dto.</th>
                <th>NIF</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Población</th>
                <th>Provincia</th>
                <th>País</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <tr
                  key={`${contact.contactClass}-${contact.id}`}
                  className="clickable-row"
                  onClick={() => setSelectedLead(contact)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedLead(contact);
                    }
                  }}
                >
                  <td className="select-column" onClick={(event) => event.stopPropagation()}>
                    <input type="checkbox" aria-label={`Seleccionar ${contact.fullName}`} />
                  </td>
                  <td>
                    <span className="contact-kind-badge">{contact.contactClass === "client" ? "C" : "P"}</span>
                  </td>
                  <td>
                    <strong>{contact.fullName || contact.companyName || "-"}</strong>
                    {contact.companyName && contact.companyName !== contact.fullName ? <span>{contact.companyName}</span> : null}
                  </td>
                  <td>{contact.contactClass === "client" ? customerLevelLabel(contact.customerLevel) : "-"}</td>
                  <td>
                    {contact.contactClass === "client"
                      ? discountLabel(contact.defaultDiscountPercent, contact.defaultDiscountMaxPercent)
                      : "-"}
                  </td>
                  <td>{contact.taxId || "-"}</td>
                  <td>{contact.email || "-"}</td>
                  <td>{contact.phone || "-"}</td>
                  <td>{contact.population || contact.city || "-"}</td>
                  <td>{contact.province || "-"}</td>
                  <td>{countryLabel(contact.country)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredContacts.length ? <p className="empty">No hay contactos para este filtro.</p> : null}
        </div>
      </section>

      {selectedLead ? (
        <LeadDetailModal
          lead={selectedLead}
          token={token}
          onClose={() => setSelectedLead(null)}
          onSaved={(updatedLead) => {
            setSelectedLead(updatedLead);
            leads.reload();
          }}
        />
      ) : null}
      {showContactTypePicker ? (
        <ContactTypePicker onClose={() => setShowContactTypePicker(false)} onSelect={openContactForm} />
      ) : null}
      {showForm ? (
        <ModalShell
          title={newContactType === "supplier" ? "Nuevo proveedor" : "Nuevo cliente"}
          eyebrow="Ficha de contacto"
          onClose={() => setShowForm(false)}
        >
          {newContactType === "supplier" ? (
            <SupplierForm onCancel={() => setShowForm(false)} />
          ) : (
            <LeadForm
              token={token}
              initialCustomerLevel={newCustomerLevel}
              onCancel={() => setShowForm(false)}
              onDone={() => { setShowForm(false); leads.reload(); }}
            />
          )}
        </ModalShell>
      ) : null}
    </div>
  );
}

function ContactTypePicker({ onClose, onSelect }) {
  const [showClientLevels, setShowClientLevels] = useState(false);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article
        className="contact-type-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-type-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h3 id="contact-type-title">¿Qué contacto quieres crear?</h3>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar ventana">
            <X size={18} />
          </button>
        </header>
        <div className="contact-type-options">
          <button type="button" onClick={() => setShowClientLevels((value) => !value)}>
            <span>
              <strong>Cliente</strong>
              <small>Empresa o particular al que vendes productos o servicios</small>
            </span>
            <ChevronRight size={20} />
          </button>
          {showClientLevels ? (
            <div className="customer-level-options">
              {CUSTOMER_LEVELS.map((level) => (
                <button key={level.id} type="button" onClick={() => onSelect("client", level)}>
                  <span>
                    <strong>{level.label} · {level.title}</strong>
                    <small>{level.description} · Descuento {discountLabel(level.discountPercent, level.discountMaxPercent)}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" onClick={() => onSelect("supplier")}>
            <span>
              <strong>Proveedor</strong>
              <small>Empresa a la que compras productos o servicios</small>
            </span>
            <ChevronRight size={20} />
          </button>
        </div>
      </article>
    </div>
  );
}

function SupplierForm({ onCancel }) {
  return (
    <form className="modal-form lead-form">
      <input placeholder="Nombre comercial" />
      <input placeholder="Razón social" />
      <input placeholder="NIF / CIF" />
      <input placeholder="Email" />
      <input placeholder="Teléfono" />
      <input placeholder="Dirección" />
      <input placeholder="C.P." />
      <input placeholder="Población" />
      <input placeholder="Ciudad" />
      <input placeholder="Provincia" />
      <input placeholder="País" defaultValue="ES" />
      <input placeholder="Notas internas" />
      <p className="form-help">Formulario preparado. La persistencia de proveedores se conectará cuando creemos su tabla en backend.</p>
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button>
        <button className="primary-button" type="button" disabled>Guardar proveedor</button>
      </div>
    </form>
  );
}

function LeadsView({ token }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const leads = useResource(() => apiRequest("/api/sales/leads?limit=200", { token }), [token]);

  return (
    <Panel
      title="Clientes"
      action={
        <button className="secondary-button" onClick={() => setShowForm(true)}>
          <Plus size={16} />
          Nuevo
        </button>
      }
    >
      {leads.error ? <p className="form-error">{leads.error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>NIF/CIF</th>
              <th>Empresa</th>
              <th>Contacto</th>
              <th>Población</th>
              <th>Creado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(leads.data?.items || []).map((lead) => (
              <tr
                key={lead.id}
                className="clickable-row"
                onClick={() => setSelectedLead(lead)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedLead(lead);
                  }
                }}
              >
                <td>{lead.fullName}</td>
                <td>{customerTypeLabel(lead.customerType)}</td>
                <td>{lead.taxId || "-"}</td>
                <td>{lead.companyName}</td>
                <td>
                  <strong>{lead.email}</strong>
                  <span>{lead.phone}</span>
                </td>
                <td>{lead.population || lead.city}</td>
                <td>{shortDate(lead.createdAt)}</td>
                <td className="row-action">
                  <ChevronRight size={17} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedLead ? (
        <LeadDetailModal
          lead={selectedLead}
          token={token}
          onClose={() => setSelectedLead(null)}
          onSaved={(updatedLead) => {
            setSelectedLead(updatedLead);
            leads.reload();
          }}
        />
      ) : null}
      {showForm ? (
        <ModalShell title="Nuevo cliente" eyebrow="Ficha de cliente" onClose={() => setShowForm(false)}>
          <LeadForm token={token} onCancel={() => setShowForm(false)} onDone={() => { setShowForm(false); leads.reload(); }} />
        </ModalShell>
      ) : null}
    </Panel>
  );
}

function ModalShell({ title, eyebrow, children, onClose, size = "" }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article
        className={`product-detail ${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${title.replace(/\s+/g, "-").toLowerCase()}-title`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="product-detail-header">
          <div>
            <p>{eyebrow}</p>
            <h3 id={`${title.replace(/\s+/g, "-").toLowerCase()}-title`}>{title}</h3>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar ventana">
            <X size={18} />
          </button>
        </header>
        {children}
      </article>
    </div>
  );
}

function LeadDetailModal({ lead, token, onClose, onSaved }) {
  const [draft, setDraft] = useState(() => leadToDraft(lead));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viesMessage, setViesMessage] = useState("");
  const [viesChecking, setViesChecking] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("documents");
  const paymentNotificationsAllowed = !["level_1", "level_2"].includes(draft.customerLevel);
  const quotes = useResource(() => apiRequest("/api/sales/quotes?limit=200", { token }), [token]);
  const leadQuotes = (quotes.data?.items || []).filter((quote) => quote.leadId === lead.id);

  useEffect(() => {
    setDraft(leadToDraft(lead));
    setEditing(false);
    setActiveTab("documents");
  }, [lead]);

  async function saveProfile() {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const result = await apiRequest(`/api/sales/leads/${lead.id}`, {
        token,
        method: "PATCH",
        body: {
          ...draft,
          fullName: fullNameFromDraft(draft),
          defaultTaxRate: draft.taxIdentifierType === "sujeto_pasivo" || draft.viesValid ? 0 : draft.defaultTaxRate,
          paymentNotificationsEnabled: paymentNotificationsAllowed && draft.paymentNotificationsEnabled
        }
      });
      onSaved?.(result.item);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function validateDetailVies() {
    setViesMessage("");
    setError("");
    setViesChecking(true);
    try {
      const payload = await apiRequest("/api/sales/vies/validate", {
        token,
        method: "POST",
        body: { countryCode: draft.country, vatNumber: draft.taxId }
      });
      const result = payload?.result;
      const isValid = Boolean(result?.valid);
      setDraft((current) => ({
        ...current,
        viesEnabled: true,
        viesValid: isValid,
        defaultTaxRate: isValid ? 0 : current.defaultTaxRate
      }));
      setViesMessage(isValid ? `VIES válido${result.name ? ` · ${result.name}` : ""}` : "No consta como válido en VIES.");
    } catch (err) {
      setError(err.message);
    } finally {
      setViesChecking(false);
    }
  }

  function checkDetailWhatsapp() {
    setDraft((current) => ({
      ...current,
      whatsappStatus: "pending",
      whatsappCheckedAt: new Date().toISOString()
    }));
    setWhatsappMessage("Comprobación preparada. Falta conectar WhatsApp Business API para validar este móvil automáticamente.");
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article
        className="product-detail lead-detail lead-record-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="lead-record-header">
          <div className="lead-record-title">
            <UsersRound size={21} />
            <div>
              <p>{customerTypeLabel(draft.customerType)} · Moneda: EUR</p>
              <h3 id="lead-detail-title">{fullNameFromDraft(draft) || draft.companyName || "Contacto"}</h3>
            </div>
            <span className="contact-class-badge">C</span>
          </div>
          <div className="modal-header-actions">
            {editing ? (
              <button className="secondary-button" type="button" onClick={saveProfile} disabled={saving || !token}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            ) : null}
            <button className="icon-button" onClick={onClose} aria-label="Cerrar ficha">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="lead-record-body">
          <div className="lead-summary-grid">
            <LeadSummaryCard title="Datos básicos" onEdit={() => setEditing(true)}>
              <SummaryLine label="Datos de facturación" value={draft.companyName || fullNameFromDraft(draft)} />
              <SummaryLine label="Mostrar como" value={fullNameFromDraft(draft) || draft.companyName} />
              <SummaryLine label="Perfil de cliente" value={customerLevelLabel(draft.customerLevel)} />
              <SummaryLine label="Identificador fiscal" value={draft.taxId || "Sin NIF/CIF"} />
              <SummaryLine label="Descuento" value={discountLabel(draft.defaultDiscountPercent, draft.defaultDiscountMaxPercent)} />
            </LeadSummaryCard>

            <LeadSummaryCard title="Direcciones" onEdit={() => setEditing(true)}>
              <SummaryLine label="Dirección fiscal" value={[draft.address, draft.postalCode, draft.population || draft.city].filter(Boolean).join(", ") || "Sin dirección fiscal"} />
              <SummaryLine label="Provincia" value={draft.province || "-"} />
              <SummaryLine label="País" value={countryLabel(draft.country)} />
              <SummaryLine label="Direcciones adicionales" value={`${draft.additionalAddresses.length} registradas`} />
            </LeadSummaryCard>

            <LeadSummaryCard title="Comunicación" onEdit={() => setEditing(true)}>
              <SummaryLine label="Principal" value={draft.email || "Sin email"} icon={<Mail size={16} />} />
              <SummaryLine label="Teléfono" value={draft.phone || "-"} />
              <SummaryLine label="Móvil" value={draft.mobilePhone || "-"} icon={<MessageCircle size={16} />} />
              <SummaryLine label="Contactos adicionales" value={`${draft.communicationContacts.length} registrados`} />
            </LeadSummaryCard>

            <LeadSummaryCard title="Preferencias del cliente" onEdit={() => setEditing(true)}>
              <SummaryLine label="Impuestos como cliente" value={draft.defaultTaxRate === 0 ? "Exento / sujeto pasivo" : `${draft.defaultTaxRate ?? 21}%`} />
              <SummaryLine label="Método de cobro" value={draft.preferredPaymentMethod || "Sin definir"} />
              <SummaryLine label="Plazo de cobro" value={draft.paymentTermDays ? `${draft.paymentTermDays} días` : "Sin definir"} />
              <SummaryLine label="Notificaciones" value={draft.paymentNotificationsEnabled ? "Activadas" : "Sin activar"} />
            </LeadSummaryCard>

            <LeadSummaryCard title="Otros" onEdit={() => setEditing(true)} compact>
              <p className="summary-notes">{draft.notes || "No hay información adicional"}</p>
            </LeadSummaryCard>
          </div>

          {editing ? (
            <div className="lead-edit-panel">
              <LeadMainFields
                form={draft}
                setForm={setDraft}
                onValidateVies={validateDetailVies}
                viesChecking={viesChecking}
                viesMessage={viesMessage}
                onViesInputChange={() => setViesMessage("")}
                onCheckWhatsapp={checkDetailWhatsapp}
                whatsappMessage={whatsappMessage}
              />

              <LeadCrmFields
                form={draft}
                setForm={setDraft}
                paymentNotificationsAllowed={paymentNotificationsAllowed}
                fallbackCountry={lead.country || "ES"}
              />
            </div>
          ) : null}

          <div className="lead-record-tabs" role="tablist" aria-label="Información del cliente">
            <button className={activeTab === "documents" ? "active" : ""} type="button" onClick={() => setActiveTab("documents")}>
              Documentos
            </button>
            <button className={activeTab === "more" ? "active" : ""} type="button" onClick={() => setActiveTab("more")}>
              Más información
            </button>
          </div>

          {activeTab === "documents" ? (
            <LeadDocumentsPanel quotes={leadQuotes} loading={quotes.loading} error={quotes.error} />
          ) : (
            <LeadMoreInfoPanel lead={lead} draft={draft} />
          )}

          {error ? <p className="form-error">{error}</p> : null}
        </div>
      </article>
    </div>
  );
}

function LeadSummaryCard({ title, children, onEdit, compact = false }) {
  return (
    <section className={`lead-summary-card ${compact ? "compact" : ""}`}>
      <header>
        <h4>{title}</h4>
        <button className="tiny-icon-button" type="button" onClick={onEdit} aria-label={`Modificar ${title}`}>
          <Pencil size={15} />
        </button>
      </header>
      <div className="lead-summary-content">{children}</div>
    </section>
  );
}

function SummaryLine({ label, value, icon }) {
  return (
    <div className="summary-line">
      <span>{label}</span>
      <strong>
        {icon}
        {value || "-"}
      </strong>
    </div>
  );
}

function LeadDocumentsPanel({ quotes, loading, error }) {
  return (
    <section className="lead-tab-panel documents-panel">
      <header>
        <div>
          <h4>Documentos</h4>
          <p>Presupuestos y futuras facturas vinculadas a este cliente.</p>
        </div>
        <button className="primary-button" type="button">Crear</button>
      </header>

      <div className="documents-toolbar">
        <select defaultValue="all" aria-label="Tipo de documento">
          <option value="all">Todos los documentos</option>
          <option value="quote">Presupuestos</option>
          <option value="invoice">Facturas</option>
        </select>
        <div className="contacts-search document-search">
          <Search size={18} />
          <input placeholder="Buscar..." readOnly />
        </div>
        <select defaultValue="all_dates" aria-label="Fechas">
          <option value="all_dates">Todas las fechas</option>
        </select>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      <div className="table-wrap lead-documents-table">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Detalle</th>
              <th>Vencimiento</th>
              <th>Saldo pendiente</th>
              <th>Subtotal</th>
              <th>Total</th>
              <th>Moneda</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8">Cargando documentos...</td></tr>
            ) : quotes.length ? (
              quotes.map((quote) => (
                <tr key={quote.id} className="clickable-row" tabIndex={0}>
                  <td>{dateOnly(quote.createdAt)}</td>
                  <td>
                    <a className="document-link" href={`#quote-${quote.id}`}>
                      <FileText size={16} />
                      <span>
                        <strong>{quote.quoteNumber || "Presupuesto"}</strong>
                        <small>{quote.notes || "Presupuesto vinculado al cliente"}</small>
                      </span>
                    </a>
                  </td>
                  <td>{dateOnly(addDays(quote.createdAt, 30))}</td>
                  <td>{quote.status === "accepted" ? money(0) : money(quote.total)}</td>
                  <td>{money(quote.subtotal)}</td>
                  <td>{money(quote.total)}</td>
                  <td>{quote.currency || "EUR"}</td>
                  <td><span className={`document-status ${quote.status || "draft"}`}>{quote.status || "draft"}</span></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="8">No hay documentos vinculados a este cliente.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LeadMoreInfoPanel({ lead, draft }) {
  const activity = [
    lead.updatedAt && lead.updatedAt !== lead.createdAt
      ? { date: lead.updatedAt, user: "Usuario del panel", type: "Cliente modificado" }
      : null,
    lead.createdAt ? { date: lead.createdAt, user: "Usuario del panel", type: "Cliente creado" } : null
  ].filter(Boolean);

  return (
    <div className="lead-more-info">
      <section className="lead-tab-panel">
        <header>
          <div>
            <h4>Comentarios</h4>
            <p>{draft.notes || "Sin comentarios"}</p>
          </div>
          <button className="secondary-button" type="button">Añadir comentario</button>
        </header>
      </section>

      <section className="lead-tab-panel">
        <header>
          <div>
            <h4>Adjuntos</h4>
            <p>Sin archivos adjuntos</p>
          </div>
          <button className="secondary-button" type="button">
            <Paperclip size={16} />
            Añadir adjunto
          </button>
        </header>
      </section>

      <section className="lead-tab-panel activity-panel">
        <header>
          <div>
            <h4>Actividad</h4>
            <p>Registro de movimientos del cliente. La auditoría completa por usuario se conectará al backend.</p>
          </div>
          <History size={20} />
        </header>
        <div className="table-wrap activity-table">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Responsable</th>
                <th>Tipo de actividad</th>
              </tr>
            </thead>
            <tbody>
              {activity.length ? activity.map((item, index) => (
                <tr key={`${item.type}-${index}`}>
                  <td>{shortDate(item.date)}</td>
                  <td>{item.user}</td>
                  <td>{item.type}</td>
                </tr>
              )) : (
                <tr><td colSpan="3">Sin actividad registrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function LeadForm({ token, onDone, onCancel, initialCustomerLevel }) {
  return (
    <LeadFormFields
      initialCustomerLevel={initialCustomerLevel}
      onSubmit={(form) => apiRequest("/api/sales/leads", { token, method: "POST", body: form })}
      onValidateVies={(body) => apiRequest("/api/sales/vies/validate", { token, method: "POST", body })}
      onCancel={onCancel}
      onDone={onDone}
    />
  );
}

function LeadMainFields({
  form,
  setForm,
  onValidateVies,
  viesChecking = false,
  viesMessage = "",
  onViesInputChange,
  onCheckWhatsapp,
  whatsappMessage = ""
}) {
  const viesInvalid = Boolean(viesMessage && !form.viesValid && !viesChecking);
  const viesButtonClass = [
    "secondary-button",
    form.viesValid ? "vies-validated-button" : "",
    viesInvalid ? "vies-invalid-button" : ""
  ].filter(Boolean).join(" ");

  return (
    <section className="crm-section lead-main-edit">
      <header>
        <div>
          <h4>Datos del contacto</h4>
          <p>Información general, fiscal y dirección principal.</p>
        </div>
      </header>
      <div className="lead-main-grid contact-data-grid">
        <label className="lead-level-field contact-level-field">
          <span>Nivel de cliente</span>
          <select
            value={form.customerLevel}
            onChange={(event) => {
              const level = customerLevelById(event.target.value);
              setForm({
                ...form,
                customerLevel: level.id,
                customerType: level.customerType,
                companyName: level.customerType === "particular" ? "" : form.companyName,
                country: level.country,
                defaultDiscountPercent: level.discountPercent,
                defaultDiscountMaxPercent: level.discountMaxPercent || level.discountPercent,
                paymentNotificationsEnabled:
                  !["level_1", "level_2"].includes(level.id) && form.paymentNotificationsEnabled
              });
            }}
          >
            {CUSTOMER_LEVELS.map((level) => (
              <option key={level.id} value={level.id}>
                {level.label} · {level.title} · {discountLabel(level.discountPercent, level.discountMaxPercent)}
              </option>
            ))}
          </select>
        </label>
        <label className="lead-discount-field">
          <span>Descuento</span>
          <div>
            <input
              placeholder="%"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.defaultDiscountPercent}
              onChange={(event) =>
                setForm({ ...form, defaultDiscountPercent: event.target.value, defaultDiscountMaxPercent: event.target.value })
              }
            />
            <span>%</span>
          </div>
        </label>
        <label className="field-with-label tax-contact-field">
          <span>Identificador fiscal</span>
          <div className="tax-contact-stack">
            <select
              value={form.taxIdentifierType}
              onChange={(event) => {
                const type = event.target.value;
                onViesInputChange?.();
                setForm({
                  ...form,
                  taxIdentifierType: type,
                  defaultTaxRate: type === "sujeto_pasivo" ? 0 : form.viesValid ? 0 : 21
                });
              }}
              aria-label="Tipo de identificador fiscal"
            >
              <option value="nif">NIF</option>
              <option value="cif">CIF</option>
              <option value="sujeto_pasivo">Sujeto pasivo</option>
            </select>
            <div className="tax-id-field">
              <input
                placeholder={taxIdentifierPlaceholder(form.taxIdentifierType)}
                value={form.taxId}
                onChange={(event) => {
                  onViesInputChange?.();
                  setForm({ ...form, taxId: event.target.value.toUpperCase(), viesValid: false });
                }}
              />
              {form.viesValid ? <CheckCircle2 size={18} /> : null}
            </div>
            <button
              className={viesButtonClass}
              type="button"
              onClick={onValidateVies}
              disabled={!form.country || !form.taxId || viesChecking || !onValidateVies}
            >
              {form.viesValid ? <CheckCircle2 size={16} /> : null}
              {viesChecking ? "Validando..." : form.viesValid ? "VIES validado" : viesInvalid ? "VIES no válido" : "Validar VIES"}
            </button>
          </div>
        </label>
        <input placeholder="Nombre" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
        <input placeholder="Apellidos" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
        {form.customerType !== "particular" ? (
          <input placeholder="Empresa" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
        ) : <span className="hidden-grid-cell" aria-hidden="true" />}
        <input placeholder="Dirección" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        <input placeholder="C.P." value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
        <input placeholder="Población" value={form.population} onChange={(event) => setForm({ ...form, population: event.target.value })} />
        <input placeholder="Ciudad" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        <input placeholder="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <label className="field-with-label whatsapp-contact-field compact-field-label">
          <div className="whatsapp-contact-stack">
            <input
              placeholder="Teléfono Móvil"
              value={form.mobilePhone || ""}
              onChange={(event) => setForm({ ...form, mobilePhone: event.target.value, whatsappStatus: "unknown" })}
            />
            <button
              className="secondary-button"
              type="button"
              onClick={onCheckWhatsapp}
              disabled={!form.mobilePhone || !onCheckWhatsapp}
            >
              <MessageCircle size={16} />
              Comprobar WhatsApp
            </button>
          </div>
        </label>
        <input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <label className="field-with-label compact-field-label">
          <select
            value={form.country}
            onChange={(event) => {
              onViesInputChange?.();
              setForm({ ...form, country: event.target.value, viesValid: false });
            }}
          >
            {EUROPEAN_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>{country.label}</option>
            ))}
          </select>
        </label>
        <input placeholder="Provincia" value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} />
        {whatsappMessage ? <p className="form-help whatsapp-help">{whatsappMessage}</p> : null}
        <textarea
          className="contact-notes-field"
          placeholder="Notas internas"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
      </div>
    </section>
  );
}

function LeadCrmFields({ form, setForm, paymentNotificationsAllowed, fallbackCountry = "ES" }) {
  function updateListItem(listName, index, patch) {
    setForm((current) => ({
      ...current,
      [listName]: current[listName].map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }));
  }

  function removeListItem(listName, index) {
    setForm((current) => ({
      ...current,
      [listName]: current[listName].filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  return (
    <>
      <section className="crm-section">
        <header>
          <div>
            <h4>Direcciones adicionales</h4>
            <p>Úsalas para envíos, obras o sedes alternativas.</p>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              setForm((current) => ({
                ...current,
                additionalAddresses: [...current.additionalAddresses, emptyAdditionalAddress(current.country || fallbackCountry)]
              }))
            }
          >
            <Plus size={16} />
            Añadir dirección
          </button>
        </header>
        <div className="crm-list">
          {form.additionalAddresses.map((address, index) => (
            <div className="crm-row address-row" key={`address-${index}`}>
              <input placeholder="Nombre de dirección" value={address.label || ""} onChange={(event) => updateListItem("additionalAddresses", index, { label: event.target.value })} />
              <input placeholder="Dirección" value={address.address || ""} onChange={(event) => updateListItem("additionalAddresses", index, { address: event.target.value })} />
              <input placeholder="C.P." value={address.postalCode || ""} onChange={(event) => updateListItem("additionalAddresses", index, { postalCode: event.target.value })} />
              <input placeholder="Población" value={address.city || ""} onChange={(event) => updateListItem("additionalAddresses", index, { city: event.target.value })} />
              <input placeholder="Provincia" value={address.province || ""} onChange={(event) => updateListItem("additionalAddresses", index, { province: event.target.value })} />
              <input placeholder="País" value={address.country || ""} onChange={(event) => updateListItem("additionalAddresses", index, { country: event.target.value.toUpperCase() })} />
              <button className="tiny-icon-button danger" type="button" onClick={() => removeListItem("additionalAddresses", index)} aria-label="Eliminar dirección">
                <X size={14} />
              </button>
            </div>
          ))}
          {!form.additionalAddresses.length ? <p className="empty compact-empty">No hay direcciones adicionales.</p> : null}
        </div>
      </section>

      <section className="crm-section">
        <header>
          <div>
            <h4>Comunicación</h4>
            <p>Contactos útiles para compras, administración, obra o instalación.</p>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              setForm((current) => ({
                ...current,
                communicationContacts: [...current.communicationContacts, emptyCommunicationContact()]
              }))
            }
          >
            <Plus size={16} />
            Añadir contacto
          </button>
        </header>
        <div className="crm-list">
          {form.communicationContacts.map((contact, index) => (
            <div className="crm-row communication-row" key={`communication-${index}`}>
              <input placeholder="Nombre" value={contact.name || ""} onChange={(event) => updateListItem("communicationContacts", index, { name: event.target.value })} />
              <input placeholder="Email" value={contact.email || ""} onChange={(event) => updateListItem("communicationContacts", index, { email: event.target.value })} />
              <input placeholder="Teléfono" value={contact.phone || ""} onChange={(event) => updateListItem("communicationContacts", index, { phone: event.target.value })} />
              <button className="tiny-icon-button danger" type="button" onClick={() => removeListItem("communicationContacts", index)} aria-label="Eliminar contacto">
                <X size={14} />
              </button>
            </div>
          ))}
          {!form.communicationContacts.length ? <p className="empty compact-empty">No hay contactos de comunicación.</p> : null}
        </div>
      </section>

      <section className="crm-section">
        <header>
          <div>
            <h4>Preferencias del cliente</h4>
            <p>Condiciones habituales de cobro para presupuestos y futuras facturas.</p>
          </div>
        </header>
        <div className="crm-preferences-grid">
          <label>
            <span>Método de cobro preferido</span>
            <select value={form.preferredPaymentMethod} onChange={(event) => setForm({ ...form, preferredPaymentMethod: event.target.value })}>
              <option value="">Sin definir</option>
              <option value="transferencia">Transferencia bancaria</option>
              <option value="recibo">Recibo domiciliado</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </label>
          <label>
            <span>Plazo de cobro</span>
            <select value={form.paymentTermDays} onChange={(event) => setForm({ ...form, paymentTermDays: event.target.value })}>
              <option value="">Sin definir</option>
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
            </select>
          </label>
        </div>
      </section>

      <section className="crm-section notifications-section">
        <header>
          <div>
            <h4>Notificaciones</h4>
            <p>Las alertas de plazo de cobro serán informativas y se usarán en clientes de nivel 3 y distribuidores.</p>
          </div>
          <Bell size={20} />
        </header>
        <label className={paymentNotificationsAllowed ? "notification-toggle" : "notification-toggle disabled"}>
          <input
            type="checkbox"
            checked={paymentNotificationsAllowed && form.paymentNotificationsEnabled}
            disabled={!paymentNotificationsAllowed}
            onChange={(event) => setForm({ ...form, paymentNotificationsEnabled: event.target.checked })}
          />
          <span>
            {paymentNotificationsAllowed
              ? "Crear aviso informativo según el plazo de cobro."
              : "No disponible para clientes de nivel 1 y nivel 2."}
          </span>
        </label>
      </section>
    </>
  );
}

function LeadFormFields({
  onSubmit,
  onDone,
  onCancel,
  onValidateVies,
  submitLabel = "Guardar",
  initialCustomerLevel = CUSTOMER_LEVELS[0]
}) {
  const defaultLevel = customerLevelById(initialCustomerLevel?.id || initialCustomerLevel);
  const [form, setForm] = useState({
    customerLevel: defaultLevel.id,
    customerType: defaultLevel.customerType,
    defaultDiscountPercent: defaultLevel.discountPercent,
    defaultDiscountMaxPercent: defaultLevel.discountMaxPercent || defaultLevel.discountPercent,
    defaultTaxRate: 21,
    firstName: "",
    lastName: "",
    fullName: "",
    companyName: "",
    taxIdentifierType: "nif",
    viesEnabled: false,
    viesValid: false,
    taxId: "",
    email: "",
    phone: "",
    mobilePhone: "",
    whatsappStatus: "unknown",
    whatsappCheckedAt: null,
    address: "",
    postalCode: "",
    population: "",
    city: "",
    province: "",
    country: defaultLevel.country,
    notes: "",
    additionalAddresses: [],
    communicationContacts: [],
    preferredPaymentMethod: "",
    paymentTermDays: "",
    paymentNotificationsEnabled: !["level_1", "level_2"].includes(defaultLevel.id)
  });
  const [error, setError] = useState("");
  const [viesMessage, setViesMessage] = useState("");
  const [viesChecking, setViesChecking] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const paymentNotificationsAllowed = !["level_1", "level_2"].includes(form.customerLevel);

  async function submit(event) {
    event?.preventDefault();
    setError("");
    try {
      const result = await onSubmit({
        ...form,
        fullName: fullNameFromDraft(form),
        defaultTaxRate: form.taxIdentifierType === "sujeto_pasivo" || form.viesValid ? 0 : form.defaultTaxRate
      });
      onDone?.(result, form);
    } catch (err) {
      setError(err.message);
    }
  }

  async function validateVies() {
    setViesMessage("");
    setError("");
    setViesChecking(true);
    try {
      const payload = await onValidateVies?.({ countryCode: form.country, vatNumber: form.taxId });
      const result = payload?.result;
      const isValid = Boolean(result?.valid);
      setForm((current) => ({
        ...current,
        viesEnabled: true,
        viesValid: isValid,
        defaultTaxRate: isValid ? 0 : current.defaultTaxRate
      }));
      setViesMessage(isValid ? `VIES válido${result.name ? ` · ${result.name}` : ""}` : "No consta como válido en VIES.");
    } catch (err) {
      setViesMessage("");
      setError(err.message);
    } finally {
      setViesChecking(false);
    }
  }

  function checkWhatsapp() {
    setForm((current) => ({
      ...current,
      whatsappStatus: "pending",
      whatsappCheckedAt: new Date().toISOString()
    }));
    setWhatsappMessage("Comprobación preparada. Falta conectar WhatsApp Business API para validar este móvil automáticamente.");
  }

  return (
    <form className="modal-form lead-form" onSubmit={submit}>
      <LeadMainFields
        form={form}
        setForm={setForm}
        onValidateVies={validateVies}
        viesChecking={viesChecking}
        viesMessage={viesMessage}
        onViesInputChange={() => setViesMessage("")}
        onCheckWhatsapp={checkWhatsapp}
        whatsappMessage={whatsappMessage}
      />
      <p className="form-help">Este descuento se aplicará por defecto al crear presupuestos para este cliente.</p>
      <LeadCrmFields
        form={form}
        setForm={setForm}
        paymentNotificationsAllowed={paymentNotificationsAllowed}
        fallbackCountry={form.country || defaultLevel.country}
      />
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        {onCancel ? <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button> : null}
        <button className="primary-button" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}

const QUOTE_TEMPLATES = [
  {
    id: "k2-zp-1-5",
    name: "K2+ZP+1,5",
    description: "Kit 240, base plana y 1,5 m de tubo",
    lines: [
      { sku: "K240", quantity: 1, discountPercent: 0 },
      { sku: "ZP240", quantity: 1, discountPercent: 0 },
      { sku: "T2401000", quantity: 1, discountPercent: 0 },
      { sku: "T240500", quantity: 1, discountPercent: 0 }
    ]
  }
];

function QuotesView({ token }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const quotes = useResource(() => apiRequest("/api/sales/quotes?limit=200", { token }), [token]);

  function openEmptyQuote() {
    setSelectedTemplate(null);
    setShowForm(true);
  }

  function openTemplateQuote(templateId) {
    const template = QUOTE_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    setSelectedTemplate(template);
    setShowForm(true);
  }

  return (
    <Panel
      title="Presupuestos"
      action={
        <div className="panel-actions">
          <select
            aria-label="Presupuestos predefinidos"
            value=""
            onChange={(event) => openTemplateQuote(event.target.value)}
          >
            <option value="">Presupuestos predefinidos</option>
            {QUOTE_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
          <button className="secondary-button" onClick={openEmptyQuote}>
            <Plus size={16} />
            Nuevo
          </button>
        </div>
      }
    >
      {quotes.error ? <p className="form-error">{quotes.error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {(quotes.data?.items || []).map((quote) => (
              <tr key={quote.id}>
                <td>{quote.quoteNumber}</td>
                <td>{quote.status}</td>
                <td>{money(quote.total)}</td>
                <td>{shortDate(quote.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm ? (
        <ModalShell
          title={selectedTemplate ? selectedTemplate.name : "Nuevo presupuesto"}
          eyebrow={selectedTemplate ? "Presupuesto predefinido" : "Presupuesto"}
          size="wide-modal"
          onClose={() => setShowForm(false)}
        >
          <QuoteForm
            token={token}
            template={selectedTemplate}
            onCancel={() => setShowForm(false)}
            onDone={() => { setShowForm(false); quotes.reload(); }}
          />
        </ModalShell>
      ) : null}
    </Panel>
  );
}

function DownloadsView() {
  const downloadSections = [
    { title: "Catálogos", description: "Documentación comercial y catálogos por idioma." },
    { title: "Fichas Técnicas", description: "Fichas de producto, medidas y documentación técnica." },
    { title: "Normativas", description: "Documentos normativos y referencias de instalación." },
    { title: "Certificados", description: "Certificaciones, garantías y documentación oficial." }
  ];

  return (
    <Panel title="Descargas">
      <div className="download-grid">
        {downloadSections.map((section) => (
          <button className="download-card" key={section.title} type="button">
            <Download size={22} />
            <strong>{section.title}</strong>
            <span>{section.description}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function QuoteForm({ token, onDone, onCancel, template }) {
  const leads = useResource(() => apiRequest("/api/sales/leads?limit=200", { token }), [token]);
  const catalog = useResource(() => apiRequest("/api/catalog/products?locale=es&channel=sales_app", { token }), [token]);
  const [clientMode, setClientMode] = useState("existing");
  const [leadQuery, setLeadQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [lines, setLines] = useState(() => {
    if (template?.lines?.length) {
      return template.lines.map((line) => ({
        id: crypto.randomUUID(),
        skuQuery: line.sku,
        sku: line.sku,
        quantity: line.quantity || 1,
        discountPercent: line.discountPercent || 0
      }));
    }

    return [{ id: crypto.randomUUID(), skuQuery: "K240", sku: "K240", quantity: 1, discountPercent: 0 }];
  });
  const [draggingLineId, setDraggingLineId] = useState("");
  const [taxRate, setTaxRate] = useState(21);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const lineReferenceRefs = useRef({});
  const lastDiscountLeadId = useRef("");

  const products = catalog.data?.products || [];
  const leadsList = leads.data?.items || [];
  const leadOptionLabel = (lead) =>
    `${lead.fullName}${lead.companyName ? ` · ${lead.companyName}` : ""}${lead.taxId ? ` · ${lead.taxId}` : ""}`;
  const selectedLead = leadsList.find((lead) => lead.id === selectedLeadId) || null;
  const filteredLeads = useMemo(() => {
    const needle = leadQuery.trim().toLowerCase();
    if (!needle) return leadsList;
    return leadsList.filter((lead) =>
      [lead.fullName, lead.companyName, lead.email, lead.phone, lead.taxId].some((value) =>
        String(value || "").toLowerCase().includes(needle)
      )
    );
  }, [leadsList, leadQuery]);

  useEffect(() => {
    if (!selectedLead || lastDiscountLeadId.current === selectedLead.id) return;

    lastDiscountLeadId.current = selectedLead.id;
    const defaultDiscount = Number(selectedLead.defaultDiscountPercent || 0);
    if (selectedLead.defaultTaxRate !== null && selectedLead.defaultTaxRate !== undefined) {
      setTaxRate(Number(selectedLead.defaultTaxRate));
    }
    if (defaultDiscount <= 0) return;

    setLines((current) =>
      current.map((line) => {
        if (Number(line.discountPercent || 0) > 0) return line;
        return { ...line, discountPercent: defaultDiscount };
      })
    );
  }, [selectedLead]);

  function productForLine(line) {
    return products.find((product) => product.sku === line.skuQuery.trim()) || products.find((product) => product.sku === line.sku) || null;
  }

  function lineTotal(line) {
    const product = productForLine(line);
    return (product?.pricePvpEur || 0) * Number(line.quantity || 0) * (1 - Number(line.discountPercent || 0) / 100);
  }

  function updateLine(lineId, patch) {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  }

  function createEmptyLine() {
    return { id: crypto.randomUUID(), skuQuery: "", sku: "", quantity: 1, discountPercent: 0 };
  }

  function addLine(focus = false) {
    const nextLine = createEmptyLine();
    setLines((current) => [...current, nextLine]);
    if (focus) {
      window.setTimeout(() => lineReferenceRefs.current[nextLine.id]?.focus(), 0);
    }
  }

  function removeLine(lineId) {
    setLines((current) => {
      if (current.length === 1) return current;
      return current.filter((line) => line.id !== lineId);
    });
  }

  function moveLineTo(draggedLineId, targetLineId) {
    if (!draggedLineId || draggedLineId === targetLineId) return;

    setLines((current) => {
      const fromIndex = current.findIndex((line) => line.id === draggedLineId);
      const toIndex = current.findIndex((line) => line.id === targetLineId);
      if (fromIndex < 0 || toIndex < 0) return current;

      const next = [...current];
      const [line] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, line);
      return next;
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);
  const taxTotal = subtotal * (Number(taxRate) / 100);
  const total = subtotal + taxTotal;

  async function submit(event) {
    event?.preventDefault();
    setError("");
    try {
      let leadId = selectedLeadId || null;
      if (clientMode === "new") {
        setError("Guarda primero el cliente nuevo desde el bloque de cliente.");
        return;
      }

      await apiRequest("/api/sales/quotes", {
        token,
        method: "POST",
        body: {
          locale: "es",
          leadId,
          notes,
          taxTotal,
          items: lines
            .map((line) => ({
              sku: line.sku || line.skuQuery.trim(),
              quantity: Number(line.quantity),
              discountPercent: Number(line.discountPercent)
            }))
            .filter((line) => line.sku)
        }
      });
      onDone();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-form quote-modal-form">
      <section className="form-section">
        <header className="form-section-header">
          <h4>Cliente</h4>
          <div className="segmented-control">
            <button type="button" className={clientMode === "existing" ? "active" : ""} onClick={() => setClientMode("existing")}>
              Buscar
            </button>
            <button type="button" className={clientMode === "new" ? "active" : ""} onClick={() => setClientMode("new")}>
              Crear
            </button>
          </div>
        </header>

        {clientMode === "existing" ? (
          <div className="quote-client-tools">
            <input
              list="quote-client-suggestions"
              placeholder="Buscar cliente por nombre, empresa, email, teléfono o NIF/CIF"
              value={leadQuery}
              onChange={(event) => {
                const value = event.target.value;
                setLeadQuery(value);
                const exactLead = leadsList.find((lead) => leadOptionLabel(lead) === value);
                setSelectedLeadId(exactLead?.id || "");
              }}
            />
            <datalist id="quote-client-suggestions">
              {filteredLeads.map((lead) => (
                <option key={lead.id} value={leadOptionLabel(lead)} />
              ))}
            </datalist>
            <p className="selected-client">
              {selectedLead ? `${selectedLead.email || "Sin email"} · ${selectedLead.phone || "Sin teléfono"}` : "Sin cliente asignado"}
            </p>
          </div>
        ) : (
          <LeadFormFields
            submitLabel="Guardar cliente"
            onSubmit={(form) => apiRequest("/api/sales/leads", { token, method: "POST", body: form })}
            onValidateVies={(body) => apiRequest("/api/sales/vies/validate", { token, method: "POST", body })}
            onDone={(result) => {
              leads.reload();
              setSelectedLeadId(result.item.id);
              setLeadQuery(leadOptionLabel(result.item));
              setClientMode("existing");
            }}
          />
        )}
      </section>

      <section className="form-section">
        <header className="form-section-header">
          <h4>Líneas del presupuesto</h4>
        </header>
        {lines.map((line, index) => {
          const selectedProduct = productForLine(line);
          return (
            <div
              className={index === 0 ? "quote-line-card" : "quote-line-card compact-line"}
              key={line.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                moveLineTo(draggingLineId, line.id);
                setDraggingLineId("");
              }}
            >
              <button
                className="line-drag-handle"
                type="button"
                draggable
                aria-label="Arrastrar línea"
                title="Arrastrar línea"
                onDragStart={() => setDraggingLineId(line.id)}
                onDragEnd={() => setDraggingLineId("")}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
              <ProductThumbnail product={selectedProduct || { sku: line.sku }} />
              <label>
                <span>Referencia</span>
                <input
                  ref={(element) => {
                    if (element) lineReferenceRefs.current[line.id] = element;
                  }}
                  list="quote-product-suggestions"
                  placeholder="Referencia"
                  value={line.skuQuery}
                  onChange={(event) => {
                    const value = event.target.value.toUpperCase();
                    const matchedProduct = products.find((product) => product.sku === value);
                    updateLine(line.id, { skuQuery: value, sku: matchedProduct?.sku || "" });
                  }}
                />
              </label>
              <div className="quote-product-select">
                <span>Descripción</span>
                <strong>{selectedProduct?.title || "Producto no seleccionado"}</strong>
                <span>{selectedProduct?.shortDescription || "Selecciona un producto del catálogo"}</span>
              </div>
              <label>
                <span>Cantidad</span>
                <input
                  aria-label="Cantidad"
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                />
              </label>
              <label>
                <span>Descuento %</span>
                <input
                  aria-label="Descuento"
                  type="number"
                  min="0"
                  max="100"
                  value={line.discountPercent}
                  onChange={(event) => updateLine(line.id, { discountPercent: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Tab" && !event.shiftKey && index === lines.length - 1) {
                      event.preventDefault();
                      addLine(true);
                    }
                  }}
                />
              </label>
              <div className="quote-line-total">
                <span>Importe</span>
                <strong>{money(lineTotal(line))}</strong>
              </div>
              <div className="quote-line-actions">
                <button
                  type="button"
                  className="tiny-icon-button danger"
                  onClick={() => removeLine(line.id)}
                  disabled={lines.length === 1}
                  aria-label="Eliminar línea"
                  title="Eliminar línea"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
        <datalist id="quote-product-suggestions">
          {products.map((product) => (
            <option key={product.sku} value={product.sku}>
              {product.title || product.slug}
            </option>
          ))}
        </datalist>
      </section>

      <section className="quote-totals">
        <label>
          IVA
          <select value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value))}>
            <option value="0">Exento · 0%</option>
            <option value="21">España · 21%</option>
            <option value="23">Portugal · 23%</option>
            <option value="22">Italia · 22%</option>
            <option value="20">Francia · 20%</option>
            <option value="19">Alemania · 19%</option>
          </select>
        </label>
        <div>
          <span>Base imponible</span>
          <strong>{money(subtotal)}</strong>
        </div>
        <div>
          <span>IVA</span>
          <strong>{money(taxTotal)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
      </section>

      <textarea placeholder="Notas" value={notes} onChange={(event) => setNotes(event.target.value)} />
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        {onCancel ? <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button> : null}
        <button className="primary-button" type="button" onClick={submit}>Crear presupuesto</button>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <label className="searchbar">
      <Search size={18} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function RefreshButton({ onClick, loading }) {
  return (
    <button className="icon-button" onClick={onClick} aria-label="Actualizar">
      <RefreshCw size={18} className={loading ? "spin" : ""} />
    </button>
  );
}

createRoot(document.getElementById("root")).render(<App />);
