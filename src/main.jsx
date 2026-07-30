import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Fingerprint,
  ImageIcon,
  Landmark,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Share2,
  Printer,
  Truck,
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

function inputDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function addDaysInput(value, days) {
  return inputDate(addDays(value, days));
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
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [globalInvoiceOpen, setGlobalInvoiceOpen] = useState(false);
  const [globalQuoteOpen, setGlobalQuoteOpen] = useState(false);
  const [globalContactPickerOpen, setGlobalContactPickerOpen] = useState(false);
  const [globalContactForm, setGlobalContactForm] = useState(null);
  const primaryNav = [
    { id: "dashboard", label: "Inicio" },
    { id: "documents", label: "Documento" },
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
  const documentViewIds = ["quotes", "delivery-notes", "proformas", "invoices"];
  const activeMoreItem = moreNav.find(
    (item) => item.id === activeView && !primaryNav.some((navItem) => navItem.id === item.id) && !documentViewIds.includes(item.id)
  );
  const visibleNav = activeMoreItem ? [...primaryNav, activeMoreItem] : primaryNav;

  function navigate(viewId, options = {}) {
    setMoreOpen(false);
    setCreateDrawerOpen(false);
    if (viewId === "contacts" && options.contactFilter) {
      setContactsInitialFilter(options.contactFilter);
    } else if (viewId !== "contacts") {
      setContactsInitialFilter("all");
    }
    onNavigate(viewId);
  }

  function openGlobalQuote() {
    setCreateDrawerOpen(false);
    setGlobalQuoteOpen(true);
  }

  function openGlobalInvoice() {
    setCreateDrawerOpen(false);
    setGlobalInvoiceOpen(true);
  }

  function openGlobalContactPicker() {
    setCreateDrawerOpen(false);
    setGlobalContactPickerOpen(true);
  }

  function openGlobalContactForm(type, level = CUSTOMER_LEVELS[0]) {
    setGlobalContactPickerOpen(false);
    setGlobalContactForm({ type, level });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="header-brand" type="button" onClick={() => navigate("dashboard")} aria-label="Ir a Inicio">
          <img src="/logo-backend.png" alt="Doinglight Intranet" />
        </button>
        <nav className="main-nav" aria-label="Navegación principal">
          {visibleNav.map((item) => {
            if (item.id === "documents") {
              return (
                <div className="nav-dropdown" key={item.id}>
                  <button
                    className={documentViewIds.includes(activeView) ? "nav-item active" : "nav-item"}
                    onClick={() => navigate("quotes")}
                    aria-haspopup="menu"
                  >
                    {item.label}
                  </button>
                  <div className="nav-submenu" role="menu">
                    <button type="button" onClick={() => navigate("quotes")} role="menuitem">
                      Presupuesto
                    </button>
                    <button type="button" onClick={() => navigate("delivery-notes")} role="menuitem">
                      Albarán
                    </button>
                    <button type="button" onClick={() => navigate("proformas")} role="menuitem">
                      Proforma
                    </button>
                    <button type="button" onClick={() => navigate("invoices")} role="menuitem">
                      Factura
                    </button>
                  </div>
                </div>
              );
            }

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
          {activeView === "dashboard" ? (
            <Dashboard
              token={session.token}
              locale={session.user.locale}
              user={session.user}
            />
          ) : null}
          {activeView === "settings" ? <SettingsView /> : null}
          {activeView === "invoices" ? <InvoicesMirrorView token={session.token} onCreateInvoice={openGlobalInvoice} /> : null}
          {activeView === "purchases" ? <ModuleWorkspace moduleId="purchases" /> : null}
          {activeView === "contacts" ? <ContactsView token={session.token} initialFilter={contactsInitialFilter} /> : null}
          {activeView === "banks" ? <ModuleWorkspace moduleId="banks" /> : null}
          {activeView === "delivery-notes" ? <DeliveryNotesView token={session.token} /> : null}
          {activeView === "proformas" ? <ModuleWorkspace moduleId="proformas" /> : null}
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

      <button className="global-create-button" type="button" onClick={() => setCreateDrawerOpen(true)} aria-label="Crear nuevo documento o registro">
        <Plus size={30} />
      </button>

      {createDrawerOpen ? (
        <CreateActionDrawer
          onClose={() => setCreateDrawerOpen(false)}
          onNavigate={navigate}
          onCreateInvoice={openGlobalInvoice}
          onCreateQuote={openGlobalQuote}
          onCreateContact={openGlobalContactPicker}
        />
      ) : null}
      {globalInvoiceOpen ? (
        <ModalShell
          title="Factura simplificada"
          eyebrow="Factura de venta"
          size="invoice-create-modal"
          onClose={() => setGlobalInvoiceOpen(false)}
        >
          <InvoiceCreateForm
            token={session.token}
            onCancel={() => setGlobalInvoiceOpen(false)}
            onNavigateSettings={() => {
              setGlobalInvoiceOpen(false);
              navigate("settings");
            }}
          />
        </ModalShell>
      ) : null}
      {globalQuoteOpen ? (
        <ModalShell
          title="Nuevo presupuesto"
          eyebrow="Presupuesto"
          size="wide-modal quote-work-modal"
          onClose={() => setGlobalQuoteOpen(false)}
        >
          <QuoteForm
            token={session.token}
            onCancel={() => setGlobalQuoteOpen(false)}
            onDone={() => {
              setGlobalQuoteOpen(false);
              navigate("quotes");
            }}
          />
        </ModalShell>
      ) : null}
      {globalContactPickerOpen ? (
        <ContactTypePicker onClose={() => setGlobalContactPickerOpen(false)} onSelect={openGlobalContactForm} />
      ) : null}
      {globalContactForm ? (
        <ModalShell
          title={globalContactForm.type === "supplier" ? "Nuevo proveedor" : "Nuevo cliente"}
          eyebrow="Ficha de contacto"
          onClose={() => setGlobalContactForm(null)}
        >
          {globalContactForm.type === "supplier" ? (
            <SupplierForm
              token={session.token}
              onCancel={() => setGlobalContactForm(null)}
              onDone={() => {
                setGlobalContactForm(null);
                navigate("contacts", { contactFilter: "suppliers" });
              }}
            />
          ) : (
            <LeadForm
              token={session.token}
              initialCustomerLevel={globalContactForm.level}
              onCancel={() => setGlobalContactForm(null)}
              onDone={() => {
                setGlobalContactForm(null);
                navigate("contacts", { contactFilter: "clients" });
              }}
            />
          )}
        </ModalShell>
      ) : null}
    </div>
  );
}

function CreateActionDrawer({ onClose, onNavigate, onCreateInvoice, onCreateQuote, onCreateContact }) {
  const [isClosing, setIsClosing] = useState(false);
  const actions = [
    { label: "Factura de venta", action: onCreateInvoice },
    { label: "Presupuesto", action: onCreateQuote },
    { label: "Proforma", action: () => onNavigate("proformas") },
    { label: "Albarán", action: () => onNavigate("delivery-notes") },
    { label: "Factura de compra", action: () => onNavigate("purchases") },
    { label: "Gasto/Tiquet", action: () => onNavigate("purchases") },
    { label: "Nómina", action: () => onNavigate("payroll") },
    { label: "Contacto", action: onCreateContact },
    { label: "Producto", action: () => onNavigate("catalog") },
    { label: "Remesa bancaria", action: () => onNavigate("bank-remittances") },
    { label: "Presentación de impuestos", action: () => onNavigate("taxes") }
  ];

  function closeWithAnimation() {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(onClose, 180);
  }

  function runAction(action) {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(action, 180);
  }

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        closeWithAnimation();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  });

  return (
    <div className="create-drawer-backdrop" role="presentation" onMouseDown={closeWithAnimation}>
      <aside
        className={isClosing ? "create-drawer closing" : "create-drawer"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h3 id="create-drawer-title">Crear</h3>
          <button className="create-drawer-close" type="button" onClick={closeWithAnimation} aria-label="Cerrar">
            <X size={30} />
          </button>
        </header>
        <div className="create-drawer-actions">
          {actions.map((item) => (
            <button className="create-action-row" type="button" key={item.label} onClick={() => runAction(item.action)}>
              <span className="create-action-plus">+</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="create-scan-block">
          <strong>Escáner de compras</strong>
          <button className="create-action-row" type="button" onClick={() => runAction(() => onNavigate("purchase-scan"))}>
            <span className="create-action-plus">+</span>
            <span>Subir documento</span>
          </button>
        </div>
      </aside>
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
  proformas: {
    title: "Proformas",
    actionLabel: "Nueva proforma",
    filterLabel: "Todas las proformas",
    searchPlaceholder: "Buscar por cliente, número o estado",
    metrics: ["Borradores", "Enviadas", "Aceptadas", "Convertidas"],
    columns: ["Número", "Cliente", "Fecha", "Vencimiento", "Estado", "Total"],
    empty: "No hay proformas todavía."
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

function readPath(source, path) {
  return String(path)
    .split(".")
    .reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), source);
}

function firstValue(source, paths, fallback = "") {
  for (const path of paths) {
    const value = readPath(source, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function normalizeMoneyValue(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  return Number(cleaned) || 0;
}

function tableMoney(value) {
  if (value === null || value === undefined || value === "") return "";
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function formatInvoiceNumber(docNumber = {}) {
  const series = String(docNumber.formattedSeries || docNumber.series || "").trim();
  const rawNumber = docNumber.formattedNumber ?? docNumber.number ?? docNumber.fullNumber ?? "";
  const number = String(rawNumber || "").trim();
  const paddedNumber = /^\d+$/.test(number) ? number.padStart(5, "0") : number;
  return [series, paddedNumber].filter(Boolean).join(" ") || "-";
}

function invoicePaymentState(main, total, fdState = "") {
  const normalizedFdState = String(fdState || "").trim().toLowerCase();
  const fdStateLabels = {
    paid: "Pagado",
    pending: "Pendiente",
    overdue: "Vencida",
    overpaid: "Sobrepagada",
    draft: "Borrador",
    voided: "Anulada"
  };

  if (fdStateLabels[normalizedFdState]) {
    return {
      key: normalizedFdState,
      label: fdStateLabels[normalizedFdState],
      pendingBalance: ["pending", "overdue"].includes(normalizedFdState) ? total : 0
    };
  }

  const explicitStatus = String(firstValue(main, [
    "paymentState",
    "paymentStatus",
    "status",
    "state"
  ], "")).toLowerCase();
  const pendingBalance = normalizeMoneyValue(firstValue(main, [
    "pendingBalance",
    "pendingAmount",
    "amountDue",
    "balance",
    "remaining",
    "totals.pending",
    "totals.pendingAmount"
  ], 0));

  if (main.voided || explicitStatus.includes("void") || explicitStatus.includes("cancel")) {
    return { key: "voided", label: "Anulada", pendingBalance: 0 };
  }
  if (main.draft || explicitStatus.includes("draft") || explicitStatus.includes("borrador")) {
    return { key: "draft", label: "Borrador", pendingBalance: total };
  }
  if (pendingBalance > 0 || explicitStatus.includes("pending") || explicitStatus.includes("pendiente")) {
    return { key: "pending", label: "Pendiente", pendingBalance: pendingBalance || total };
  }

  return { key: "paid", label: "Pagado", pendingBalance: 0 };
}

function serializeFacturaDirectaInvoice(item) {
  const main = item?.main || {};
  const combined = { ...item, ...main };
  const counterpartName = [main.counterpart?.name, main.counterpart?.surname].filter(Boolean).join(" ").trim();
  const seriesNumber = formatInvoiceNumber(main.docNumber);
  const total = normalizeMoneyValue(firstValue(combined, [
    "total",
    "totalAmount",
    "total_amount",
    "totalWithTaxes",
    "totalWithTax",
    "totals.total",
    "amount"
  ]));
  const subtotal = normalizeMoneyValue(firstValue(combined, [
    "totalBeforeTaxes",
    "subtotal",
    "totalWithoutTaxes",
    "totalWithoutTax",
    "totals.subtotal",
    "taxBase"
  ], total));
  const payment = invoicePaymentState(main, total, item?.fdState || item?.state);
  const firstLine = Array.isArray(main.lines) ? main.lines[0] : null;
  const lineText = String(firstLine?.text || firstLine?.description || firstLine?.title || "").trim();
  const date = firstValue(combined, ["date", "issueDate", "invoiceDate", "creationDate"], item?.creationDate || "");
  const detail = [
    `Factura ${seriesNumber}${date ? ` (${dateOnly(date)})` : ""}`,
    lineText
  ].filter(Boolean).join("  ");

  return {
    id: item?.id || firstValue(combined, ["uuid", "id", "number"], JSON.stringify(main).slice(0, 80)),
    number: seriesNumber || firstValue(combined, [
      "number",
      "invoiceNumber",
      "invoice_number",
      "documentNumber",
      "code",
      "reference"
    ], "-"),
    series: String(main.docNumber?.formattedSeries || main.docNumber?.series || "").trim(),
    rawNumber: main.docNumber?.number ?? "",
    detail,
    contact: counterpartName || firstValue(combined, [
      "contact.name",
      "client.name",
      "customer.name",
      "contactName",
      "customerName",
      "recipientName",
      "fiscalName",
      "businessName",
      "name"
    ], "-"),
    date,
    dueDate: firstValue(combined, ["dueDate", "expirationDate", "maturityDate", "paymentDueDate"], ""),
    status: payment.label,
    statusKey: payment.key,
    verifactuStatus: firstValue(combined, ["verifactuStatus", "verifactu.status", "veriFactuStatus"], ""),
    pendingBalance: payment.pendingBalance,
    subtotal,
    total,
    currency: firstValue(combined, ["currency", "currencyCode", "currency_code"], "EUR"),
    sent: Boolean(main.emails?.length || main.sent || main.emailSent),
    hasAttachment: Boolean(main.attachments?.length || main.files?.length),
    raw: item
  };
}

function deliveryNoteState(main) {
  const explicitStatus = String(firstValue({ ...main }, [
    "state",
    "status",
    "deliveryState",
    "deliveryStatus"
  ], "")).toLowerCase();

  if (main.voided || explicitStatus.includes("void") || explicitStatus.includes("cancel")) {
    return { key: "voided", label: "Anulado" };
  }
  if (main.draft || explicitStatus.includes("draft") || explicitStatus.includes("borrador")) {
    return { key: "draft", label: "Borrador" };
  }
  if (explicitStatus.includes("pending") || explicitStatus.includes("pendiente") || explicitStatus.includes("open")) {
    return { key: "pending", label: "Pendiente" };
  }

  return { key: "closed", label: "Cerrado" };
}

function serializeFacturaDirectaDeliveryNote(item) {
  const main = item?.main || {};
  const combined = { ...item, ...main };
  const counterpartName = [main.counterpart?.name, main.counterpart?.surname].filter(Boolean).join(" ").trim();
  const seriesNumber = formatInvoiceNumber(main.docNumber);
  const total = normalizeMoneyValue(firstValue(combined, [
    "total",
    "totalAmount",
    "total_amount",
    "totalWithTaxes",
    "totalWithTax",
    "totals.total",
    "amount"
  ]));
  const subtotal = normalizeMoneyValue(firstValue(combined, [
    "totalBeforeTaxes",
    "subtotal",
    "totalWithoutTaxes",
    "totalWithoutTax",
    "totals.subtotal",
    "taxBase"
  ], total));
  const firstLine = Array.isArray(main.lines) ? main.lines[0] : null;
  const lineText = String(firstLine?.text || firstLine?.description || firstLine?.title || "").trim();
  const date = firstValue(combined, ["date", "issueDate", "deliveryDate", "creationDate"], item?.creationDate || "");
  const status = deliveryNoteState(main);
  const detail = [
    `Albarán ${seriesNumber}${date ? ` ${dateOnly(date)}` : ""}`,
    lineText
  ].filter(Boolean).join("  ");

  return {
    id: item?.id || firstValue(combined, ["uuid", "id", "number"], JSON.stringify(main).slice(0, 80)),
    number: seriesNumber || firstValue(combined, [
      "number",
      "deliveryNoteNumber",
      "documentNumber",
      "code",
      "reference"
    ], "-"),
    detail,
    contact: counterpartName || firstValue(combined, [
      "contact.name",
      "client.name",
      "customer.name",
      "contactName",
      "customerName",
      "recipientName",
      "fiscalName",
      "businessName",
      "name"
    ], "-"),
    date,
    status: status.label,
    statusKey: status.key,
    subtotal,
    total,
    currency: firstValue(combined, ["currency", "currencyCode", "currency_code"], "EUR"),
    hasAttachment: Boolean(main.attachments?.length || main.files?.length),
    responsible: firstValue(combined, ["responsible.name", "owner.name", "salesPerson.name"], ""),
    lines: Array.isArray(main.lines) ? main.lines : [],
    raw: item
  };
}

function quoteStatusState(status = "") {
  const normalized = String(status || "").trim().toLowerCase();
  const labels = {
    draft: "Pendiente",
    pending: "Pendiente",
    sent: "Pendiente",
    accepted: "Aceptado",
    approved: "Aceptado",
    closed: "Cerrado",
    rejected: "Rechazado",
    cancelled: "Cancelado",
    canceled: "Cancelado"
  };
  const keys = {
    draft: "pending",
    pending: "pending",
    sent: "pending",
    accepted: "accepted",
    approved: "accepted",
    closed: "voided",
    rejected: "overdue",
    cancelled: "voided",
    canceled: "voided"
  };

  return {
    key: keys[normalized] || "pending",
    label: labels[normalized] || status || "Pendiente"
  };
}

const QUOTE_STATUS_OPTIONS = [
  { value: "draft", filterKey: "pending", label: "Pendiente" },
  { value: "accepted", filterKey: "accepted", label: "Aceptado" },
  { value: "closed", filterKey: "voided", label: "Cerrado" },
  { value: "rejected", filterKey: "overdue", label: "Rechazado" }
];

const QUOTE_LANGUAGE_OPTIONS = [
  { value: "es", label: "Español", countryCode: "ES" },
  { value: "en", label: "Inglés", countryCode: "GB" },
  { value: "nl", label: "Holandés", countryCode: "NL" },
  { value: "de", label: "Alemán", countryCode: "DE" },
  { value: "fr", label: "Francés", countryCode: "FR" },
  { value: "it", label: "Italiano", countryCode: "IT" },
  { value: "pt", label: "Portugués", countryCode: "PT" }
];

function quoteLanguageForCountry(country) {
  const normalizedCountry = String(country || "").trim().toUpperCase();
  const countryRecord = EUROPEAN_COUNTRIES.find(
    (item) => item.code === normalizedCountry || item.label.toUpperCase() === normalizedCountry
  );
  const countryCode = countryRecord?.code || normalizedCountry;
  const matchedLanguage = QUOTE_LANGUAGE_OPTIONS.find((language) => language.countryCode === countryCode);
  return matchedLanguage?.value || "es";
}

const QUOTE_PDF_TEXT = {
  es: {
    title: "Presupuesto",
    issuedBy: "Documento emitido por:",
    number: "Número",
    date: "Fecha",
    code: "Código",
    concept: "Concepto",
    quantity: "Cantidad",
    price: "Precio",
    total: "Total",
    subtotal: "Subtotal",
    vat: "IVA",
    totalCurrency: "Total (EUR)",
    validUntil: "Válido hasta",
    paymentMethod: "Método de pago",
    privacyTitle: "PROTECCIÓN DE DATOS",
    privacyText: "Responsable: DOINGLIGHT TECHNOLOGIES, S.L.U. Finalidad: Prestar los servicios solicitados. Derechos: Tiene derecho a acceder, rectificar y suprimir los datos, así como otros derechos, indicados en la información adicional, que puede ejercer dirigiéndose a la dirección del responsable del tratamiento. Información adicional: En un impreso a disposición de los interesados, en PARQUE EMPRESARIAL CAMPOLLANO C/ E, 24 - 02007 ALBACETE."
  },
  en: {
    title: "Quotation",
    issuedBy: "Document issued by:",
    number: "Number",
    date: "Date",
    code: "Code",
    concept: "Description",
    quantity: "Quantity",
    price: "Price",
    total: "Total",
    subtotal: "Subtotal",
    vat: "VAT",
    totalCurrency: "Total (EUR)",
    validUntil: "Valid until",
    paymentMethod: "Payment method",
    privacyTitle: "DATA PROTECTION",
    privacyText: "Controller: DOINGLIGHT TECHNOLOGIES, S.L.U. Purpose: To provide the requested services. Rights: You may exercise your data protection rights by contacting the controller at the stated address."
  },
  nl: {
    title: "Offerte",
    issuedBy: "Document uitgegeven door:",
    number: "Nummer",
    date: "Datum",
    code: "Code",
    concept: "Omschrijving",
    quantity: "Aantal",
    price: "Prijs",
    total: "Totaal",
    subtotal: "Subtotaal",
    vat: "BTW",
    totalCurrency: "Totaal (EUR)",
    validUntil: "Geldig tot",
    paymentMethod: "Betaalmethode",
    privacyTitle: "GEGEVENSBESCHERMING",
    privacyText: "Verwerkingsverantwoordelijke: DOINGLIGHT TECHNOLOGIES, S.L.U. Doel: het leveren van de gevraagde diensten. Rechten: u kunt uw rechten uitoefenen door contact op te nemen met de verwerkingsverantwoordelijke."
  },
  de: {
    title: "Angebot",
    issuedBy: "Dokument ausgestellt von:",
    number: "Nummer",
    date: "Datum",
    code: "Code",
    concept: "Beschreibung",
    quantity: "Menge",
    price: "Preis",
    total: "Gesamt",
    subtotal: "Zwischensumme",
    vat: "MwSt.",
    totalCurrency: "Gesamt (EUR)",
    validUntil: "Gültig bis",
    paymentMethod: "Zahlungsmethode",
    privacyTitle: "DATENSCHUTZ",
    privacyText: "Verantwortlicher: DOINGLIGHT TECHNOLOGIES, S.L.U. Zweck: Erbringung der angeforderten Dienstleistungen. Rechte: Sie können Ihre Rechte ausüben, indem Sie sich an den Verantwortlichen wenden."
  },
  fr: {
    title: "Devis",
    issuedBy: "Document émis par :",
    number: "Numéro",
    date: "Date",
    code: "Code",
    concept: "Description",
    quantity: "Quantité",
    price: "Prix",
    total: "Total",
    subtotal: "Sous-total",
    vat: "TVA",
    totalCurrency: "Total (EUR)",
    validUntil: "Valable jusqu'au",
    paymentMethod: "Mode de paiement",
    privacyTitle: "PROTECTION DES DONNÉES",
    privacyText: "Responsable : DOINGLIGHT TECHNOLOGIES, S.L.U. Finalité : fournir les services demandés. Droits : vous pouvez exercer vos droits en contactant le responsable du traitement."
  },
  it: {
    title: "Preventivo",
    issuedBy: "Documento emesso da:",
    number: "Numero",
    date: "Data",
    code: "Codice",
    concept: "Descrizione",
    quantity: "Quantità",
    price: "Prezzo",
    total: "Totale",
    subtotal: "Subtotale",
    vat: "IVA",
    totalCurrency: "Totale (EUR)",
    validUntil: "Valido fino al",
    paymentMethod: "Metodo di pagamento",
    privacyTitle: "PROTEZIONE DEI DATI",
    privacyText: "Titolare: DOINGLIGHT TECHNOLOGIES, S.L.U. Finalità: fornire i servizi richiesti. Diritti: è possibile esercitare i propri diritti contattando il titolare del trattamento."
  },
  pt: {
    title: "Orçamento",
    issuedBy: "Documento emitido por:",
    number: "Número",
    date: "Data",
    code: "Código",
    concept: "Descrição",
    quantity: "Quantidade",
    price: "Preço",
    total: "Total",
    subtotal: "Subtotal",
    vat: "IVA",
    totalCurrency: "Total (EUR)",
    validUntil: "Válido até",
    paymentMethod: "Método de pagamento",
    privacyTitle: "PROTEÇÃO DE DADOS",
    privacyText: "Responsável: DOINGLIGHT TECHNOLOGIES, S.L.U. Finalidade: prestar os serviços solicitados. Direitos: pode exercer os seus direitos contactando o responsável pelo tratamento."
  }
};

function serializeSalesQuote(quote, leadsById) {
  const status = quoteStatusState(quote.status);
  const lead = leadsById.get(quote.leadId) || {};
  const firstLine = Array.isArray(quote.items) ? quote.items[0] : null;
  const firstLineText = [firstLine?.title, firstLine?.sku].filter(Boolean).join(" · ");
  const detail = [
    `Presupuesto ${quote.quoteNumber || "-"}${quote.createdAt ? ` ${dateOnly(quote.createdAt)}` : ""}`,
    quote.notes || firstLineText || "Presupuesto comercial"
  ].filter(Boolean).join("  ");

  return {
    id: quote.id,
    leadId: quote.leadId,
    number: quote.quoteNumber || "-",
    contact: lead.fullName || lead.companyName || "Cliente sin asignar",
    detail,
    date: quote.createdAt,
    status: status.label,
    statusKey: status.key,
    subtotal: Number(quote.subtotal || 0),
    total: Number(quote.total || 0),
    currency: quote.currency || "EUR",
    sent: false,
    hasAttachment: false
  };
}

function InvoiceCreateForm({ token, onCancel, onNavigateSettings }) {
  const today = inputDate();
  const leads = useResource(() => apiRequest("/api/sales/leads?limit=200&contactKind=client", { token }), [token]);
  const catalog = useResource(() => apiRequest("/api/catalog/products?locale=es&channel=sales_app", { token }), [token]);
  const [form, setForm] = useState({
    operation: "Empresa nacional",
    template: "Principal",
    responsible: "",
    clientQuery: "",
    leadId: "",
    date: today,
    dueDate: today,
    documentNumber: "",
    sendEmail: "",
    paymentMethod: "",
    billingData: "España",
    notes: "",
    internalNotes: ""
  });
  const [lines, setLines] = useState([
    {
      id: crypto.randomUUID(),
      skuQuery: "",
      sku: "",
      description: "",
      quantity: 0,
      unitPrice: 0,
      taxRate: 21,
      discountPercent: 0
    }
  ]);

  const products = catalog.data?.products || [];
  const clients = leads.data?.items || [];
  const clientOptionLabel = (lead) =>
    `${lead.fullName}${lead.companyName ? ` · ${lead.companyName}` : ""}${lead.taxId ? ` · ${lead.taxId}` : ""}`;
  const selectedClient = clients.find((lead) => lead.id === form.leadId) || null;
  const filteredClients = useMemo(() => {
    const needle = form.clientQuery.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((lead) =>
      [lead.fullName, lead.companyName, lead.email, lead.phone, lead.taxId].some((value) =>
        String(value || "").toLowerCase().includes(needle)
      )
    );
  }, [clients, form.clientQuery]);

  function productForLine(line) {
    return products.find((product) => product.sku === line.skuQuery.trim()) || products.find((product) => product.sku === line.sku) || null;
  }

  function updateLine(lineId, patch) {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  }

  function lineSubtotal(line) {
    return Number(line.quantity || 0) * Number(line.unitPrice || 0) * (1 - Number(line.discountPercent || 0) / 100);
  }

  function addInvoiceLine() {
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        skuQuery: "",
        sku: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 21,
        discountPercent: 0
      }
    ]);
  }

  function removeInvoiceLine(lineId) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== lineId)));
  }

  const subtotal = lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
  const taxTotal = lines.reduce((sum, line) => sum + lineSubtotal(line) * (Number(line.taxRate || 0) / 100), 0);
  const total = subtotal + taxTotal;

  return (
    <div className="invoice-create-form">
      <section className="invoice-create-meta">
        <div className="invoice-create-meta-line">
          <span>Operación:</span>
          <strong>{form.operation}</strong>
          <span>Plantilla:</span>
          <strong>{form.template}</strong>
          <span>Responsable:</span>
          <strong>{form.responsible || "-"}</strong>
          <button type="button" onClick={onNavigateSettings}>Cambiar</button>
        </div>
        <div className="invoice-create-title-row">
          <h4>Factura simplificada</h4>
          <div className="invoice-create-total">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
        </div>
      </section>

      <section className="invoice-create-grid">
        <div className="invoice-field invoice-client-field">
          <span className="invoice-field-spacer" aria-hidden="true" />
          <input
            list="invoice-client-suggestions"
            placeholder="Cliente"
            value={form.clientQuery}
            onChange={(event) => {
              const value = event.target.value;
              const exactLead = clients.find((lead) => clientOptionLabel(lead) === value);
              setForm((current) => ({
                ...current,
                clientQuery: value,
                leadId: exactLead?.id || "",
                sendEmail: exactLead?.email || current.sendEmail,
                billingData: exactLead
                  ? [exactLead.country || "España", exactLead.taxId, exactLead.address].filter(Boolean).join(" · ")
                  : current.billingData,
                paymentMethod: exactLead?.preferredPaymentMethod || current.paymentMethod,
                dueDate: exactLead?.paymentTermDays ? addDaysInput(current.date, Number(exactLead.paymentTermDays)) : current.dueDate
              }));
            }}
          />
          <ChevronDown size={16} />
          <datalist id="invoice-client-suggestions">
            {filteredClients.map((lead) => (
              <option key={lead.id} value={clientOptionLabel(lead)} />
            ))}
          </datalist>
        </div>
        <label className="invoice-field">
          <span>Fecha</span>
          <input
            type="date"
            value={form.date}
            onChange={(event) => {
              const date = event.target.value;
              setForm((current) => ({ ...current, date, dueDate: selectedClient?.paymentTermDays ? addDaysInput(date, Number(selectedClient.paymentTermDays)) : current.dueDate }));
            }}
          />
        </label>
        <div className="invoice-field invoice-number-field">
          <span className="invoice-field-spacer" aria-hidden="true" />
          <input
            placeholder="Número de documento"
            value={form.documentNumber}
            onChange={(event) => setForm({ ...form, documentNumber: event.target.value })}
          />
          <small>El número se generará automáticamente</small>
        </div>
        <div className="invoice-field invoice-client-field">
          <span className="invoice-field-spacer" aria-hidden="true" />
          <input
            placeholder="Correo electrónico de envío"
            value={form.sendEmail}
            onChange={(event) => setForm({ ...form, sendEmail: event.target.value })}
          />
          <ChevronDown size={16} />
        </div>
        <label className="invoice-field">
          <span>Vencimiento</span>
          <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
        </label>
        <div className="invoice-field invoice-client-field">
          <span className="invoice-field-spacer" aria-hidden="true" />
          <select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}>
            <option value="">Método de pago</option>
            <option value="transferencia">Transferencia bancaria</option>
            <option value="recibo">Recibo domiciliado</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="contado">Contado</option>
          </select>
        </div>
        <label className="invoice-field invoice-billing-field">
          <span>Datos de facturación</span>
          <input value={form.billingData} onChange={(event) => setForm({ ...form, billingData: event.target.value })} />
        </label>
        <label className="invoice-field invoice-notes-field">
          <span className="invoice-field-spacer" aria-hidden="true" />
          <textarea placeholder="Notas" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <small>Notas visibles para el cliente</small>
        </label>
        <label className="invoice-field invoice-notes-field internal">
          <span className="invoice-field-spacer" aria-hidden="true" />
          <textarea placeholder="Notas internas" value={form.internalNotes} onChange={(event) => setForm({ ...form, internalNotes: event.target.value })} />
          <small>Notas no visibles para el cliente</small>
        </label>
      </section>

      <section className="invoice-lines-section">
        <div className="invoice-lines-header">
          <span>Producto</span>
          <span>Descripción</span>
          <span>Cantidad</span>
          <span>Precio de venta</span>
          <span>Impuestos</span>
          <span>Dto (%)</span>
          <span>Importe</span>
        </div>
        {lines.map((line) => {
          const product = productForLine(line);
          return (
            <div className="invoice-line-row" key={line.id}>
              <div className="invoice-product-cell">
                <input
                  list="invoice-product-suggestions"
                  placeholder="Producto"
                  value={line.skuQuery}
                  onChange={(event) => {
                    const skuQuery = event.target.value.toUpperCase();
                    const matchedProduct = products.find((item) => item.sku === skuQuery);
                    updateLine(line.id, {
                      skuQuery,
                      sku: matchedProduct?.sku || "",
                      description: matchedProduct?.title || line.description,
                      unitPrice: matchedProduct?.pricePvpEur ?? line.unitPrice
                    });
                  }}
                />
                <ChevronDown size={14} />
              </div>
              <input
                placeholder="Añade una descripción"
                value={line.description}
                onChange={(event) => updateLine(line.id, { description: event.target.value })}
              />
              <input type="number" min="0" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} />
              <input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} />
              <select value={line.taxRate} onChange={(event) => updateLine(line.id, { taxRate: event.target.value })}>
                <option value="0">Exento</option>
                <option value="21">IVA 21%</option>
                <option value="23">IVA PT 23%</option>
                <option value="22">IVA IT 22%</option>
                <option value="20">IVA FR 20%</option>
                <option value="19">IVA DE 19%</option>
              </select>
              <input type="number" min="0" max="100" value={line.discountPercent} onChange={(event) => updateLine(line.id, { discountPercent: event.target.value })} />
              <strong>{tableMoney(lineSubtotal(line))}</strong>
              <button className="tiny-icon-button danger" type="button" onClick={() => removeInvoiceLine(line.id)} disabled={lines.length === 1} aria-label="Eliminar línea">
                <X size={14} />
              </button>
            </div>
          );
        })}
        <datalist id="invoice-product-suggestions">
          {products.map((product) => (
            <option key={product.sku} value={product.sku}>
              {product.title || product.slug}
            </option>
          ))}
        </datalist>
        <button className="invoice-add-line" type="button" onClick={addInvoiceLine}>Añadir línea</button>
      </section>

      <section className="invoice-create-summary">
        <div>
          <span>Subtotal</span>
          <strong>{money(subtotal)}</strong>
        </div>
        <div>
          <span>Impuestos</span>
          <strong>{money(taxTotal)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
      </section>

      <div className="invoice-create-actions">
        <p>La creación definitiva se activará al cerrar series, numeración y VeriFactu.</p>
        <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button>
        <button className="primary-button" type="button" disabled>Guardar factura</button>
      </div>
    </div>
  );
}

function InvoicesMirrorView({ token, onCreateInvoice }) {
  const [query, setQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const statusResource = useResource(
    () => apiRequest("/api/facturadirecta/status", { token }),
    [token]
  );
  const invoicesResource = useResource(
    () => apiRequest("/api/facturadirecta/invoices?limit=100", { token }),
    [token]
  );
  const fdStatus = statusResource.data?.status || {};
  const invoices = (invoicesResource.data?.items || []).map(serializeFacturaDirectaInvoice);
  const filteredInvoices = invoices.filter((invoice) => {
    const haystack = `${invoice.number} ${invoice.contact} ${invoice.status} ${invoice.total} ${invoice.detail}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="module-page invoices-mirror-page">
      <header className="module-page-header invoices-page-header">
        <h3>Facturas de venta</h3>
        <div className="invoice-new-split" title="Crear nueva factura de venta">
          <button type="button" onClick={onCreateInvoice}>Nueva factura</button>
          <button type="button" onClick={onCreateInvoice} aria-label="Opciones de nueva factura">
            <ChevronDown size={18} />
          </button>
        </div>
      </header>

      {fdStatus.configured === false || invoicesResource.error ? (
        <div className="integration-warning">
          <strong>FacturaDirecta todavía no está disponible online.</strong>
          <p>{invoicesResource.error || "La integración no está configurada en Railway."}</p>
          {fdStatus.configured === false ? (
            <span>
              Estado Railway: FD_API_KEY {fdStatus.hasApiKey ? "detectada" : "falta"} · FD_COMPANY_ID {fdStatus.hasCompanyId ? "detectado" : "falta"}.
            </span>
          ) : (
            <span>Cuando configuremos las variables `FD_API_KEY` y `FD_COMPANY_ID` en Railway, esta tabla cargará facturas reales.</span>
          )}
        </div>
      ) : null}

      <section className="module-panel invoices-list-panel">
        <div className="invoice-toolbar">
          <button className="invoice-view-filter" type="button">
            <FileText size={18} />
            Todas las facturas
            <ChevronDown size={16} />
          </button>
          <div className="module-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar..." />
          </div>
          <button className="invoice-date-filter" type="button">
            <CalendarDays size={18} />
            Todas las fechas
            <ChevronDown size={16} />
          </button>
        </div>
        <div className="module-filters invoice-filter-row">
          <button className="invoice-filter-chip" type="button">Estado <MoreVertical size={14} /></button>
          <button className="invoice-filter-chip" type="button">Cliente <MoreVertical size={14} /></button>
          <button className="invoice-add-filter" type="button">
            <Plus size={18} />
            Añadir filtro
          </button>
        </div>
        <div className="table-wrap invoice-table-wrap">
          <table className="module-table invoice-table">
            <thead>
              <tr>
                <th className="select-column"><input type="checkbox" aria-label="Seleccionar todas las facturas" /></th>
                <th className="invoice-kind-column"></th>
                <th>Fecha <span className="sort-arrow">↓</span></th>
                <th>Verifactu</th>
                <th>Estado</th>
                <th>Serie / Núm.</th>
                <th>Cliente / Detalle</th>
                <th>Saldo pendiente</th>
                <th>Subtotal</th>
                <th>Total</th>
                <th>Moneda</th>
              </tr>
            </thead>
            <tbody>
              {invoicesResource.loading ? (
                <tr className="empty-table-row">
                  <td colSpan={11}>Cargando facturas desde FacturaDirecta...</td>
                </tr>
              ) : null}
              {!invoicesResource.loading && !filteredInvoices.length ? (
                <tr className="empty-table-row">
                  <td colSpan={11}>No hay facturas para mostrar todavía.</td>
                </tr>
              ) : null}
              {filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="clickable-table-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedInvoice(invoice)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedInvoice(invoice);
                    }
                  }}
                >
                  <td className="select-column">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar factura ${invoice.number}`}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    />
                  </td>
                  <td className="invoice-kind-column"><span className="invoice-kind-badge">F</span></td>
                  <td>{dateOnly(invoice.date)}</td>
                  <td>{invoice.verifactuStatus || ""}</td>
                  <td><span className={`invoice-payment-status ${invoice.statusKey}`}>{invoice.status}</span></td>
                  <td>{invoice.number}</td>
                  <td>
                    <div className="invoice-detail-cell">
                      <strong>{invoice.contact}</strong>
                      <span>{invoice.detail}</span>
                      <span className="invoice-row-icons">
                        {invoice.hasAttachment ? <Paperclip size={17} /> : null}
                        <Mail size={18} />
                      </span>
                    </div>
                  </td>
                  <td className={invoice.pendingBalance > 0 ? "amount-pending" : ""}>{invoice.pendingBalance > 0 ? tableMoney(invoice.pendingBalance) : ""}</td>
                  <td>{tableMoney(invoice.subtotal)}</td>
                  <td>{tableMoney(invoice.total)}</td>
                  <td>{invoice.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {selectedInvoice ? (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      ) : null}
    </div>
  );
}

function InvoiceDetailModal({ invoice, onClose }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const lines = Array.isArray(invoice.raw?.main?.lines) ? invoice.raw.main.lines : [];

  return (
    <ModalShell
      title={`Factura ${invoice.number}`}
      eyebrow="Factura de venta"
      size="wide-modal quote-record-modal"
      onClose={onClose}
      actions={(
        <>
          <button className="document-actions-trigger" type="button" onClick={() => setActionsOpen(true)} aria-label="Opciones de factura">
            <MoreVertical size={22} />
          </button>
          {actionsOpen ? (
            <DocumentActionsMenu
              type="invoice"
              onClose={() => setActionsOpen(false)}
            />
          ) : null}
        </>
      )}
    >
      <div className="quote-record-body">
        <section className="quote-detail-grid">
          <DetailItem label="Cliente" value={invoice.contact} />
          <DetailItem label="Fecha" value={dateOnly(invoice.date)} />
          <DetailItem label="Vencimiento" value={dateOnly(invoice.dueDate)} />
          <DetailItem label="Estado" value={invoice.status} />
          <DetailItem label="Serie / Núm." value={invoice.number} />
          <DetailItem label="Total" value={`${tableMoney(invoice.total)} ${invoice.currency}`} />
        </section>

        <section className="quote-record-section">
          <header>
            <h4>Líneas de factura</h4>
          </header>
          <div className="quote-record-lines">
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {lines.length ? lines.map((line, index) => (
                  <tr key={`${invoice.id}-line-${index}`}>
                    <td>{line.text || line.description || line.title || "-"}</td>
                    <td>{tableMoney(line.quantity || line.units || 0)}</td>
                    <td>{tableMoney(line.unitPrice || line.price || 0)}</td>
                    <td>{tableMoney(line.total || line.amount || 0)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4}>Esta factura no trae líneas detalladas en la respuesta actual.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ModalShell>
  );
}

function DeliveryNotesView({ token }) {
  const [query, setQuery] = useState("");
  const [selectedDeliveryNote, setSelectedDeliveryNote] = useState(null);
  const deliveryNotesResource = useResource(
    () => apiRequest("/api/facturadirecta/deliveryNotes?limit=100", { token }),
    [token]
  );
  const deliveryNotes = (deliveryNotesResource.data?.items || []).map(serializeFacturaDirectaDeliveryNote);
  const filteredDeliveryNotes = deliveryNotes.filter((deliveryNote) => {
    const haystack = `${deliveryNote.number} ${deliveryNote.contact} ${deliveryNote.status} ${deliveryNote.total} ${deliveryNote.detail}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  function openDeliveryNote(deliveryNote) {
    setSelectedDeliveryNote(deliveryNote);
  }

  function handleRowKeyDown(event, deliveryNote) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDeliveryNote(deliveryNote);
    }
  }

  return (
    <div className="module-page invoices-mirror-page">
      <header className="module-page-header invoices-page-header">
        <h3>Albaranes de venta</h3>
        <button className="primary-button" type="button">Nuevo albarán</button>
      </header>

      {deliveryNotesResource.error ? (
        <div className="integration-warning">
          <strong>No se han podido cargar los albaranes de FacturaDirecta.</strong>
          <p>{deliveryNotesResource.error}</p>
        </div>
      ) : null}

      <section className="module-panel invoices-list-panel">
        <div className="invoice-toolbar">
          <button className="invoice-view-filter" type="button">
            <FileText size={18} />
            Todos los albaranes
            <ChevronDown size={16} />
          </button>
          <div className="module-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar..." />
          </div>
          <button className="invoice-date-filter" type="button">
            <CalendarDays size={18} />
            Todas las fechas
            <ChevronDown size={16} />
          </button>
        </div>
        <div className="module-filters invoice-filter-row">
          <button className="invoice-filter-chip" type="button">Estado <MoreVertical size={14} /></button>
          <button className="invoice-filter-chip" type="button">Cliente <MoreVertical size={14} /></button>
          <button className="invoice-add-filter" type="button">
            <Plus size={18} />
            Añadir filtro
          </button>
        </div>
        <div className="table-wrap invoice-table-wrap">
          <table className="module-table invoice-table delivery-notes-table">
            <thead>
              <tr>
                <th className="select-column"><input type="checkbox" aria-label="Seleccionar todos los albaranes" /></th>
                <th className="invoice-kind-column"></th>
                <th>Fecha <span className="sort-arrow">↓</span></th>
                <th>Estado</th>
                <th>Serie / Núm.</th>
                <th>Cliente / Detalle</th>
                <th></th>
                <th>Subtotal</th>
                <th>Total</th>
                <th>Moneda</th>
              </tr>
            </thead>
            <tbody>
              {deliveryNotesResource.loading ? (
                <tr className="empty-table-row">
                  <td colSpan={10}>Cargando albaranes desde FacturaDirecta...</td>
                </tr>
              ) : null}
              {!deliveryNotesResource.loading && !filteredDeliveryNotes.length ? (
                <tr className="empty-table-row">
                  <td colSpan={10}>No hay albaranes para mostrar todavía.</td>
                </tr>
              ) : null}
              {filteredDeliveryNotes.map((deliveryNote) => (
                <tr
                  key={deliveryNote.id}
                  className="clickable-table-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => openDeliveryNote(deliveryNote)}
                  onKeyDown={(event) => handleRowKeyDown(event, deliveryNote)}
                >
                  <td className="select-column">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar albarán ${deliveryNote.number}`}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    />
                  </td>
                  <td className="invoice-kind-column"><span className="invoice-kind-badge delivery-note-badge">A</span></td>
                  <td>{dateOnly(deliveryNote.date)}</td>
                  <td><span className={`invoice-payment-status ${deliveryNote.statusKey}`}>{deliveryNote.status}</span></td>
                  <td>{deliveryNote.number}</td>
                  <td>
                    <div className="invoice-detail-cell">
                      <strong>{deliveryNote.contact}</strong>
                      <span>{deliveryNote.detail}</span>
                    </div>
                  </td>
                  <td>
                    <span className="invoice-row-icons inline-icons">
                      {deliveryNote.hasAttachment ? <Paperclip size={17} /> : null}
                      <FileText size={18} />
                      {deliveryNote.responsible ? <span className="document-owner-pill">{deliveryNote.responsible}</span> : null}
                    </span>
                  </td>
                  <td>{tableMoney(deliveryNote.subtotal)}</td>
                  <td>{tableMoney(deliveryNote.total)}</td>
                  <td>{deliveryNote.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedDeliveryNote ? (
        <DeliveryNoteDetailModal
          deliveryNote={selectedDeliveryNote}
          onClose={() => setSelectedDeliveryNote(null)}
        />
      ) : null}
    </div>
  );
}

function DeliveryNoteDetailModal({ deliveryNote, onClose }) {
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <ModalShell
      title={`Albarán ${deliveryNote.number}`}
      eyebrow="Albarán de venta"
      size="wide-modal quote-record-modal"
      onClose={onClose}
      actions={(
        <>
          <button className="document-actions-trigger" type="button" onClick={() => setActionsOpen(true)} aria-label="Opciones de albarán">
            <MoreVertical size={22} />
          </button>
          {actionsOpen ? (
            <DocumentActionsMenu
              type="delivery-note"
              onClose={() => setActionsOpen(false)}
            />
          ) : null}
        </>
      )}
    >
      <div className="quote-record-body">
        <section className="quote-detail-grid">
          <DetailItem label="Cliente" value={deliveryNote.contact} />
          <DetailItem label="Fecha" value={dateOnly(deliveryNote.date)} />
          <DetailItem label="Estado" value={deliveryNote.status} />
          <DetailItem label="Subtotal" value={`${tableMoney(deliveryNote.subtotal)} ${deliveryNote.currency}`} />
          <DetailItem label="Total" value={`${tableMoney(deliveryNote.total)} ${deliveryNote.currency}`} />
        </section>

        <section className="quote-record-section">
          <header>
            <h4>Líneas del albarán</h4>
          </header>
          <div className="quote-record-lines">
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {deliveryNote.lines.length ? deliveryNote.lines.map((line, index) => (
                  <tr key={`${deliveryNote.id}-line-${index}`}>
                    <td>{line.text || line.description || line.title || "-"}</td>
                    <td>{tableMoney(line.quantity || line.units || 0)}</td>
                    <td>{tableMoney(line.unitPrice || line.price || 0)}</td>
                    <td>{tableMoney(line.total || line.amount || 0)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4}>Este albarán no trae líneas detalladas en la respuesta actual.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ModalShell>
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
  { id: "accounting", title: "Contabilidad", description: "Cuentas contables y reglas internas pendientes de definir", icon: Share2 }
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
  accounting: {
    title: "Contabilidad",
    description: "Cuentas contables y reglas internas pendientes de definir.",
    actionLabel: "Modificar",
    fields: [
      ["Ventas", "700000"],
      ["Clientes", "430000"],
      ["Compras", "600000"],
      ["Proveedores", "400000"]
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

function Dashboard({ token, locale = "es", user }) {
  const dashboard = useResource(() => apiRequest("/api/sales/dashboard", { token }), [token]);
  const catalog = useResource(
    () => apiRequest(`/api/catalog/products?locale=${encodeURIComponent(locale || "es")}&channel=sales_app`, { token }),
    [token, locale]
  );

  const totals = dashboard.data?.totals || {};
  const markets = dashboard.data?.markets || [];
  const leadCount = totals.leadCount ?? 0;
  const quoteCount = totals.quoteCount ?? 0;
  const quoteTotal = totals.quoteTotal || 0;
  const productCount = catalog.data?.count ?? 0;
  const firstName = (user?.fullName || user?.email || "Doinglight").split(" ")[0];

  return (
    <div className="home-dashboard">
      <header className="home-dashboard-header">
        <div>
          <p>Inicio</p>
          <h1>Hola {firstName}</h1>
        </div>
        <div className="home-dashboard-actions">
          <div className="home-dashboard-filter">
            <CalendarDays size={18} />
            <span>Todo el año 2026</span>
            <ChevronDown size={16} />
          </div>
        </div>
      </header>

      <div className="home-card-grid">
        <FinanceSummaryCard
          title="Ingresos"
          subtitle="Facturas emitidas"
          value={money(0)}
          bars={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
          tone="green"
          note="Pendiente de activar facturación"
        />
        <FinanceSummaryCard
          title="Presupuestos"
          subtitle={`${quoteCount} presupuestos creados`}
          value={money(quoteTotal)}
          bars={buildDashboardBars(markets, "quoteTotal")}
          tone="blue"
        />
        <ProfitSummaryCard quoteTotal={quoteTotal} />
        <TaxSummaryCard />
        <DonutSummaryCard
          title="Clientes"
          value={leadCount}
          label="Contactos cliente"
          segments={buildDashboardSegments(markets, "leadCount")}
          tone="green"
        />
        <DonutSummaryCard
          title="Productos"
          value={productCount}
          label="Catálogo común"
          segments={[100]}
          tone="blue"
        />
        <DonutSummaryCard
          title="Bancos"
          value={money(0)}
          label="Saldo contable"
          segments={[100]}
          tone="coral"
        />
        <PendingCollectionCard />
      </div>

      {dashboard.error ? <p className="form-error">{dashboard.error}</p> : null}

      <section className="market-dashboard-section">
        <header>
          <h2>Resumen por país</h2>
          <p>Visión admin por distribuidor. Las facturas se activarán cuando creemos el módulo fiscal de cada país.</p>
        </header>
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
      </section>
    </div>
  );
}

function buildDashboardBars(markets, field) {
  const values = (markets || []).map((market) => Number(market?.[field] || 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  const bars = Array.from({ length: 12 }, () => 0);
  values.forEach((value, index) => {
    bars[index + 1] = Math.max(8, Math.round((value / total) * 100));
  });
  return bars;
}

function buildDashboardSegments(markets, field) {
  const values = (markets || []).map((market) => Number(market?.[field] || 0)).filter(Boolean);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total) return [100];
  return values.map((value) => Math.max(6, Math.round((value / total) * 100)));
}

function conicGradient(segments, palette) {
  let cursor = 0;
  const stops = (segments || [100]).map((segment, index) => {
    const start = cursor;
    const end = Math.min(100, cursor + Number(segment || 0));
    cursor = end;
    return `${palette[index % palette.length]} ${start}% ${end}%`;
  });
  if (cursor < 100) stops.push(`rgba(70, 70, 70, 0.12) ${cursor}% 100%`);
  return `conic-gradient(${stops.join(", ")})`;
}

function FinanceSummaryCard({ title, subtitle, value, bars, tone, note }) {
  return (
    <section className={`home-summary-card ${tone}`}>
      <header>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="summary-card-menu">⋮</span>
      </header>
      <strong>{value}</strong>
      <MiniBars values={bars} tone={tone} />
      {note ? <small>{note}</small> : null}
    </section>
  );
}

function MiniBars({ values, tone }) {
  const max = Math.max(...values, 1);
  return (
    <div className={`mini-bars ${tone}`} aria-hidden="true">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className={value ? "" : "empty"}
          style={{ height: `${value ? Math.max(12, (value / max) * 72) : 12}%` }}
        />
      ))}
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

function ProfitSummaryCard({ quoteTotal }) {
  return (
    <section className="home-summary-card wide">
      <header>
        <div>
          <h2>Beneficio</h2>
          <p>Facturas - gastos</p>
        </div>
      </header>
      <strong>{money(0)}</strong>
      <div className="comparison-bars">
        <div>
          <span>Presupuestado</span>
          <b>{money(quoteTotal)}</b>
        </div>
        <div>
          <span>Gastos</span>
          <b>{money(0)}</b>
        </div>
      </div>
    </section>
  );
}

function TaxSummaryCard() {
  return (
    <section className="home-summary-card tax-card">
      <header>
        <div>
          <h2>Impuestos</h2>
          <p>IVA y fiscalidad</p>
        </div>
      </header>
      <div className="tax-lines">
        <div>
          <span>IVA España</span>
          <i />
          <strong>{money(0)}</strong>
        </div>
        <div>
          <span>VeriFactu</span>
          <i />
          <strong>Pendiente</strong>
        </div>
      </div>
    </section>
  );
}

function DonutSummaryCard({ title, value, label, segments, tone }) {
  const palettes = {
    green: ["#9cc31b", "#6f9817", "#cfe889", "#464646"],
    blue: ["#5aa9e6", "#3478a9", "#a6d6f6", "#464646"],
    coral: ["#c97a66", "#e3a190", "#8e554b", "#464646"]
  };
  const background = conicGradient(segments, palettes[tone] || palettes.green);

  return (
    <section className={`home-summary-card donut-card ${tone}`}>
      <header>
        <div>
          <h2>{title}</h2>
          <p>{label}</p>
        </div>
        <span className="summary-card-menu">⋮</span>
      </header>
      <div className="donut-chart" style={{ background }}>
        <div>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      </div>
    </section>
  );
}

function PendingCollectionCard() {
  return (
    <section className="home-summary-card collection-card">
      <header>
        <div>
          <h2>Pendiente de cobro</h2>
          <p>Facturas no cobradas</p>
        </div>
      </header>
      <strong>{money(0)}</strong>
      <div className="collection-bars">
        <span style={{ width: "50%" }} />
        <span style={{ width: "50%" }} />
      </div>
      <div className="collection-values">
        <span>Atrasado {money(0)}</span>
        <span>No vencido {money(0)}</span>
      </div>
    </section>
  );
}

function CountrySummaryCard({ market, summary, loading }) {
  const users = summary?.users || [];
  const primaryUser = users.find((user) => user.email === market.email) || users[0];
  const displayEmail = market.email || primaryUser?.email || "";
  const quoteCount = loading ? "-" : summary?.quoteCount ?? 0;
  const quoteTotal = loading ? "-" : money(summary?.quoteTotal || 0);

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
      <div className="country-card-body">
        <div className="country-kpi-circles">
          <div className="country-kpi-circle">
            <strong>{quoteCount}</strong>
            <span>Presupuestos</span>
          </div>
          <div className="country-kpi-circle income">
            <strong>{money(0)}</strong>
            <span>Facturas</span>
          </div>
        </div>
        <div className="country-card-footer">
          <span>{loading ? "-" : summary?.leadCount ?? 0} clientes</span>
          <strong>{quoteTotal} presupuestado</strong>
        </div>
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
    contactKind: lead.contactKind || "client",
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
  const clientContacts = (leads.data?.items || [])
    .filter((lead) => (lead.contactKind || "client") === "client")
    .map((lead) => ({ ...lead, contactClass: "client" }));
  const supplierContacts = (leads.data?.items || [])
    .filter((lead) => lead.contactKind === "supplier")
    .map((lead) => ({ ...lead, contactClass: "supplier" }));
  const contacts = contactFilter === "suppliers" ? supplierContacts : contactFilter === "clients" ? clientContacts : [...clientContacts, ...supplierContacts];
  const showCustomerColumns = contactFilter !== "suppliers";

  useEffect(() => {
    setContactFilter(initialFilter);
  }, [initialFilter]);
  const filteredContacts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return contacts.filter((contact) => {
      const matchesLevel =
        contact.contactClass !== "client" ||
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
        <div className="contacts-page-actions">
          <button className="primary-button contact-new-button" type="button" onClick={() => setShowContactTypePicker(true)}>
            Nuevo contacto
          </button>
        </div>
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

        {contactFilter !== "suppliers" ? (
          <div className="contacts-filters">
            <select value={customerLevelFilter} onChange={(event) => setCustomerLevelFilter(event.target.value)} aria-label="Nivel de cliente">
              <option value="all">Todos los niveles</option>
              <option value="level_1">Nivel 1 · Particular</option>
              <option value="level_2">Nivel 2 · Profesional</option>
              <option value="level_3">Nivel 3 · Almacén / vendedor online</option>
              <option value="level_4">Nivel 4 · Distribuidores</option>
            </select>
          </div>
        ) : null}

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
                {showCustomerColumns ? <th>Nivel</th> : null}
                {showCustomerColumns ? <th>Dto.</th> : null}
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
                  {showCustomerColumns ? <td>{contact.contactClass === "client" ? customerLevelLabel(contact.customerLevel) : "-"}</td> : null}
                  {showCustomerColumns ? (
                    <td>
                      {contact.contactClass === "client"
                        ? discountLabel(contact.defaultDiscountPercent, contact.defaultDiscountMaxPercent)
                        : "-"}
                    </td>
                  ) : null}
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
            <SupplierForm token={token} onCancel={() => setShowForm(false)} onDone={() => { setShowForm(false); leads.reload(); }} />
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

function SummaryMini({ label, value }) {
  return (
    <div className="summary-mini">
      <span>{label}</span>
      <strong>{value}</strong>
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

function SupplierForm({ token, onCancel, onDone }) {
  const [form, setForm] = useState({
    contactKind: "supplier",
    customerLevel: "supplier",
    customerType: "empresa",
    defaultDiscountPercent: 0,
    defaultDiscountMaxPercent: 0,
    defaultTaxRate: 21,
    firstName: "",
    lastName: "",
    fullName: "",
    companyName: "",
    taxIdentifierType: "cif",
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
    country: "ES",
    notes: "",
    additionalAddresses: [],
    communicationContacts: [],
    preferredPaymentMethod: "",
    paymentTermDays: "",
    paymentNotificationsEnabled: false
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const displayName = form.companyName || fullNameFromDraft(form);
      if (!displayName) {
        throw new Error("El proveedor necesita nombre o razón social.");
      }

      const result = await apiRequest("/api/sales/leads", {
        token,
        method: "POST",
        body: {
          ...form,
          contactKind: "supplier",
          fullName: displayName,
          customerType: "empresa",
          customerLevel: "supplier",
          defaultDiscountPercent: 0,
          defaultDiscountMaxPercent: 0,
          paymentNotificationsEnabled: false
        }
      });
      onDone?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="modal-form lead-form" onSubmit={submit}>
      <section className="crm-section lead-main-edit">
        <header>
          <div>
            <h4>Datos del proveedor</h4>
            <p>Información fiscal, contacto principal y dirección.</p>
          </div>
        </header>
        <div className="lead-main-grid contact-data-grid supplier-data-grid">
          <input placeholder="Razón social" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
          <input placeholder="Nombre comercial" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
          <select
            value={form.taxIdentifierType}
            onChange={(event) => setForm({ ...form, taxIdentifierType: event.target.value })}
            aria-label="Tipo de identificador fiscal"
          >
            <option value="nif">NIF</option>
            <option value="cif">CIF</option>
            <option value="sujeto_pasivo">Sujeto pasivo</option>
          </select>
          <input
            placeholder={taxIdentifierPlaceholder(form.taxIdentifierType)}
            value={form.taxId}
            onChange={(event) => setForm({ ...form, taxId: event.target.value.toUpperCase() })}
          />
          <input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <input placeholder="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <input placeholder="Dirección" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          <input placeholder="C.P." value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
          <input placeholder="Población" value={form.population} onChange={(event) => setForm({ ...form, population: event.target.value })} />
          <input placeholder="Ciudad" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          <input placeholder="Provincia" value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} />
          <select value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })}>
            {EUROPEAN_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>{country.label}</option>
            ))}
          </select>
          <textarea
            className="contact-notes-field"
            placeholder="Notas internas"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </div>
      </section>
      <LeadCrmFields
        form={form}
        setForm={setForm}
        paymentNotificationsAllowed={false}
        fallbackCountry={form.country}
        contactKind="supplier"
      />
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button>
        <button className="primary-button" type="submit" disabled={saving || !token}>
          {saving ? "Guardando..." : "Guardar proveedor"}
        </button>
      </div>
    </form>
  );
}

function LeadsView({ token }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const leads = useResource(() => apiRequest("/api/sales/leads?limit=200&contactKind=client", { token }), [token]);

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

function ModalShell({ title, eyebrow, children, onClose, size = "", actions = null }) {
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
          <div className="modal-header-actions">
            {actions}
            <button className="icon-button" onClick={onClose} aria-label="Cerrar ventana">
              <X size={18} />
            </button>
          </div>
        </header>
        {children}
      </article>
    </div>
  );
}

function DuplicateAsDocumentModal({ onClose }) {
  return (
    <div className="document-actions-backdrop stacked" role="presentation" onMouseDown={onClose}>
      <article className="duplicate-document-modal" role="dialog" aria-modal="true" aria-label="Duplicar como" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h3>Duplicar como...</h3>
          <button className="document-actions-close" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={24} />
          </button>
        </header>
        <button type="button" onClick={onClose}>
          <span>Presupuesto</span>
          <ChevronRight size={22} />
        </button>
        <button type="button" onClick={onClose}>
          <span>Albarán</span>
          <ChevronRight size={22} />
        </button>
      </article>
    </div>
  );
}

function DocumentActionsMenu({ type, onClose, onSend }) {
  const [duplicateAsOpen, setDuplicateAsOpen] = useState(false);
  const isInvoice = type === "invoice";
  const exportActions = [
    { label: "Imprimir", action: () => window.print() },
    { label: "Descargar PDF" },
    ...(isInvoice ? [{ label: "Descargar Facturae" }] : [])
  ];
  const convertActions = isInvoice
    ? [
        { label: "Duplicar" },
        { label: "Duplicar como...", action: () => { setDuplicateAsOpen(true); return false; } }
      ]
    : [
        { label: "Duplicar" },
        { label: "Duplicar como presupuesto" },
        { label: "Crear factura" }
      ];
  const documentActions = isInvoice
    ? [
        { label: "Modificar" },
        { label: "Enviar", action: onSend },
        { label: "Registrar ingreso" },
        { label: "Registrar pago" },
        { label: "Anular" },
        { label: "Borrar", danger: true }
      ]
    : [
        { label: "Modificar" },
        { label: "Enviar", action: onSend },
        { label: "Borrar", danger: true }
      ];

  function runAction(action) {
    const result = action ? action() : undefined;
    if (result !== false) onClose();
  }

  function renderColumn(title, actions) {
    return (
      <section className="document-actions-column">
        <h4>{title}</h4>
        {actions.map((item) => (
          <button
            className={item.danger ? "danger" : ""}
            key={item.label}
            type="button"
            onClick={() => runAction(item.action)}
          >
            {item.label}
          </button>
        ))}
      </section>
    );
  }

  return (
    <>
      <div className="document-actions-backdrop" role="presentation" onMouseDown={onClose}>
        <article className="document-actions-menu" role="dialog" aria-modal="true" aria-label="Opciones del documento" onMouseDown={(event) => event.stopPropagation()}>
          <button className="document-actions-close" type="button" onClick={onClose} aria-label="Cerrar opciones">
            <X size={28} />
          </button>
          {renderColumn("Exportar", exportActions)}
          {renderColumn("Convertir", convertActions)}
          {renderColumn("Acciones", documentActions)}
        </article>
      </div>
      {duplicateAsOpen ? <DuplicateAsDocumentModal onClose={() => setDuplicateAsOpen(false)} /> : null}
    </>
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
  const isSupplier = (draft.contactKind || lead.contactKind || "client") === "supplier";
  const paymentNotificationsAllowed = !isSupplier && !["level_1", "level_2"].includes(draft.customerLevel);
  const quotes = useResource(() => apiRequest("/api/sales/quotes?limit=200", { token }), [token]);
  const leadQuotes = isSupplier ? [] : (quotes.data?.items || []).filter((quote) => quote.leadId === lead.id);

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
            contactKind: isSupplier ? "supplier" : "client",
            fullName: isSupplier ? draft.companyName || fullNameFromDraft(draft) : fullNameFromDraft(draft),
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
              <p>{isSupplier ? "Proveedor" : customerTypeLabel(draft.customerType)} · Moneda: EUR</p>
              <h3 id="lead-detail-title">{fullNameFromDraft(draft) || draft.companyName || "Contacto"}</h3>
            </div>
            <span className="contact-class-badge">{isSupplier ? "P" : "C"}</span>
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
              {!isSupplier ? <SummaryLine label="Perfil de cliente" value={customerLevelLabel(draft.customerLevel)} /> : null}
              <SummaryLine label="Identificador fiscal" value={draft.taxId || "Sin NIF/CIF"} />
              {!isSupplier ? <SummaryLine label="Descuento" value={discountLabel(draft.defaultDiscountPercent, draft.defaultDiscountMaxPercent)} /> : null}
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

            <LeadSummaryCard title={isSupplier ? "Preferencias del proveedor" : "Preferencias del cliente"} onEdit={() => setEditing(true)}>
              <SummaryLine label={isSupplier ? "Impuestos como proveedor" : "Impuestos como cliente"} value={draft.defaultTaxRate === 0 ? "Exento / sujeto pasivo" : `${draft.defaultTaxRate ?? 21}%`} />
              <SummaryLine label="Método de cobro" value={draft.preferredPaymentMethod || "Sin definir"} />
              {!isSupplier ? <SummaryLine label="Plazo de cobro" value={draft.paymentTermDays ? `${draft.paymentTermDays} días` : "Sin definir"} /> : null}
              {!isSupplier ? <SummaryLine label="Notificaciones" value={draft.paymentNotificationsEnabled ? "Activadas" : "Sin activar"} /> : null}
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
                contactKind={isSupplier ? "supplier" : "client"}
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
                contactKind={isSupplier ? "supplier" : "client"}
                fallbackCountry={lead.country || "ES"}
              />
            </div>
          ) : null}

          <div className="lead-record-tabs" role="tablist" aria-label={isSupplier ? "Información del proveedor" : "Información del cliente"}>
            <button className={activeTab === "documents" ? "active" : ""} type="button" onClick={() => setActiveTab("documents")}>
              Documentos
            </button>
            <button className={activeTab === "more" ? "active" : ""} type="button" onClick={() => setActiveTab("more")}>
              Más información
            </button>
          </div>

          {activeTab === "documents" ? (
            <LeadDocumentsPanel quotes={leadQuotes} loading={isSupplier ? false : quotes.loading} error={isSupplier ? "" : quotes.error} contactKind={isSupplier ? "supplier" : "client"} />
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

function LeadDocumentsPanel({ quotes, loading, error, contactKind = "client" }) {
  const isSupplier = contactKind === "supplier";
  return (
    <section className="lead-tab-panel documents-panel">
      <header>
        <div>
          <h4>Documentos</h4>
          <p>{isSupplier ? "Facturas de compra y documentos vinculados a este proveedor." : "Presupuestos y futuras facturas vinculadas a este cliente."}</p>
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
              <tr><td colSpan="8">No hay documentos vinculados a este {isSupplier ? "proveedor" : "cliente"}.</td></tr>
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
  contactKind = "client",
  onValidateVies,
  viesChecking = false,
  viesMessage = "",
  onViesInputChange,
  onCheckWhatsapp,
  whatsappMessage = ""
}) {
  const isSupplier = contactKind === "supplier";
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
          <h4>{isSupplier ? "Datos del proveedor" : "Datos del contacto"}</h4>
          <p>Información general, fiscal y dirección principal.</p>
        </div>
      </header>
      <div className="lead-main-grid contact-data-grid">
        {!isSupplier ? <label className="lead-level-field contact-level-field">
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
        </label> : null}
        {!isSupplier ? <label className="lead-discount-field">
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
        </label> : null}
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
        {form.customerType !== "particular" || isSupplier ? (
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

function LeadCrmFields({ form, setForm, paymentNotificationsAllowed, fallbackCountry = "ES", contactKind = "client" }) {
  const isSupplier = contactKind === "supplier";
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
            <p>{isSupplier ? "Condiciones habituales de pago y relación de compras." : "Condiciones habituales de cobro para presupuestos y futuras facturas."}</p>
          </div>
        </header>
        <div className="crm-preferences-grid">
          <label>
            <span>{isSupplier ? "Método de pago preferido" : "Método de cobro preferido"}</span>
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

      {!isSupplier ? <section className="crm-section notifications-section">
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
      </section> : null}
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
        contactKind: "client",
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
        contactKind="client"
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
        contactKind="client"
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
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const quotes = useResource(() => apiRequest("/api/sales/quotes?limit=200", { token }), [token]);
  const leads = useResource(() => apiRequest("/api/sales/leads?limit=500&contactKind=client", { token }), [token]);
  const leadsById = useMemo(() => {
    const map = new Map();
    (leads.data?.items || []).forEach((lead) => map.set(lead.id, lead));
    return map;
  }, [leads.data]);
  const quoteRows = (quotes.data?.items || []).map((quote) => serializeSalesQuote(quote, leadsById));
  const filteredQuotes = quoteRows.filter((quote) => {
    const haystack = `${quote.number} ${quote.contact} ${quote.status} ${quote.total} ${quote.detail}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || quote.statusKey === statusFilter;
    return matchesQuery && matchesStatus;
  });

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
    <div className="module-page quotes-page">
      <header className="module-page-header invoices-page-header">
        <h3>Presupuestos</h3>
        <div className="quote-header-actions">
          <select
            className="quote-template-select"
            aria-label="Presupuestos predefinidos"
            value=""
            onChange={(event) => openTemplateQuote(event.target.value)}
          >
            <option value="">Presupuestos predefinidos</option>
            {QUOTE_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
          <button className="invoice-new-split single-action" type="button" onClick={openEmptyQuote}>
            Nuevo presupuesto
          </button>
        </div>
      </header>

      {quotes.error || leads.error ? <p className="form-error">{quotes.error || leads.error}</p> : null}
      <section className="module-panel invoices-list-panel quotes-list-panel">
        <div className="invoice-toolbar">
          <button className="invoice-view-filter" type="button">
            <FileText size={18} />
            Todos los presupuestos
            <ChevronDown size={16} />
          </button>
          <div className="module-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar..." />
          </div>
          <button className="invoice-date-filter" type="button">
            <CalendarDays size={18} />
            Todas las fechas
            <ChevronDown size={16} />
          </button>
        </div>
        <div className="module-filters invoice-filter-row">
          <label className="invoice-filter-select">
            <span>Estado</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Todos los estados</option>
              {QUOTE_STATUS_OPTIONS.map((status) => (
                <option key={status.filterKey} value={status.filterKey}>{status.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap invoice-table-wrap">
          <table className="module-table invoice-table quotes-table">
            <thead>
              <tr>
                <th className="select-column"><input type="checkbox" aria-label="Seleccionar todos los presupuestos" /></th>
                <th className="invoice-kind-column"></th>
                <th>Fecha <span className="sort-arrow">↓</span></th>
                <th>Estado</th>
                <th>Serie / Núm.</th>
                <th>Cliente / Detalle</th>
                <th>Subtotal</th>
                <th>Total</th>
                <th>Moneda</th>
              </tr>
            </thead>
            <tbody>
              {quotes.loading || leads.loading ? (
                <tr className="empty-table-row">
                  <td colSpan={9}>Cargando presupuestos...</td>
                </tr>
              ) : null}
              {!quotes.loading && !leads.loading && !filteredQuotes.length ? (
                <tr className="empty-table-row">
                  <td colSpan={9}>No hay presupuestos para mostrar todavía.</td>
                </tr>
              ) : null}
              {filteredQuotes.map((quote) => (
                <tr
                  className="clickable-table-row"
                  key={quote.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedQuote(quote)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedQuote(quote);
                    }
                  }}
                >
                  <td className="select-column">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar presupuesto ${quote.number}`}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    />
                  </td>
                  <td className="invoice-kind-column"><span className="invoice-kind-badge quote-badge">P</span></td>
                  <td>{dateOnly(quote.date)}</td>
                  <td><span className={`invoice-payment-status ${quote.statusKey}`}>{quote.status}</span></td>
                  <td>{quote.number}</td>
                  <td>
                    <div className="invoice-detail-cell">
                      <strong>{quote.contact}</strong>
                      <span>{quote.detail}</span>
                      <span className="invoice-row-icons">
                        {quote.hasAttachment ? <Paperclip size={17} /> : null}
                        <Mail size={18} />
                      </span>
                    </div>
                  </td>
                  <td>{tableMoney(quote.subtotal)}</td>
                  <td>{tableMoney(quote.total)}</td>
                  <td>{quote.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {showForm ? (
        <ModalShell
          title={selectedTemplate ? selectedTemplate.name : "Nuevo presupuesto"}
          eyebrow={selectedTemplate ? "Presupuesto predefinido" : "Presupuesto"}
          size="wide-modal quote-work-modal"
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
      {selectedQuote ? (
        <QuoteEditorModal
          token={token}
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onDone={() => {
            setSelectedQuote(null);
            quotes.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function QuoteEditorModal({ token, quote, onClose, onDone }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const detail = useResource(() => apiRequest(`/api/sales/quotes/${quote.id}`, { token }), [token, quote.id]);
  const item = detail.data?.item || null;

  function openQuoteSendFromMenu() {
    window.setTimeout(() => {
      document.querySelector(".quote-work-modal .send-quote-button")?.click();
    }, 0);
  }

  return (
    <ModalShell
      title={`Presupuesto ${quote.number}`}
      eyebrow="Editar presupuesto"
      size="wide-modal quote-work-modal"
      onClose={onClose}
      actions={(
        <>
          <button className="document-actions-trigger" type="button" onClick={() => setActionsOpen(true)} aria-label="Opciones de presupuesto">
            <MoreVertical size={22} />
          </button>
          {actionsOpen ? (
            <DocumentActionsMenu
              type="quote"
              onClose={() => setActionsOpen(false)}
              onSend={openQuoteSendFromMenu}
            />
          ) : null}
        </>
      )}
    >
      {detail.error ? <p className="form-error">{detail.error}</p> : null}
      {detail.loading ? <p className="muted-text">Cargando presupuesto...</p> : null}
      {item ? (
        <QuoteForm
          key={item.id}
          token={token}
          initialQuote={item}
          onCancel={onClose}
          onDone={onDone}
        />
      ) : null}
    </ModalShell>
  );
}

function QuoteDetailModal({ token, quote, lead, onClose }) {
  const detail = useResource(() => apiRequest(`/api/sales/quotes/${quote.id}`, { token }), [token, quote.id]);
  const item = detail.data?.item || null;
  const catalogLocale = item?.locale || quote.locale || "es";
  const catalog = useResource(
    () => apiRequest(`/api/catalog/products?locale=${encodeURIComponent(catalogLocale)}&channel=sales_app`, { token }),
    [token, catalogLocale]
  );
  const lines = item?.items || [];
  const status = quoteStatusState(item?.status || quote.status);
  const productsBySku = useMemo(() => {
    const map = new Map();
    (catalog.data?.products || []).forEach((product) => map.set(product.sku, product));
    return map;
  }, [catalog.data]);

  function productForQuoteLine(line) {
    const catalogProduct = productsBySku.get(line.sku);
    const snapshot = line.productSnapshot || {};
    if (!catalogProduct) return Object.keys(snapshot).length ? snapshot : { sku: line.sku, title: line.title };

    return {
      ...catalogProduct,
      ...snapshot,
      sku: line.sku,
      title: catalogProduct.title || snapshot.title || line.title,
      mainImageUrl: catalogProduct.mainImageUrl || snapshot.mainImageUrl,
      media: catalogProduct.media || snapshot.media,
      shortDescription: catalogProduct.shortDescription || snapshot.shortDescription,
      slug: catalogProduct.slug || snapshot.slug
    };
  }

  return (
    <ModalShell
      title={`Presupuesto ${quote.number}`}
      eyebrow="Ficha de presupuesto"
      size="wide-modal quote-record-modal"
      onClose={onClose}
    >
      <div className="quote-record-body">
        {detail.error ? <p className="form-error">{detail.error}</p> : null}
        {catalog.error ? <p className="form-error">{catalog.error}</p> : null}
        {detail.loading ? <p className="muted-text">Cargando presupuesto...</p> : null}
        {item ? (
          <>
            <div className="detail-grid quote-detail-grid">
              <DetailItem label="Cliente" value={lead?.companyName || lead?.fullName || quote.contact} />
              <DetailItem label="Fecha" value={dateOnly(item.createdAt)} />
              <DetailItem label="Estado" value={status.label} />
              <DetailItem label="Serie / Núm." value={item.quoteNumber} />
              <DetailItem label="Subtotal" value={money(item.subtotal)} />
              <DetailItem label="Total" value={money(item.total)} />
            </div>

            <section className="quote-record-section">
              <header>
                <h4>Líneas del presupuesto</h4>
              </header>
              <div className="table-wrap quote-record-lines">
                <table className="module-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Referencia</th>
                      <th>Descripción</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>Dto (%)</th>
                      <th>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const product = productForQuoteLine(line);
                      return (
                      <tr key={line.id}>
                        <td><ProductThumbnail product={product} /></td>
                        <td>{line.sku}</td>
                        <td>
                          <div className="quote-record-description">
                            <strong>{line.title}</strong>
                            <span>{product.shortDescription || product.slug || ""}</span>
                          </div>
                        </td>
                        <td>{tableMoney(line.quantity)}</td>
                        <td>{money(line.unitPrice)}</td>
                        <td>{tableMoney(line.discountPercent)}</td>
                        <td>{money(line.lineTotal)}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="quote-record-section">
              <header>
                <h4>Notas</h4>
              </header>
              <p className="quote-record-notes">{item.notes || "Sin notas."}</p>
            </section>
          </>
        ) : null}
      </div>
    </ModalShell>
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

function QuoteForm({ token, onDone, onCancel, template, initialQuote }) {
  const [clientMode, setClientMode] = useState("existing");
  const [selectedLeadId, setSelectedLeadId] = useState(initialQuote?.leadId || "");
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [leadSearchTouched, setLeadSearchTouched] = useState(false);
  const [selectedLeadSnapshot, setSelectedLeadSnapshot] = useState(null);
  const [leadDraft, setLeadDraft] = useState(null);
  const [leadSaveStatus, setLeadSaveStatus] = useState("");
  const [leadSaving, setLeadSaving] = useState(false);
  const [quoteViesMessage, setQuoteViesMessage] = useState("");
  const [quoteViesChecking, setQuoteViesChecking] = useState(false);
  const normalizedLeadSearch = leadSearchQuery.trim();
  const leads = useResource(
    () => apiRequest(`/api/sales/leads?limit=25&contactKind=client&q=${encodeURIComponent(normalizedLeadSearch)}`, { token }),
    [token, normalizedLeadSearch]
  );
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [documentPicker, setDocumentPicker] = useState(null);
  const [attachments, setAttachments] = useState(() =>
    (initialQuote?.attachments || []).map((attachment) => ({
      id: attachment.id || crypto.randomUUID(),
      type: attachment.type || "Archivo",
      name: attachment.name,
      source: attachment.source || "local",
      url: attachment.url || ""
    }))
  );
  const [lines, setLines] = useState(() => {
    if (initialQuote?.items?.length) {
      return initialQuote.items.map((line) => ({
        id: line.id || crypto.randomUUID(),
        skuQuery: line.sku || "",
        sku: line.sku || "",
        quantity: line.quantity || 1,
        discountPercent: line.discountPercent || 0,
        unitPriceOverride: line.unitPrice,
        manualTotal: null
      }));
    }

    if (template?.lines?.length) {
      return template.lines.map((line) => ({
        id: crypto.randomUUID(),
        skuQuery: line.sku,
        sku: line.sku,
        quantity: line.quantity || 1,
        discountPercent: line.discountPercent || 0,
        manualTotal: null
      }));
    }

    return [{ id: crypto.randomUUID(), skuQuery: "K240", sku: "K240", quantity: 1, discountPercent: 0, manualTotal: null }];
  });
  const [draggingLineId, setDraggingLineId] = useState("");
  const [taxRate, setTaxRate] = useState(() => {
    if (!initialQuote?.subtotal) return 21;
    return Math.round((Number(initialQuote.taxTotal || 0) / Number(initialQuote.subtotal || 1)) * 100);
  });
  const [notes, setNotes] = useState(initialQuote?.notes || "");
  const [quoteStatus, setQuoteStatus] = useState(initialQuote?.status || "draft");
  const [quoteDate, setQuoteDate] = useState(inputDate(initialQuote?.createdAt || new Date()));
  const [validUntil, setValidUntil] = useState(addDaysInput(initialQuote?.createdAt || new Date(), 30));
  const [paymentMethod, setPaymentMethod] = useState(initialQuote?.paymentMethod || "");
  const [internalNotes, setInternalNotes] = useState(initialQuote?.internalNotes || "");
  const [quoteLanguage, setQuoteLanguage] = useState(initialQuote?.locale || "es");
  const [quoteLanguageTouched, setQuoteLanguageTouched] = useState(false);
  const catalog = useResource(
    () => apiRequest(`/api/catalog/products?locale=${encodeURIComponent(quoteLanguage || "es")}&channel=sales_app`, { token }),
    [token, quoteLanguage]
  );
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendDraft, setSendDraft] = useState(null);
  const [sendStatus, setSendStatus] = useState("");
  const [error, setError] = useState("");
  const lineReferenceRefs = useRef({});
  const fileInputRef = useRef(null);
  const lastDiscountLeadId = useRef("");

  const products = catalog.data?.products || [];
  const leadsList = leads.data?.items || [];
  const leadOptionLabel = (lead) =>
    `${lead.fullName}${lead.companyName ? ` · ${lead.companyName}` : ""}${lead.taxId ? ` · ${lead.taxId}` : ""}`;
  const selectedLead = (selectedLeadSnapshot?.id === selectedLeadId ? selectedLeadSnapshot : null) || leadsList.find((lead) => lead.id === selectedLeadId) || null;
  const filteredLeadSuggestions = useMemo(() => {
    const needle = leadSearchQuery.trim().toLowerCase();
    const source = needle
      ? leadsList.filter((lead) =>
          [
            lead.fullName,
            lead.companyName,
            lead.email,
            lead.phone,
            lead.mobilePhone,
            lead.taxId,
            lead.country
          ].some((value) => String(value || "").toLowerCase().includes(needle))
        )
      : leadsList;

    return source.slice(0, 12);
  }, [leadsList, leadSearchQuery]);
  const leadBillingSource = leadDraft || selectedLead;
  const billingData = selectedLead
    ? [
        leadBillingSource.fullName || leadBillingSource.companyName,
        [leadBillingSource.address, leadBillingSource.postalCode, leadBillingSource.city || leadBillingSource.town, leadBillingSource.province].filter(Boolean).join(" "),
        leadBillingSource.country
      ].filter(Boolean).join("\n")
    : "Sin datos de facturación";
  const selectedStatusLabel = QUOTE_STATUS_OPTIONS.find((status) => status.value === quoteStatus)?.label || "Pendiente";
  const selectedQuoteLanguageLabel = QUOTE_LANGUAGE_OPTIONS.find((language) => language.value === quoteLanguage)?.label || "Español";
  const quotePdfText = QUOTE_PDF_TEXT[quoteLanguage] || QUOTE_PDF_TEXT.es;
  const quoteClientBlock = selectedLead
    ? [
        leadBillingSource.fullName || leadBillingSource.companyName,
        [leadBillingSource.address, leadBillingSource.postalCode, leadBillingSource.population || leadBillingSource.city, leadBillingSource.province].filter(Boolean).join(" "),
        countryLabel(leadBillingSource.country)
      ].filter(Boolean)
    : ["Cliente sin asignar"];

  useEffect(() => {
    if (!selectedLead || lastDiscountLeadId.current === selectedLead.id) return;

    lastDiscountLeadId.current = selectedLead.id;
    const defaultDiscount = Number(selectedLead.defaultDiscountPercent || 0);
    if (selectedLead.viesValid || selectedLead.taxIdentifierType === "sujeto_pasivo") {
      setTaxRate(0);
    } else if (selectedLead.defaultTaxRate !== null && selectedLead.defaultTaxRate !== undefined) {
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

  useEffect(() => {
    if (!selectedLead || leadSearchTouched) return;
    setLeadSearchQuery(leadOptionLabel(selectedLead));
  }, [selectedLead, leadSearchTouched]);

  useEffect(() => {
    if (!selectedLead) {
      setLeadDraft(null);
      setLeadSaveStatus("");
      return;
    }

    setLeadDraft({
      fullName: selectedLead.fullName || "",
      companyName: selectedLead.companyName || "",
      taxId: selectedLead.taxId || "",
      email: selectedLead.email || "",
      phone: selectedLead.phone || "",
      mobilePhone: selectedLead.mobilePhone || "",
      address: selectedLead.address || "",
      postalCode: selectedLead.postalCode || "",
      population: selectedLead.population || "",
      city: selectedLead.city || "",
      province: selectedLead.province || "",
      country: selectedLead.country || "ES",
      taxIdentifierType: selectedLead.taxIdentifierType || (selectedLead.taxId ? "cif" : "nif"),
      viesEnabled: Boolean(selectedLead.viesEnabled),
      viesValid: Boolean(selectedLead.viesValid),
      defaultTaxRate: selectedLead.defaultTaxRate ?? 21
    });
    setLeadSaveStatus("");
    setQuoteViesMessage("");
  }, [selectedLead?.id]);

  useEffect(() => {
    if (!selectedLead || quoteLanguageTouched) return;
    setQuoteLanguage(quoteLanguageForCountry(selectedLead.country));
  }, [selectedLead?.country, quoteLanguageTouched]);

  useEffect(() => {
    if (!leadDraft?.country || quoteLanguageTouched) return;
    setQuoteLanguage(quoteLanguageForCountry(leadDraft.country));
  }, [leadDraft?.country, quoteLanguageTouched]);

  function chooseLead(lead) {
    setSelectedLeadId(lead.id);
    setSelectedLeadSnapshot(lead);
    setLeadSearchQuery(lead.fullName || lead.companyName || leadOptionLabel(lead));
    setLeadSearchTouched(false);
    setLeadSearchOpen(false);
  }

  function updateLeadSearch(value) {
    setLeadSearchQuery(value);
    setLeadSearchTouched(true);
    setLeadSearchOpen(true);
    const exactLead = leadsList.find((lead) => leadOptionLabel(lead).toLowerCase() === value.trim().toLowerCase());
    setSelectedLeadId(exactLead?.id || "");
    setSelectedLeadSnapshot(exactLead || null);
  }

  function updateLeadDraft(patch) {
    setLeadDraft((current) => ({ ...(current || {}), ...patch }));
    setLeadSaveStatus("");
    if (patch.taxId !== undefined || patch.country !== undefined || patch.taxIdentifierType !== undefined) {
      setQuoteViesMessage("");
    }
  }

  async function validateQuoteLeadVies() {
    if (!selectedLead || !leadDraft?.taxId || !leadDraft?.country) return;

    setQuoteViesChecking(true);
    setQuoteViesMessage("");
    setLeadSaveStatus("");
    try {
      const payload = await apiRequest("/api/sales/vies/validate", {
        token,
        method: "POST",
        body: { countryCode: leadDraft.country, vatNumber: leadDraft.taxId }
      });
      const result = payload?.result;
      const isValid = Boolean(result?.valid);
      const patchedLead = {
        ...selectedLead,
        ...leadDraft,
        contactKind: "client",
        fullName: leadDraft.fullName || selectedLead.fullName || selectedLead.companyName || "Cliente",
        customerType: selectedLead.customerType || "particular",
        customerLevel: selectedLead.customerLevel || "level_1",
        defaultDiscountPercent: selectedLead.defaultDiscountPercent || 0,
        defaultDiscountMaxPercent: selectedLead.defaultDiscountMaxPercent ?? selectedLead.defaultDiscountPercent ?? 0,
        taxIdentifierType: leadDraft.taxIdentifierType || selectedLead.taxIdentifierType || "cif",
        viesEnabled: true,
        viesValid: isValid,
        defaultTaxRate: isValid ? 0 : (selectedLead.defaultTaxRate ?? 21),
        additionalAddresses: selectedLead.additionalAddresses || [],
        communicationContacts: selectedLead.communicationContacts || [],
        preferredPaymentMethod: selectedLead.preferredPaymentMethod || "",
        paymentTermDays: selectedLead.paymentTermDays || null,
        paymentNotificationsEnabled: Boolean(selectedLead.paymentNotificationsEnabled)
      };
      const saveResult = await apiRequest(`/api/sales/leads/${selectedLead.id}`, {
        token,
        method: "PATCH",
        body: patchedLead
      });
      setSelectedLeadSnapshot(saveResult.item);
      setLeadDraft((current) => ({
        ...(current || {}),
        viesEnabled: true,
        viesValid: isValid,
        defaultTaxRate: isValid ? 0 : (current?.defaultTaxRate ?? 21)
      }));
      if (isValid) {
        setTaxRate(0);
      }
      setQuoteViesMessage(isValid ? `VIES validado${result?.name ? ` · ${result.name}` : ""}. IVA 0%.` : "No consta como válido en VIES.");
      leads.reload();
    } catch (err) {
      setQuoteViesMessage(err.message);
    } finally {
      setQuoteViesChecking(false);
    }
  }

  async function saveSelectedLeadDraft() {
    if (!selectedLead || !leadDraft) return;

    setLeadSaving(true);
    setLeadSaveStatus("");
    try {
      const payload = {
        ...selectedLead,
        ...leadDraft,
        fullName: leadDraft.fullName || selectedLead.fullName || selectedLead.companyName || "Cliente",
        contactKind: "client",
        customerType: selectedLead.customerType || "particular",
        customerLevel: selectedLead.customerLevel || "level_1",
        defaultDiscountPercent: selectedLead.defaultDiscountPercent || 0,
        defaultDiscountMaxPercent: selectedLead.defaultDiscountMaxPercent ?? selectedLead.defaultDiscountPercent ?? 0,
        taxIdentifierType: selectedLead.taxIdentifierType || (leadDraft.taxId ? "cif" : "nif"),
        additionalAddresses: selectedLead.additionalAddresses || [],
        communicationContacts: selectedLead.communicationContacts || [],
        preferredPaymentMethod: selectedLead.preferredPaymentMethod || "",
        paymentTermDays: selectedLead.paymentTermDays || null,
        paymentNotificationsEnabled: Boolean(selectedLead.paymentNotificationsEnabled),
        viesEnabled: Boolean(leadDraft.viesEnabled || selectedLead.viesEnabled),
        viesValid: Boolean(leadDraft.viesValid || selectedLead.viesValid),
        defaultTaxRate: leadDraft.viesValid || leadDraft.taxIdentifierType === "sujeto_pasivo"
          ? 0
          : (leadDraft.defaultTaxRate ?? selectedLead.defaultTaxRate ?? 21)
      };
      const result = await apiRequest(`/api/sales/leads/${selectedLead.id}`, { token, method: "PATCH", body: payload });
      setSelectedLeadSnapshot(result.item);
      setLeadDraft({
        fullName: result.item.fullName || "",
        companyName: result.item.companyName || "",
        taxId: result.item.taxId || "",
        email: result.item.email || "",
        phone: result.item.phone || "",
        mobilePhone: result.item.mobilePhone || "",
        address: result.item.address || "",
        postalCode: result.item.postalCode || "",
        population: result.item.population || "",
        city: result.item.city || "",
        province: result.item.province || "",
        country: result.item.country || "ES"
      });
      setLeadSearchQuery(result.item.fullName || result.item.companyName || leadOptionLabel(result.item));
      setLeadSearchTouched(false);
      setLeadSaveStatus("Datos del cliente guardados.");
      leads.reload();
    } catch (err) {
      setLeadSaveStatus(err.message);
    } finally {
      setLeadSaving(false);
    }
  }

  function productForLine(line) {
    return products.find((product) => product.sku === line.skuQuery.trim()) || products.find((product) => product.sku === line.sku) || null;
  }

  function lineTotal(line) {
    if (line.manualTotal !== null && line.manualTotal !== undefined && line.manualTotal !== "") {
      return normalizeMoneyValue(line.manualTotal);
    }

    const product = productForLine(line);
    const unitPrice = line.unitPriceOverride !== undefined && line.unitPriceOverride !== null
      ? Number(line.unitPriceOverride)
      : product?.pricePvpEur || 0;
    return unitPrice * Number(line.quantity || 0) * (1 - Number(line.discountPercent || 0) / 100);
  }

  function effectiveUnitPrice(line) {
    if (line.manualTotal === null || line.manualTotal === undefined || line.manualTotal === "") return undefined;

    const quantity = Math.max(Number(line.quantity || 0), 1);
    const discountFactor = 1 - Number(line.discountPercent || 0) / 100;
    if (discountFactor <= 0) return normalizeMoneyValue(line.manualTotal) / quantity;
    return normalizeMoneyValue(line.manualTotal) / quantity / discountFactor;
  }

  function unitPriceForSubmit(line) {
    const manualUnitPrice = effectiveUnitPrice(line);
    if (manualUnitPrice !== undefined) return manualUnitPrice;
    if (line.unitPriceOverride !== undefined && line.unitPriceOverride !== null && line.unitPriceOverride !== "") {
      return Number(line.unitPriceOverride);
    }
    return undefined;
  }

  function updateLine(lineId, patch) {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  }

  function createEmptyLine() {
    return { id: crypto.randomUUID(), skuQuery: "", sku: "", quantity: 1, discountPercent: 0, manualTotal: null };
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
  const quoteNumberLabel = initialQuote?.quoteNumber || initialQuote?.number || "borrador";
  const quotePdfName = `Presupuesto-${quoteDate || inputDate(new Date())}-${quoteNumberLabel}.pdf`;

  function buildDefaultSendDraft() {
    return {
      to: leadDraft?.email || selectedLead?.email || "",
      from: "ADMINISTRACION <administracion@doinglight.es>",
      subject: initialQuote?.quoteNumber ? `Envío presupuesto ${initialQuote.quoteNumber}` : "Envío presupuesto",
      body: "Estimado cliente:\n\nAdjunto a este correo encontrará nuestro presupuesto.\n\nSi tiene cualquier consulta, no dude en contactar con nosotros.",
      attachPdf: true
    };
  }

  function openSendModal() {
    setSendDraft(buildDefaultSendDraft());
    setSendStatus("");
    setSendModalOpen(true);
  }

  function updateSendDraft(patch) {
    setSendDraft((current) => ({ ...(current || buildDefaultSendDraft()), ...patch }));
    setSendStatus("");
  }

  function prepareSend(event) {
    event.preventDefault();
    setSendStatus("Envío preparado. Conectaremos el envío real cuando cerremos la plantilla PDF definitiva.");
  }

  async function submit(event) {
    event?.preventDefault();
    setError("");
    try {
      let leadId = selectedLeadId || null;
      if (clientMode === "new") {
        setError("Guarda primero el cliente nuevo desde el bloque de cliente.");
        return;
      }

      await apiRequest(initialQuote ? `/api/sales/quotes/${initialQuote.id}` : "/api/sales/quotes", {
        token,
        method: initialQuote ? "PATCH" : "POST",
        body: {
          locale: quoteLanguage || "es",
          leadId,
          status: quoteStatus,
          notes,
          taxTotal,
          attachments: attachments.map((attachment) => ({
            name: attachment.name,
            type: attachment.type,
            source: attachment.source,
            url: attachment.url
          })),
          items: lines
            .map((line) => ({
              sku: line.sku || line.skuQuery.trim(),
              quantity: Number(line.quantity),
              discountPercent: Number(line.discountPercent),
              unitPrice: unitPriceForSubmit(line)
            }))
            .filter((line) => line.sku)
        }
      });
      onDone();
    } catch (err) {
      setError(err.message);
    }
  }

  function addAttachment(attachment) {
    setAttachments((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        ...attachment
      }
    ]);
    setAttachmentMenuOpen(false);
    setDocumentPicker(null);
  }

  function removeAttachment(attachmentId) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  }

  function handleFileInput(event) {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => addAttachment({ type: "Archivo", name: file.name, source: "local" }));
    event.target.value = "";
  }

  return (
    <div className="modal-form quote-modal-form">
      <section className="quote-fd-header">
        <div className="quote-fd-toolbar">
          <span>Operación: <strong>Empresa nacional</strong></span>
          <span>Plantilla: <strong>Tubo Solar</strong></span>
          <span>Responsable: <strong>-</strong> <button type="button">Cambiar</button></span>
        </div>
        <div className="quote-fd-title-row">
          <h4>Presupuesto</h4>
          <div className="quote-fd-total">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
        </div>
      </section>

      <section className="quote-fd-fields">
        <div className="quote-fd-actions">
          <div className="quote-client-header-actions">
            <div className="segmented-control">
              <button type="button" className={clientMode === "existing" ? "active" : ""} onClick={() => setClientMode("existing")}>
                Buscar
              </button>
              <button type="button" className={clientMode === "new" ? "active" : ""} onClick={() => setClientMode("new")}>
                Crear
              </button>
            </div>
            <div className="attachment-menu-wrap">
              <button
                className="attachment-trigger icon-only-attachment"
                type="button"
                onClick={() => setAttachmentMenuOpen((value) => !value)}
                aria-label="Adjuntar archivo"
                aria-haspopup="menu"
                aria-expanded={attachmentMenuOpen}
                title="Adjuntar archivo"
              >
                <Paperclip size={18} />
              </button>
              {attachmentMenuOpen ? (
                <div className="attachment-menu" role="menu">
                  <button type="button" onClick={() => fileInputRef.current?.click()} role="menuitem">Subir un archivo</button>
                  <button type="button" onClick={() => setDocumentPicker("Catálogos")} role="menuitem">Catálogos</button>
                  <button type="button" onClick={() => setDocumentPicker("Fichas técnicas")} role="menuitem">Fichas técnicas</button>
                  <button type="button" onClick={() => setDocumentPicker("Certificados")} role="menuitem">Certificados</button>
                </div>
              ) : null}
              <input ref={fileInputRef} type="file" multiple onChange={handleFileInput} hidden />
            </div>
          </div>
        </div>

        {clientMode === "existing" ? (
          <div className="quote-fd-grid">
            <label className="quote-client-search-field">
              <span>Cliente</span>
              <div className="quote-client-search-wrap">
                <input
                  value={leadSearchQuery}
                  onChange={(event) => updateLeadSearch(event.target.value)}
                  onFocus={() => setLeadSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setLeadSearchOpen(false), 140)}
                  placeholder="Buscar cliente por nombre, empresa, email, teléfono o NIF/CIF"
                  autoComplete="off"
                />
                <Search className="quote-client-search-icon" size={17} />
                {leadSearchOpen ? (
                  <div className="quote-client-suggestions" role="listbox">
                    {leads.loading ? (
                      <div className="quote-client-suggestion empty">
                        <span>Buscando clientes...</span>
                      </div>
                    ) : filteredLeadSuggestions.length ? (
                      filteredLeadSuggestions.map((lead) => (
                        <button
                          type="button"
                          className={`quote-client-suggestion ${lead.id === selectedLeadId ? "active" : ""}`}
                          key={lead.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => chooseLead(lead)}
                          role="option"
                          aria-selected={lead.id === selectedLeadId}
                        >
                          <strong>{lead.fullName || lead.companyName || "Cliente sin nombre"}</strong>
                          <span>{[lead.companyName, lead.email, lead.phone || lead.mobilePhone, lead.taxId].filter(Boolean).join(" · ") || "Sin datos adicionales"}</span>
                        </button>
                      ))
                    ) : (
                      <div className="quote-client-suggestion empty">
                        <span>No hay clientes con ese texto.</span>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setClientMode("new");
                            setLeadSearchOpen(false);
                          }}
                        >
                          Crear cliente
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              {selectedLead ? <small>{selectedLead.email || "Sin email"} · {selectedLead.phone || "Sin teléfono"}</small> : null}
            </label>
            {selectedLead && leadDraft ? (
              <div className="quote-client-quick-edit">
                <div className="quote-client-quick-edit-head">
                  <div>
                    <strong>Datos rápidos del cliente</strong>
                    <span>Completa estos campos sin salir del presupuesto.</span>
                  </div>
                  <button type="button" onClick={saveSelectedLeadDraft} disabled={leadSaving}>
                    {leadSaving ? "Guardando..." : "Guardar cliente"}
                  </button>
                </div>
                <div className="quote-client-quick-edit-grid">
                  <input value={leadDraft.email} onChange={(event) => updateLeadDraft({ email: event.target.value })} placeholder="Correo electrónico" />
                  <input value={leadDraft.phone} onChange={(event) => updateLeadDraft({ phone: event.target.value })} placeholder="Teléfono" />
                  <input value={leadDraft.mobilePhone} onChange={(event) => updateLeadDraft({ mobilePhone: event.target.value })} placeholder="Teléfono móvil" />
                  <select value={leadDraft.taxIdentifierType || "cif"} onChange={(event) => updateLeadDraft({ taxIdentifierType: event.target.value, viesValid: false })}>
                    <option value="nif">NIF</option>
                    <option value="cif">CIF</option>
                    <option value="sujeto_pasivo">Sujeto pasivo</option>
                  </select>
                  <div className="quote-vies-quick-field">
                    <input value={leadDraft.taxId} onChange={(event) => updateLeadDraft({ taxId: event.target.value.toUpperCase(), viesValid: false })} placeholder="NIF / CIF intracomunitario" />
                    <button
                      className={[
                        "secondary-button",
                        leadDraft.viesValid ? "vies-validated-button" : "",
                        quoteViesMessage && !leadDraft.viesValid ? "vies-invalid-button" : ""
                      ].filter(Boolean).join(" ")}
                      type="button"
                      onClick={validateQuoteLeadVies}
                      disabled={!leadDraft.country || !leadDraft.taxId || quoteViesChecking}
                    >
                      {leadDraft.viesValid ? <CheckCircle2 size={15} /> : null}
                      {quoteViesChecking ? "Validando..." : leadDraft.viesValid ? "VIES validado" : quoteViesMessage && !leadDraft.viesValid ? "VIES no válido" : "Validar VIES"}
                    </button>
                  </div>
                  <input value={leadDraft.companyName} onChange={(event) => updateLeadDraft({ companyName: event.target.value })} placeholder="Empresa" />
                  <input value={leadDraft.address} onChange={(event) => updateLeadDraft({ address: event.target.value })} placeholder="Dirección" />
                  <input value={leadDraft.postalCode} onChange={(event) => updateLeadDraft({ postalCode: event.target.value })} placeholder="C.P." />
                  <input value={leadDraft.population} onChange={(event) => updateLeadDraft({ population: event.target.value })} placeholder="Población" />
                  <input value={leadDraft.city} onChange={(event) => updateLeadDraft({ city: event.target.value })} placeholder="Ciudad" />
                  <input value={leadDraft.province} onChange={(event) => updateLeadDraft({ province: event.target.value })} placeholder="Provincia" />
                  <select value={leadDraft.country} onChange={(event) => updateLeadDraft({ country: event.target.value })}>
                    {EUROPEAN_COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>{country.label}</option>
                    ))}
                  </select>
                </div>
                {leadSaveStatus ? <p className={leadSaveStatus.includes("guardados") ? "form-success" : "form-error"}>{leadSaveStatus}</p> : null}
                {quoteViesMessage ? <p className={leadDraft.viesValid ? "form-success" : "form-error"}>{quoteViesMessage}</p> : null}
              </div>
            ) : null}
            <label>
              <span>Fecha</span>
              <input type="date" value={quoteDate} onChange={(event) => setQuoteDate(event.target.value)} />
            </label>
            <label>
              <span>Número de documento</span>
              <input value={initialQuote?.quoteNumber || ""} placeholder="Se generará automáticamente" readOnly />
            </label>
            <label>
              <span>Correo electrónico de envío</span>
              <input value={leadDraft?.email || selectedLead?.email || ""} onChange={(event) => updateLeadDraft({ email: event.target.value })} placeholder="Sin correo electrónico" readOnly={!selectedLead} />
            </label>
            <label>
              <span>Válido hasta</span>
              <input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
            </label>
            <label>
              <span>Método de pago</span>
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="">Sin definir</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="receipt">Recibo</option>
              </select>
            </label>
            <label>
              <span>Estado del presupuesto</span>
              <select value={quoteStatus} onChange={(event) => setQuoteStatus(event.target.value)}>
                {QUOTE_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
              <small>{selectedStatusLabel}</small>
            </label>
            <label className="quote-fd-textarea">
              <span>Datos de facturación</span>
              <textarea value={billingData} readOnly />
            </label>
            <label className="quote-fd-textarea">
              <span>Notas</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
              <small>Notas visibles para el cliente</small>
            </label>
            <label className="quote-fd-textarea internal-notes">
              <span>Notas internas</span>
              <textarea value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
              <small>Notas no visibles para el cliente</small>
            </label>
          </div>
        ) : (
          <LeadFormFields
            submitLabel="Guardar cliente"
            onSubmit={(form) => apiRequest("/api/sales/leads", { token, method: "POST", body: form })}
            onValidateVies={(body) => apiRequest("/api/sales/vies/validate", { token, method: "POST", body })}
            onDone={(result) => {
              leads.reload();
              setSelectedLeadId(result.item.id);
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
                    updateLine(line.id, { skuQuery: value, sku: matchedProduct?.sku || "", unitPriceOverride: undefined, manualTotal: null });
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
                <input
                  aria-label="Importe"
                  inputMode="decimal"
                  value={line.manualTotal ?? tableMoney(lineTotal(line))}
                  onChange={(event) => updateLine(line.id, { manualTotal: event.target.value })}
                />
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
      <section className="quote-attachments">
        {attachments.length ? (
          <div className="attachment-chip-list">
            {attachments.map((attachment) => (
              <span className="attachment-chip" key={attachment.id}>
                <Paperclip size={14} />
                {attachment.name}
                <button type="button" onClick={() => removeAttachment(attachment.id)} aria-label={`Quitar ${attachment.name}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p>Sin adjuntos.</p>
        )}
      </section>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        {onCancel ? <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button> : null}
        <button className="primary-button" type="button" onClick={submit}>
          {initialQuote ? "Guardar cambios" : "Crear presupuesto"}
        </button>
        <button className="primary-button send-quote-button" type="button" onClick={openSendModal}>
          Enviar
        </button>
      </div>
      {sendModalOpen && sendDraft ? (
        <div className="quote-send-overlay" role="dialog" aria-modal="true" aria-label="Enviar por correo electrónico">
          <form className="quote-send-dialog" onSubmit={prepareSend}>
            <header className="quote-send-header">
              <h3>Enviar por correo electrónico</h3>
              <button type="button" onClick={() => setSendModalOpen(false)} aria-label="Cerrar envío">
                <X size={28} />
              </button>
            </header>
            <div className="quote-send-content">
              <section className="quote-send-fields">
                <label>
                  <span>Envío a</span>
                  <input value={sendDraft.to} onChange={(event) => updateSendDraft({ to: event.target.value })} placeholder="cliente@correo.com" />
                </label>
                <label>
                  <span>Remitente</span>
                  <select value={sendDraft.from} onChange={(event) => updateSendDraft({ from: event.target.value })}>
                    <option value="ADMINISTRACION <administracion@doinglight.es>">ADMINISTRACION &lt;administracion@doinglight.es&gt;</option>
                    <option value="MARKETING <marketing@doinglight.es>">MARKETING &lt;marketing@doinglight.es&gt;</option>
                    <option value="DOINGLIGHT <info@doinglight.es>">DOINGLIGHT &lt;info@doinglight.es&gt;</option>
                  </select>
                </label>
                <label>
                  <span>Asunto</span>
                  <input value={sendDraft.subject} onChange={(event) => updateSendDraft({ subject: event.target.value })} />
                </label>
                <label className="quote-send-body-field">
                  <span>Contenido</span>
                  <textarea value={sendDraft.body} onChange={(event) => updateSendDraft({ body: event.target.value })} />
                </label>
                <div className="quote-send-attachments">
                  <span>Archivos adjuntos</span>
                  <label>
                    <input
                      type="checkbox"
                      checked={sendDraft.attachPdf}
                      onChange={(event) => updateSendDraft({ attachPdf: event.target.checked })}
                    />
                    <strong>{quotePdfName}</strong>
                  </label>
                </div>
                {sendStatus ? <p className="form-success">{sendStatus}</p> : null}
              </section>
              <section className="quote-send-preview" aria-label="Vista previa del PDF adjunto">
                <label className="quote-pdf-language-row">
                  <span>Idioma del presupuesto</span>
                  <select
                    value={quoteLanguage}
                    onChange={(event) => {
                      setQuoteLanguage(event.target.value);
                      setQuoteLanguageTouched(true);
                    }}
                  >
                    {QUOTE_LANGUAGE_OPTIONS.map((language) => (
                      <option key={language.value} value={language.value}>{language.label}</option>
                    ))}
                  </select>
                </label>
                <div className="quote-pdf-toolbar">
                  <span>Vista previa del PDF · {selectedQuoteLanguageLabel}</span>
                  <div>
                    <button type="button" title="Descargar próximamente"><Download size={17} /></button>
                    <button type="button" title="Imprimir próximamente">PDF</button>
                    <button type="button" title="Más opciones"><MoreVertical size={17} /></button>
                  </div>
                </div>
                <div className="quote-pdf-page quote-pdf-page-template">
                  <section className="quote-pdf-top">
                    <div className="quote-pdf-issuer">
                      <div className="quote-pdf-logo">
                        <span className="quote-pdf-logo-dot" />
                        <div>
                          <strong>DOINGLIGHT</strong>
                          <small>SKYLIGHTS</small>
                        </div>
                      </div>
                      <strong>{quotePdfText.issuedBy}</strong>
                      <span>DOINGLIGHT TECHNOLOGIES, SLU</span>
                      <span>B02555001</span>
                      <span>Polígono Industrial Campollano, Calle E nº 24</span>
                      <span>02007 ALBACETE</span>
                      <span>España</span>
                      <span>info@doinglight.es</span>
                      <span>www.doinglight.es</span>
                      <span>658856869</span>
                    </div>
                    <div className="quote-pdf-document-head">
                      <h2>{quotePdfText.title}</h2>
                      <div className="quote-pdf-number-table">
                        <strong>{quotePdfText.number}</strong>
                        <strong>{quotePdfText.date}</strong>
                        <span>{quoteNumberLabel}</span>
                        <span>{dateOnly(quoteDate)}</span>
                      </div>
                      <div className="quote-pdf-client-box">
                        {quoteClientBlock.map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </div>
                    </div>
                  </section>
                  <table className="quote-pdf-lines-table">
                    <thead>
                      <tr>
                        <th>{quotePdfText.code}</th>
                        <th>{quotePdfText.concept}</th>
                        <th>{quotePdfText.quantity}</th>
                        <th>{quotePdfText.price}</th>
                        <th>{quotePdfText.total}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => {
                        const selectedProduct = productForLine(line);
                        const quantity = Number(line.quantity || 0);
                        const lineAmount = lineTotal(line);
                        const unitPrice = quantity ? lineAmount / quantity : lineAmount;
                        return (
                          <tr key={line.id}>
                            <td>{line.skuQuery || line.sku || "-"}</td>
                            <td>{selectedProduct?.title || selectedProduct?.shortDescription || "Producto pendiente"}</td>
                            <td>{quantity}</td>
                            <td>{tableMoney(unitPrice)}</td>
                            <td>{tableMoney(lineAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="quote-pdf-totals quote-pdf-summary">
                    <span>{quotePdfText.subtotal}</span>
                    <strong>{tableMoney(subtotal)}</strong>
                    <span>{quotePdfText.vat} {taxRate}% (Base: {tableMoney(subtotal)})</span>
                    <strong>{tableMoney(taxTotal)}</strong>
                    <span>{quotePdfText.totalCurrency}</span>
                    <strong>{money(total)}</strong>
                  </div>
                  <table className="quote-pdf-validity-table">
                    <thead>
                      <tr>
                        <th>{quotePdfText.validUntil}</th>
                        <th>{quotePdfText.paymentMethod}</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{dateOnly(validUntil)}</td>
                        <td>{paymentMethod || ""}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                  <div className="quote-pdf-notes quote-pdf-long-notes">
                    <p>{notes || "**Para pagar con tarjeta por favor haga click en el siguiente enlace:**\n\nhttps://sis.redsys.es/sis/p2f?..."}</p>
                    <p>Garantía: 10 Años. Plazo de entrega de 24 a 48 horas (Península)<br />Formas de pago: pre-pago, transferencia bancaria, tarjeta de crédito o Paypal.<br />Portes pagados en pedidos superiores a 1000€ excepto envío a islas y pedidos especiales.</p>
                  </div>
                  <footer className="quote-pdf-privacy">
                    <strong>{quotePdfText.privacyTitle}</strong>
                    <span>{quotePdfText.privacyText}</span>
                  </footer>
                </div>
              </section>
            </div>
            <footer className="quote-send-actions">
              <button className="secondary-button" type="button" onClick={() => setSendModalOpen(false)}>Cancelar</button>
              <button className="quote-send-icon-button" type="button" aria-label="Descargar PDF" title="Descargar PDF">
                <Download size={20} />
              </button>
              <button className="quote-send-icon-button" type="button" aria-label="Imprimir PDF" title="Imprimir PDF">
                <Printer size={20} />
              </button>
              <button className="primary-button send-quote-button" type="submit">
                <Send size={18} />
                Enviar
              </button>
            </footer>
          </form>
        </div>
      ) : null}
      {documentPicker ? (
        <DocumentAttachmentPicker
          category={documentPicker}
          onClose={() => setDocumentPicker(null)}
          onSelect={(document) => addAttachment({ type: documentPicker, name: document.title, source: "library" })}
        />
      ) : null}
    </div>
  );
}

function DocumentAttachmentPicker({ category, onClose, onSelect }) {
  const sampleDocuments = {
    Catálogos: [
      "Catálogo general Doinglight",
      "Catálogo instalador",
      "Tarifa comercial"
    ],
    "Fichas técnicas": [
      "Ficha técnica Kit 240",
      "Ficha técnica Kit 340",
      "Ficha técnica Kit 525"
    ],
    Certificados: [
      "Certificado CE",
      "Certificado de garantía",
      "Certificado de prestaciones"
    ]
  };
  const documents = sampleDocuments[category] || [];

  return (
    <div className="modal-backdrop nested-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article className="document-picker-modal" role="dialog" aria-modal="true" aria-labelledby="document-picker-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="product-detail-header">
          <div>
            <p>Adjuntar documento</p>
            <h3 id="document-picker-title">{category}</h3>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar selector de documentos">
            <X size={18} />
          </button>
        </header>
        <div className="document-picker-body">
          {documents.map((title) => (
            <button className="document-picker-row" type="button" key={title} onClick={() => onSelect({ title })}>
              <FileText size={18} />
              <span>{title}</span>
              <strong>Adjuntar</strong>
            </button>
          ))}
        </div>
      </article>
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
