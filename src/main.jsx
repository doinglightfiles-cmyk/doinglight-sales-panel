import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
const DOCUMENT_PDF_LOGO = "/doinglight-pdf-logo.png";
const TUBO_SOLAR_PDF_LOGO = "/tubosolar-pdf-logo.png";
const PAYMENT_METHOD_DEFAULTS = [
  { id: "fd-zero", name: "0", detail: "" },
  { id: "fd-50-formalizacion-confirming", name: "50% a la formalizacion del pedido y 50% confirming a 60 dias.", detail: "" },
  { id: "fd-50-firma-entrega", name: "50% a la firma del presupuesto y 50% a la entrega", detail: "" },
  { id: "fd-a-concretar", name: "A CONCRETAR ENTRE LAS DOS PARTES ANTES DE FIRMA DE OFERTA.", detail: "" },
  { id: "fd-cheque-sabadell", name: "Cheque", detail: "Sabadell Doinglight ****4476" },
  { id: "fd-efectivo", name: "Efectivo", detail: "DOINGLIGHT TECHNOLOGIES, slu. ****9122" },
  {
    id: "fd-iban-caja-rural",
    name: "IBAN ES11 3144 5700 2720 1693 9122 CAJA R. DE VILLAMALEA, S.C.C.A. CASTILLA-LA MANCHA",
    detail: "Caja Rural de Villamalea"
  },
  { id: "fd-pagare-sabadell", name: "Pagaré a la orden", detail: "Sabadell Doinglight ****4476" },
  { id: "fd-tarjeta", name: "Pago mediante tarjeta", detail: "Caja Rural de Villamalea" },
  { id: "fd-suplidos", name: "Pago por suplidos de otros proveedores", detail: "Suplidos" },
  { id: "fd-paypal", name: "Paypal", detail: "Caja Rural de Villamalea" },
  { id: "fd-recibo", name: "Recibo domiciliado", detail: "Caja Rural de Villamalea" },
  { id: "fd-transferencia", name: "Transferencia", detail: "Caja Rural de Villamalea" },
  { id: "fd-transferencia-sabadell", name: "Transferencia Banco Sabadell", detail: "Sabadell Doinglight ****4476" }
];
const PAYMENT_BANK_OPTIONS = [
  "Caja Rural de Villamalea",
  "Sabadell Doinglight ****4476",
  "DOINGLIGHT TECHNOLOGIES, slu. ****9122",
  "Suplidos"
];

function safeFilePart(value) {
  return String(value || "documento")
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "documento";
}

function splitEmailRecipients(value) {
  const values = Array.isArray(value) ? value : [value];
  const seen = new Set();
  return values
    .flatMap((item) => String(item || "").split(/[\s,;]+/))
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function isValidEmailRecipient(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function EmailRecipientsField({ value, onChange }) {
  const recipients = splitEmailRecipients(value);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState("");

  function addRecipients(rawValue = entry) {
    const candidates = splitEmailRecipients(rawValue);
    if (!candidates.length) return;
    const invalid = candidates.filter((item) => !isValidEmailRecipient(item));
    if (invalid.length) {
      setError(`Revisa ${invalid.length === 1 ? "esta dirección" : "estas direcciones"}: ${invalid.join(", ")}`);
      return;
    }
    onChange(splitEmailRecipients([...recipients, ...candidates]));
    setEntry("");
    setError("");
  }

  function removeRecipient(recipient) {
    onChange(recipients.filter((item) => item.toLowerCase() !== recipient.toLowerCase()));
    setError("");
  }

  function handleKeyDown(event) {
    if (["Enter", ",", ";"].includes(event.key)) {
      event.preventDefault();
      addRecipients();
    }
  }

  return (
    <div className="quote-send-recipient-field">
      <span>Envío a</span>
      <div className="quote-send-recipient-control">
        {recipients.length ? (
          <div className="quote-send-recipient-list" aria-label="Destinatarios del correo">
            {recipients.map((recipient) => (
              <span className="quote-send-recipient-chip" key={recipient.toLowerCase()}>
                <span>{recipient}</span>
                <button type="button" onClick={() => removeRecipient(recipient)} aria-label={`Quitar ${recipient}`}>
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="quote-send-recipient-entry">
          <input
            type="email"
            value={entry}
            onChange={(event) => {
              setEntry(event.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (entry.trim() && isValidEmailRecipient(entry)) addRecipients();
            }}
            placeholder="Añadir otro correo"
            aria-label="Añadir otro correo de destino"
          />
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addRecipients()}>
            <Plus size={17} />
            Añadir
          </button>
        </div>
      </div>
      {error ? <small className="quote-send-recipient-error">{error}</small> : null}
    </div>
  );
}

function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeCompactSearchText(value) {
  return normalizeSearchText(value).replace(/[^a-z0-9]/g, "");
}

function textMatchesQuery(values, query) {
  const needle = normalizeSearchText(query);
  if (!needle) return true;
  const haystack = Array.isArray(values) ? values.join(" ") : values;
  if (normalizeSearchText(haystack).includes(needle)) return true;
  const compactNeedle = normalizeCompactSearchText(query);
  return Boolean(compactNeedle && normalizeCompactSearchText(haystack).includes(compactNeedle));
}

function parseSortableDate(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const asString = String(value);
  const spanishDate = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(asString);
  if (spanishDate) {
    return Date.UTC(Number(spanishDate[3]), Number(spanishDate[2]) - 1, Number(spanishDate[1]));
  }
  const timestamp = Date.parse(asString);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function parseSortableNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const rawValue = String(value || "").trim();
  const normalized = (rawValue.includes(",") ? rawValue.replace(/\./g, "").replace(",", ".") : rawValue)
    .replace(/[^\d.-]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function defaultDocumentSortDirection(key) {
  return ["date", "pendingBalance", "subtotal", "total"].includes(key) ? "desc" : "asc";
}

function documentSortValue(documentRow, key) {
  if (key === "date") return { type: "number", value: parseSortableDate(documentRow.date) };
  if (["pendingBalance", "subtotal", "total"].includes(key)) {
    return { type: "number", value: parseSortableNumber(documentRow[key]) };
  }
  if (key === "number") {
    return { type: "text", value: normalizeSearchText([documentRow.series, documentRow.number].filter(Boolean).join(" ")) };
  }
  if (key === "contact") {
    return { type: "text", value: normalizeSearchText([documentRow.contact, documentRow.detail].filter(Boolean).join(" ")) };
  }
  return { type: "text", value: normalizeSearchText(documentRow[key]) };
}

function sortDocumentRows(rows, sortConfig) {
  const direction = sortConfig.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = documentSortValue(a, sortConfig.key);
    const right = documentSortValue(b, sortConfig.key);
    let result = 0;

    if (left.type === "number" && right.type === "number") {
      result = left.value - right.value;
    } else {
      result = String(left.value).localeCompare(String(right.value), "es", { numeric: true, sensitivity: "base" });
    }

    if (result === 0) {
      result = parseSortableDate(a.date) - parseSortableDate(b.date);
    }

    return result * direction;
  });
}

function useDocumentSort(defaultKey = "date") {
  const [sortConfig, setSortConfig] = useState({
    key: defaultKey,
    direction: defaultDocumentSortDirection(defaultKey)
  });

  function requestSort(key) {
    setSortConfig((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: defaultDocumentSortDirection(key) };
    });
  }

  return { sortConfig, requestSort };
}

function SortableDocumentHeader({ children, sortKey, sortConfig, onSort, className = "" }) {
  const active = sortConfig.key === sortKey;
  const arrow = active ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕";

  return (
    <th className={["sortable-column-header", active ? "active" : "", className].filter(Boolean).join(" ")}>
      <button type="button" onClick={() => onSort(sortKey)}>
        <span>{children}</span>
        <span className="sort-arrow" aria-hidden="true">{arrow}</span>
      </button>
    </th>
  );
}

const DOCUMENT_LIST_INITIAL_ROWS = 25;
const DOCUMENT_LIST_BATCH_SIZE = 25;

function parseDocumentFilterDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const asString = String(value);
  const spanishDate = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(asString);
  if (spanishDate) {
    return new Date(Number(spanishDate[3]), Number(spanishDate[2]) - 1, Number(spanishDate[1]));
  }
  const parsed = new Date(asString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function yearRange(year) {
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59, 999)
  };
}

function quarterRange(year, quarter) {
  const startMonth = (quarter - 1) * 3;
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 0, 23, 59, 59, 999)
  };
}

function getDocumentDateFilterOptions(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  return [
    { value: "all", label: "Todas las fechas" },
    { value: "last_365", label: "Últimos 365 días" },
    { value: "last_30", label: "Últimos 30 días" },
    { value: "current_month", label: "Mes actual" },
    { value: "previous_month", label: "Mes pasado" },
    { value: "current_quarter", label: "Trimestre actual" },
    { value: "previous_quarter", label: "Trimestre pasado" },
    { value: "current_year", label: `Todo el año ${year}` },
    { value: "q4_current_year", label: `Cuarto trimestre de ${year}` },
    { value: "q3_current_year", label: `Tercer trimestre de ${year}` },
    { value: "q2_current_year", label: `Segundo trimestre de ${year}` },
    { value: "q1_current_year", label: `Primer trimestre de ${year}` },
    { value: "previous_year", label: `Todo el año ${year - 1}` },
    { value: "q4_previous_year", label: `Cuarto trimestre de ${year - 1}` },
    { value: "q3_previous_year", label: `Tercer trimestre de ${year - 1}` },
    { value: "q2_previous_year", label: `Segundo trimestre de ${year - 1}` },
    { value: "q1_previous_year", label: `Primer trimestre de ${year - 1}` },
    { value: "two_years_ago", label: `Todo el año ${year - 2}` },
    { value: "three_years_ago", label: `Todo el año ${year - 3}` }
  ];
}

function getDocumentDateRange(filterValue, referenceDate = new Date()) {
  const today = startOfDay(referenceDate);
  const year = today.getFullYear();
  const currentQuarter = Math.floor(today.getMonth() / 3) + 1;

  if (filterValue === "last_365") return { start: startOfDay(new Date(year, today.getMonth(), today.getDate() - 364)), end: endOfDay(today) };
  if (filterValue === "last_30") return { start: startOfDay(new Date(year, today.getMonth(), today.getDate() - 29)), end: endOfDay(today) };
  if (filterValue === "current_month") return { start: new Date(year, today.getMonth(), 1), end: endOfDay(new Date(year, today.getMonth() + 1, 0)) };
  if (filterValue === "previous_month") return { start: new Date(year, today.getMonth() - 1, 1), end: endOfDay(new Date(year, today.getMonth(), 0)) };
  if (filterValue === "current_quarter") return quarterRange(year, currentQuarter);
  if (filterValue === "previous_quarter") {
    const previousQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
    const previousQuarterYear = currentQuarter === 1 ? year - 1 : year;
    return quarterRange(previousQuarterYear, previousQuarter);
  }
  if (filterValue === "current_year") return yearRange(year);
  if (filterValue === "previous_year") return yearRange(year - 1);
  if (filterValue === "two_years_ago") return yearRange(year - 2);
  if (filterValue === "three_years_ago") return yearRange(year - 3);
  if (/^q[1-4]_current_year$/.test(filterValue)) return quarterRange(year, Number(filterValue[1]));
  if (/^q[1-4]_previous_year$/.test(filterValue)) return quarterRange(year - 1, Number(filterValue[1]));
  return null;
}

function documentMatchesDateFilter(documentRow, dateFilter) {
  const range = getDocumentDateRange(dateFilter);
  if (!range) return true;
  const documentDate = parseDocumentFilterDate(documentRow.date);
  if (!documentDate) return false;
  const timestamp = documentDate.getTime();
  return timestamp >= range.start.getTime() && timestamp <= range.end.getTime();
}

function DocumentDateFilter({ value, onChange }) {
  const options = getDocumentDateFilterOptions();

  return (
    <label className="invoice-date-filter">
      <CalendarDays size={18} />
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Filtrar por fecha">
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronDown size={16} aria-hidden="true" />
    </label>
  );
}

function useIncrementalDocumentRows(totalRows, resetKey) {
  const [visibleCount, setVisibleCount] = useState(DOCUMENT_LIST_INITIAL_ROWS);
  const hasMore = visibleCount < totalRows;

  useEffect(() => {
    setVisibleCount(DOCUMENT_LIST_INITIAL_ROWS);
  }, [resetKey]);

  useEffect(() => {
    setVisibleCount((current) => Math.min(Math.max(current, DOCUMENT_LIST_INITIAL_ROWS), Math.max(totalRows, DOCUMENT_LIST_INITIAL_ROWS)));
  }, [totalRows]);

  function loadMoreRows() {
    setVisibleCount((current) => Math.min(current + DOCUMENT_LIST_BATCH_SIZE, totalRows));
  }

  useEffect(() => {
    function handleWindowScroll() {
      if (!hasMore) return;
      const scrollBottom = window.innerHeight + window.scrollY;
      const pageBottom = document.documentElement.scrollHeight;
      if (scrollBottom >= pageBottom - 360) loadMoreRows();
    }

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, [hasMore, totalRows]);

  function handleTableScroll(event) {
    if (!hasMore) return;
    const target = event.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 120) {
      loadMoreRows();
    }
  }

  return {
    visibleCount: Math.min(visibleCount, totalRows),
    hasMore,
    loadMoreRows,
    handleTableScroll
  };
}

function DocumentLoadMoreRow({ colSpan, visibleCount, totalRows, onLoadMore }) {
  if (visibleCount >= totalRows) return null;

  return (
    <tr className="document-load-more-row">
      <td colSpan={colSpan}>
        <button type="button" onClick={onLoadMore}>
          Mostrando {visibleCount} de {totalRows}. Cargar más
        </button>
      </td>
    </tr>
  );
}

function paymentMethodLabel(method) {
  if (!method) return "";
  if (typeof method === "string") return method;
  return [method.name, method.detail].filter(Boolean).join(" · ");
}

function normalizePaymentMethods(raw) {
  const rawItems = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.items)
      ? raw.items
      : [];
  const combined = [...PAYMENT_METHOD_DEFAULTS, ...rawItems];
  const seen = new Set();

  return combined
    .map((item, index) => {
      if (typeof item === "string") {
        return { id: `method-${index}-${normalizeCompactSearchText(item)}`, name: item, detail: "" };
      }

      return {
        id: item.id || `method-${index}-${normalizeCompactSearchText(paymentMethodLabel(item))}`,
        name: String(item.name || item.label || "").trim(),
        detail: String(item.detail || item.bank || item.description || "").trim(),
        type: item.type || "custom",
        iban: item.iban || "",
        bicSwift: item.bicSwift || "",
        mandateReference: item.mandateReference || "",
        mandateType: item.mandateType || "",
        paymentType: item.paymentType || "",
        signedAt: item.signedAt || ""
      };
    })
    .filter((item) => item.name)
    .filter((item) => {
      const key = normalizeCompactSearchText(paymentMethodLabel(item));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function mergePaymentMethod(methods, method) {
  return normalizePaymentMethods({
    items: [
      ...methods,
      {
        ...method,
        id: method.id || `method-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`
      }
    ]
  });
}

function generateMandateReference() {
  return Math.random().toString(16).slice(2, 14).toUpperCase();
}

const NUMBERING_DEFAULTS = {
  preferences: {
    minLength: 5,
    facturaeMinLength: "",
    seriesPosition: "Delante",
    seriesExample: "ABC/0012"
  },
  series: {
    invoice: [
      { id: "invoice-none", code: "", invoiceType: "Completa", template: "Principal", restart: "Cada año", initialNumber: 1, manual: true, hidden: false, notes: "Sin serie" },
      { id: "invoice-r", code: "R", invoiceType: "Completa rectificativa", template: "Principal", restart: "Cada año", initialNumber: 1, manual: false, hidden: false, notes: "Serie de facturas rectificativas" },
      { id: "invoice-r100", code: "R100", invoiceType: "Completa", template: "Principal", restart: "Nunca", initialNumber: "", manual: false, hidden: false, notes: "Importada desde FacturaDirecta Clásico" },
      { id: "invoice-r1", code: "R1", invoiceType: "Completa", template: "Principal", restart: "Cada año", initialNumber: "", manual: false, hidden: false, notes: "Importada desde FacturaDirecta Clásico" },
      { id: "invoice-am", code: "AM", invoiceType: "Completa", template: "Principal", restart: "Nunca", initialNumber: "", manual: false, hidden: false, notes: "Importada desde FacturaDirecta Clásico" },
      { id: "invoice-ams", code: "AMS", invoiceType: "Completa", template: "Principal", restart: "Nunca", initialNumber: "", manual: false, hidden: false, notes: "Importada desde FacturaDirecta Clásico" },
      { id: "invoice-it", code: "IT", invoiceType: "Completa", template: "Principal", restart: "Cada año", initialNumber: "", manual: false, hidden: false, notes: "Importada desde FacturaDirecta Clásico" },
      { id: "invoice-pt", code: "PT", invoiceType: "Completa", template: "Principal", restart: "Cada año", initialNumber: "", manual: false, hidden: false, notes: "Importada desde FacturaDirecta Clásico" },
      { id: "invoice-fr", code: "FR", invoiceType: "Completa", template: "Principal", restart: "Cada año", initialNumber: "", manual: false, hidden: false, notes: "Importada desde FacturaDirecta Clásico" },
      { id: "invoice-sz", code: "SZ", invoiceType: "Completa", template: "Principal", restart: "Nunca", initialNumber: 1, manual: false, hidden: false, notes: "" },
      { id: "invoice-pa", code: "PA", invoiceType: "Completa", template: "Principal", restart: "Cada año", initialNumber: 1, manual: false, hidden: false, notes: "" },
      { id: "invoice-al", code: "AL", invoiceType: "Completa", template: "Principal", restart: "Nunca", initialNumber: 1, manual: false, hidden: false, notes: "" }
    ],
    quote: [
      { id: "quote-none", code: "", template: "Principal", restart: "Nunca", initialNumber: 1, manual: false, hidden: false, notes: "Sin serie" },
      { id: "quote-00001", code: "00001", template: "Principal", restart: "Cada año", initialNumber: "", manual: false, hidden: false, notes: "Importada desde FacturaDirecta Clásico" }
    ],
    deliveryNote: [
      { id: "delivery-none", code: "", template: "Principal", restart: "Nunca", initialNumber: 1, manual: false, hidden: false, notes: "Sin serie" },
      { id: "delivery-00001", code: "00001", template: "Principal", restart: "Cada año", initialNumber: 1, manual: false, hidden: false, notes: "" }
    ]
  }
};

function normalizeNumbering(raw) {
  const rawSeries = raw?.series || {};
  return {
    preferences: {
      ...NUMBERING_DEFAULTS.preferences,
      ...(raw?.preferences || {})
    },
    series: {
      invoice: Array.isArray(rawSeries.invoice) ? rawSeries.invoice : NUMBERING_DEFAULTS.series.invoice,
      quote: Array.isArray(rawSeries.quote) ? rawSeries.quote : NUMBERING_DEFAULTS.series.quote,
      deliveryNote: Array.isArray(rawSeries.deliveryNote) ? rawSeries.deliveryNote : NUMBERING_DEFAULTS.series.deliveryNote
    }
  };
}

function printDocumentElement(elementId, title = "Documento Doinglight") {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("No se ha encontrado la vista previa del documento.");

  const printWindow = window.open("", "_blank", "width=900,height=1200");
  if (!printWindow) throw new Error("El navegador ha bloqueado la ventana de impresión.");

  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules || []).map((rule) => rule.cssText).join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          ${styles}
          @page { size: A4; margin: 0; }
          html, body { margin: 0; min-height: 100%; background: #fff; }
          body { display: flex; justify-content: center; align-items: flex-start; }
          .quote-pdf-page { width: 210mm !important; min-height: 297mm !important; margin: 0 !important; box-shadow: none !important; }
        </style>
      </head>
      <body>${element.outerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 400);
}

async function renderDocumentElementAsPdf(elementId, filename, { save = true } = {}) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("No se ha encontrado la vista previa del documento.");

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf")
  ]);
  const canvas = await html2canvas(element, {
    scale: 2.4,
    useCORS: true,
    backgroundColor: "#ffffff"
  });
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const imageHeight = Math.min(pageHeight, (canvas.height * pageWidth) / canvas.width);
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pageWidth, imageHeight);
  if (save) pdf.save(filename);
  return pdf.output("datauristring").split(",")[1];
}

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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(new Error("No se ha podido leer el archivo."));
    reader.readAsDataURL(file);
  });
}

function attachmentSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "adjunto";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function downloadAuthenticatedFile(path, { token, fileName }) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Error HTTP ${response.status}`);
  }
  saveBlob(await response.blob(), fileName);
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
  const [activeView, setActiveView] = useState("quotes");

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
  const [globalProformaOpen, setGlobalProformaOpen] = useState(false);
  const [globalDeliveryNoteOpen, setGlobalDeliveryNoteOpen] = useState(false);
  const [globalPurchaseOpen, setGlobalPurchaseOpen] = useState(null);
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

  function openGlobalProforma() {
    setCreateDrawerOpen(false);
    setGlobalProformaOpen(true);
  }

  function openGlobalDeliveryNote() {
    setCreateDrawerOpen(false);
    setGlobalDeliveryNoteOpen(true);
  }

  function openGlobalInvoice() {
    setCreateDrawerOpen(false);
    setGlobalInvoiceOpen(true);
  }

  function openGlobalPurchase(documentType = "supplier_invoice", purchase = null) {
    setCreateDrawerOpen(false);
    navigate("purchases");
    setGlobalPurchaseOpen({ documentType, purchase });
  }

  useEffect(() => {
    function handleCreateInvoice() {
      setCreateDrawerOpen(false);
      setGlobalInvoiceOpen(true);
    }

    window.addEventListener("doinglight:create-invoice", handleCreateInvoice);
    return () => window.removeEventListener("doinglight:create-invoice", handleCreateInvoice);
  }, []);

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
          {activeView === "purchases" ? (
            <PurchasesView
              token={session.token}
              onCreate={(documentType) => openGlobalPurchase(documentType)}
              onOpen={(purchase) => openGlobalPurchase(purchase.documentType, purchase)}
            />
          ) : null}
          {activeView === "contacts" ? <ContactsView token={session.token} initialFilter={contactsInitialFilter} /> : null}
          {activeView === "banks" ? <ModuleWorkspace moduleId="banks" /> : null}
          {activeView === "delivery-notes" ? <DeliveryNotesView token={session.token} onCreateDeliveryNote={openGlobalDeliveryNote} /> : null}
          {activeView === "proformas" ? <ProformasView token={session.token} onCreateProforma={openGlobalProforma} /> : null}
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

      {!createDrawerOpen
        && !globalInvoiceOpen
        && !globalQuoteOpen
        && !globalProformaOpen
        && !globalDeliveryNoteOpen
        && !globalPurchaseOpen
        && !globalContactPickerOpen
        && !globalContactForm ? (
          <button className="global-create-button" type="button" onClick={() => setCreateDrawerOpen(true)} aria-label="Crear nuevo documento o registro">
            <Plus size={30} />
          </button>
        ) : null}

      {createDrawerOpen ? (
        <CreateActionDrawer
          onClose={() => setCreateDrawerOpen(false)}
          onNavigate={navigate}
          onCreateInvoice={openGlobalInvoice}
          onCreateQuote={openGlobalQuote}
          onCreateProforma={openGlobalProforma}
          onCreateDeliveryNote={openGlobalDeliveryNote}
          onCreateContact={openGlobalContactPicker}
          onCreatePurchase={openGlobalPurchase}
        />
      ) : null}
      {globalPurchaseOpen ? (
        <ModalShell
          title={globalPurchaseOpen.purchase
            ? `${globalPurchaseOpen.documentType === "expense" ? "Gasto" : "Factura de compra"} ${globalPurchaseOpen.purchase.documentNumber || ""}`.trim()
            : globalPurchaseOpen.documentType === "expense" ? "Nuevo gasto o tique" : "Nueva factura de compra"}
          eyebrow="Compras"
          size="wide-modal purchase-work-modal"
          actions={(globalPurchaseOpen.purchase?.documentType || globalPurchaseOpen.documentType) === "supplier_invoice" ? (
            <label
              className="purchase-attachment-trigger"
              htmlFor="purchase-attachment-input"
              title="Adjuntar factura original"
              aria-label="Adjuntar factura original"
            >
              <Paperclip size={19} />
            </label>
          ) : null}
          onClose={() => setGlobalPurchaseOpen(null)}
        >
          <PurchaseForm
            token={session.token}
            documentType={globalPurchaseOpen.documentType}
            purchase={globalPurchaseOpen.purchase}
            onCancel={() => setGlobalPurchaseOpen(null)}
            onDone={() => {
              setGlobalPurchaseOpen(null);
              window.dispatchEvent(new CustomEvent("doinglight:purchases-changed"));
              navigate("purchases");
            }}
          />
        </ModalShell>
      ) : null}
      {globalInvoiceOpen ? (
        <ModalShell
          title="Factura simplificada"
          eyebrow="Factura de venta"
          size="invoice-create-modal"
          onClose={() => setGlobalInvoiceOpen(false)}
        >
          <QuoteForm
            token={session.token}
            documentType="invoice"
            onCancel={() => setGlobalInvoiceOpen(false)}
            onDone={() => {
              setGlobalInvoiceOpen(false);
              navigate("invoices");
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
      {globalDeliveryNoteOpen ? (
        <ModalShell
          title="Nuevo albarán"
          eyebrow="Albarán"
          size="wide-modal quote-work-modal"
          onClose={() => setGlobalDeliveryNoteOpen(false)}
        >
          <QuoteForm
            token={session.token}
            documentType="delivery_note"
            onCancel={() => setGlobalDeliveryNoteOpen(false)}
            onDone={() => {
              setGlobalDeliveryNoteOpen(false);
              navigate("delivery-notes");
            }}
          />
        </ModalShell>
      ) : null}
      {globalProformaOpen ? (
        <ModalShell
          title="Nueva factura proforma"
          eyebrow="Factura Proforma"
          size="wide-modal quote-work-modal"
          onClose={() => setGlobalProformaOpen(false)}
        >
          <QuoteForm
            token={session.token}
            documentType="proforma"
            onCancel={() => setGlobalProformaOpen(false)}
            onDone={() => {
              setGlobalProformaOpen(false);
              navigate("proformas");
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

function CreateActionDrawer({ onClose, onNavigate, onCreateInvoice, onCreateQuote, onCreateProforma, onCreateDeliveryNote, onCreateContact, onCreatePurchase }) {
  const [isClosing, setIsClosing] = useState(false);
  const actions = [
    { label: "Factura de venta", action: onCreateInvoice },
    { label: "Presupuesto", action: onCreateQuote },
    { label: "Proforma", action: onCreateProforma },
    { label: "Albarán", action: onCreateDeliveryNote },
    { label: "Factura de compra", action: () => onCreatePurchase("supplier_invoice") },
    { label: "Gasto/Tiquet", action: () => onCreatePurchase("expense") },
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

const DEFAULT_INVOICE_SERIES = ["AL", "AM", "AMS", "DE", "FR", "IT", "PA", "PT", "R1", "R100", "SZ"];

function invoiceSeriesLabel(series) {
  return series ? series : "Sin serie";
}

function nextInvoiceSequence(series, invoices = []) {
  const numbers = invoices
    .filter((invoice) => String(invoice.series || "") === String(series || ""))
    .map((invoice) => Number(invoice.rawNumber))
    .filter((number) => Number.isFinite(number));
  const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;

  return String(nextNumber).padStart(5, "0");
}

function invoicePaymentState(main, total, fdState = "") {
  const explicitStatus = String(firstValue(main, [
    "paymentState",
    "paymentStatus",
    "status",
    "state"
  ], fdState || "")).trim().toLowerCase();
  const pendingBalance = normalizeMoneyValue(firstValue(main, [
    "pendingBalance",
    "pendingAmount",
    "amountDue",
    "balance",
    "remaining",
    "totals.pending",
    "totals.pendingAmount"
  ], 0));

  if (main.voided || ["voided", "credited", "abonada", "abonado"].includes(explicitStatus) || explicitStatus.includes("cancel")) {
    return { key: "credited", label: "Abonada", pendingBalance: 0 };
  }
  if (explicitStatus.includes("rectif")) {
    return { key: "rectified", label: "Rectificada", pendingBalance: 0 };
  }
  if (explicitStatus.includes("abon") || explicitStatus.includes("credit")) {
    return { key: "credited", label: "Abonada", pendingBalance: 0 };
  }
  if (["paid", "cobrada", "cobrado", "collected", "overpaid", "sobrepagada"].includes(explicitStatus)) {
    return { key: "paid", label: "Cobrada", pendingBalance: 0 };
  }
  if (explicitStatus.includes("partial") || explicitStatus.includes("parcial") || (pendingBalance > 0 && pendingBalance < total)) {
    return { key: "partial", label: "Parcial", pendingBalance };
  }
  if (pendingBalance > 0 || explicitStatus.includes("pending") || explicitStatus.includes("pendiente")) {
    return { key: "pending", label: "Pendiente", pendingBalance: pendingBalance || total };
  }

  // Legacy quote and delivery-note states must never leak into invoice workflows.
  return { key: "pending", label: "Pendiente", pendingBalance: total };
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
  if (explicitStatus.includes("invoice") || explicitStatus.includes("factur")) {
    return { key: "invoiced", label: "Albarán facturado" };
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
    sent: "Traspasado",
    transferred: "Traspasado",
    traspasado: "Traspasado",
    partial: "Parcial",
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
    sent: "sent",
    transferred: "sent",
    traspasado: "sent",
    partial: "partial",
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

function isQuoteTransferBlockedStatus(status = "") {
  const normalized = String(status || "").trim().toLowerCase();
  return ["partial", "parcial", "sent", "transferred", "traspasado"].includes(normalized);
}

const QUOTE_STATUS_OPTIONS = [
  { value: "draft", filterKey: "pending", label: "Pendiente" },
  { value: "transferred", filterKey: "sent", label: "Traspasado" },
  { value: "partial", filterKey: "partial", label: "Parcial" },
  { value: "accepted", filterKey: "accepted", label: "Aceptado" },
  { value: "closed", filterKey: "voided", label: "Cerrado" },
  { value: "rejected", filterKey: "overdue", label: "Rechazado" }
];

const INVOICE_STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "paid", label: "Cobrada" },
  { value: "partial", label: "Parcial" },
  { value: "rectified", label: "Rectificada" },
  { value: "credited", label: "Abonada" }
];

const INVOICE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  ...INVOICE_STATUS_OPTIONS
];

const DELIVERY_NOTE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "pending", label: "Pendiente" },
  { value: "closed", label: "Cerrado" },
  { value: "invoiced", label: "Albarán facturado" },
  { value: "voided", label: "Anulado" }
];

const REVERSE_CHARGE_TAX_CODE = "reverse_charge";
const REVERSE_CHARGE_TAX_LABEL = "Sujeto Pasivo";
const REVERSE_CHARGE_PDF_SUBTITLE = "SUJETO PASIVO";
const REVERSE_CHARGE_LEGAL_TEXT = "Operación con inversión del sujeto pasivo conforme al Artículo 84. Uno. 2º de la Ley 37/1992 del IVA";

const DOCUMENT_TAX_OPTIONS = [
  { value: "0", rate: 0, label: "Exento · 0%" },
  { value: REVERSE_CHARGE_TAX_CODE, rate: 0, label: `${REVERSE_CHARGE_TAX_LABEL} · 0%`, reverseCharge: true },
  { value: "21", rate: 21, label: "España · 21%" },
  { value: "23", rate: 23, label: "Portugal · 23%" },
  { value: "22", rate: 22, label: "Italia · 22%" },
  { value: "20", rate: 20, label: "Francia · 20%" },
  { value: "19", rate: 19, label: "Alemania · 19%" }
];

function normalizedTaxProbe(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function taxOptionFromMode(value) {
  const normalized = String(value ?? "");
  const folded = normalizedTaxProbe(normalized);
  if (folded.includes("sujeto") || folded.includes("inversion") || folded.includes("reverse")) {
    return DOCUMENT_TAX_OPTIONS.find((option) => option.value === REVERSE_CHARGE_TAX_CODE);
  }

  return DOCUMENT_TAX_OPTIONS.find((option) => option.value === normalized)
    || DOCUMENT_TAX_OPTIONS.find((option) => Number.isFinite(Number(normalized)) && option.rate === Number(normalized) && option.value !== REVERSE_CHARGE_TAX_CODE)
    || DOCUMENT_TAX_OPTIONS.find((option) => option.value === "21")
    || DOCUMENT_TAX_OPTIONS[0];
}

function taxRateFromTaxMode(value) {
  return taxOptionFromMode(value).rate;
}

function isReverseChargeTaxMode(value) {
  return Boolean(taxOptionFromMode(value).reverseCharge);
}

function isReverseChargeDocument(document) {
  if (!document) return false;
  const probe = normalizedTaxProbe([
    document.taxCode,
    document.taxMode,
    document.taxLabel,
    document.taxTreatment,
    document.vatType,
    document.reverseCharge ? REVERSE_CHARGE_TAX_CODE : ""
  ].filter(Boolean).join(" "));

  return probe.includes("reverse")
    || probe.includes("sujeto pasivo")
    || probe.includes("inversion");
}

function taxModeFromDocument(document) {
  if (isReverseChargeDocument(document)) return REVERSE_CHARGE_TAX_CODE;
  const explicitMode = document?.taxMode ?? document?.taxCode ?? document?.taxRate;
  if (explicitMode !== undefined && explicitMode !== null && explicitMode !== "") {
    return taxOptionFromMode(explicitMode).value;
  }
  if (!document?.subtotal) return "21";
  return taxOptionFromMode(Math.round((Number(document.taxTotal || 0) / Number(document.subtotal || 1)) * 100)).value;
}

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

function documentPdfText(language, type = "quote") {
  const base = QUOTE_PDF_TEXT[language] || QUOTE_PDF_TEXT.es;
  const titles = {
    quote: base.title,
    proforma: language === "en" ? "Proforma invoice" : language === "fr" ? "Facture proforma" : language === "it" ? "Fattura proforma" : language === "pt" ? "Fatura proforma" : language === "de" ? "Proformarechnung" : language === "nl" ? "Proformafactuur" : "Factura Proforma",
    invoice: language === "en" ? "Invoice" : language === "fr" ? "Facture" : language === "it" ? "Fattura" : language === "pt" ? "Fatura" : language === "de" ? "Rechnung" : language === "nl" ? "Factuur" : "Factura",
    "delivery-note": language === "en" ? "Delivery note" : language === "fr" ? "Bon de livraison" : language === "it" ? "Documento di trasporto" : language === "pt" ? "Guia de remessa" : language === "de" ? "Lieferschein" : language === "nl" ? "Leveringsbon" : "Albarán"
  };

  return {
    ...base,
    title: titles[type] || base.title,
    discount: language === "en" ? "Discount" : language === "fr" ? "Remise" : language === "it" ? "Sconto" : language === "pt" ? "Desconto" : language === "de" ? "Rabatt" : language === "nl" ? "Korting" : "Descuento",
    dueDate: language === "en" ? "Due date" : language === "fr" ? "Échéance" : language === "it" ? "Scadenza" : language === "pt" ? "Vencimento" : language === "de" ? "Fällig am" : language === "nl" ? "Vervaldatum" : "Vencimiento",
    deliveryDate: language === "en" ? "Expected delivery date" : language === "fr" ? "Date de livraison prévue" : language === "it" ? "Data di consegna prevista" : language === "pt" ? "Data prevista de entrega" : language === "de" ? "Voraussichtliches Lieferdatum" : language === "nl" ? "Verwachte leverdatum" : "Fecha de entrega prevista"
  };
}

function DocumentPdfPage({
  id,
  type = "quote",
  language = "es",
  number = "-",
  date = "",
  dueDate = "",
  clientBlock = [],
  lines = [],
  subtotal = 0,
  taxRate = 21,
  taxTotal = 0,
  total = 0,
  currency = "EUR",
  paymentMethod = "",
  notes = "",
  reverseCharge = false,
  pdfTemplate = "doinglight"
}) {
  const text = documentPdfText(language, type);
  const isDeliveryNote = type === "delivery-note";
  const validityLabel = isDeliveryNote ? text.deliveryDate : type === "invoice" ? text.dueDate : text.validUntil;
  const isTuboSolarTemplate = pdfTemplate === "tubo-solar";
  const logoSrc = isTuboSolarTemplate ? TUBO_SOLAR_PDF_LOGO : DOCUMENT_PDF_LOGO;
  const quantityHeader = language === "es" ? "Cant." : text.quantity;
  const discountHeader = language === "es" ? "Dto." : text.discount;
  const priceHeader = language === "es" ? "Precio" : text.price;
  const formatLineQuantity = (value) => {
    const parsed = Number(value || 0);
    return Number.isInteger(parsed) ? String(parsed) : tableMoney(parsed);
  };

  return (
    <div id={id} className={`quote-pdf-page quote-pdf-page-template${isTuboSolarTemplate ? " quote-pdf-page-tubo-solar" : ""}`}>
      <section className="quote-pdf-top">
        <div className="quote-pdf-issuer">
          <div className="quote-pdf-logo">
            <img className="quote-pdf-logo-image" src={logoSrc} alt={isTuboSolarTemplate ? "Tubo Solar" : "Doinglight Skylights"} />
          </div>
          <strong>{text.issuedBy}</strong>
          <span>DOINGLIGHT TECHNOLOGIES, SLU</span>
          <span>ESB02555001</span>
          <span>Polígono Industrial Campollano, Calle E nº 24</span>
          <span>02007 ALBACETE</span>
          <span>España</span>
          <span>info@doinglight.es</span>
          <span>www.doinglight.es</span>
          <span>658856869</span>
        </div>
        <div className="quote-pdf-document-head">
          <div className="quote-pdf-title-block">
            <h2>{text.title}</h2>
            {reverseCharge ? <strong className="quote-pdf-reverse-charge">{REVERSE_CHARGE_PDF_SUBTITLE}</strong> : null}
          </div>
          <div className="quote-pdf-number-table">
            <strong>{text.number}</strong>
            <strong>{text.date}</strong>
            <span>{number || "-"}</span>
            <span>{dateOnly(date)}</span>
          </div>
          <div className="quote-pdf-client-box">
            {(clientBlock.length ? clientBlock : ["Cliente sin asignar"]).map((line, index) => (
              <span key={`${line}-${index}`}>{line}</span>
            ))}
          </div>
        </div>
      </section>
      <section className={isDeliveryNote ? "quote-pdf-lines-grid delivery-pdf-lines-grid" : "quote-pdf-lines-grid"}>
        <div className="quote-pdf-line-row quote-pdf-lines-head">
          <span className="quote-pdf-line-image-heading" aria-label="Imagen" />
          <span>{text.code}</span>
          <span>{text.concept}</span>
          <span className="quote-pdf-line-number">{quantityHeader}</span>
          {!isDeliveryNote ? <span className="quote-pdf-line-number">{priceHeader}</span> : null}
          {!isDeliveryNote ? <span className="quote-pdf-line-number">{discountHeader}</span> : null}
          {!isDeliveryNote ? <span className="quote-pdf-line-number">{text.total}</span> : null}
        </div>
        {lines.length ? lines.map((line, index) => (
          <div className="quote-pdf-line-row" key={`${line.code || "line"}-${index}`}>
            <span className="quote-pdf-line-image-cell">
                {line.imageUrl ? (
                  <img
                    className="quote-pdf-line-image"
                    src={line.imageUrl}
                    alt={line.code || line.concept || "Producto"}
                    crossOrigin="anonymous"
                  />
                ) : null}
            </span>
            <span className="quote-pdf-line-code">{line.code || "-"}</span>
            <span className="quote-pdf-line-concept">
              <span>{line.concept || "-"}</span>
              {line.customNote ? <em className="quote-pdf-line-custom-note">{line.customNote}</em> : null}
            </span>
            <span className="quote-pdf-line-number">{formatLineQuantity(line.quantity)}</span>
            {!isDeliveryNote ? <span className="quote-pdf-line-number">{tableMoney(line.price || 0)}</span> : null}
            {!isDeliveryNote ? <span className="quote-pdf-line-number">{line.discount ? `${tableMoney(line.discount)}%` : "0%"}</span> : null}
            {!isDeliveryNote ? <span className="quote-pdf-line-number">{tableMoney(line.total || 0)}</span> : null}
          </div>
        )) : (
          <div className="quote-pdf-line-row quote-pdf-line-empty">
            <span>Sin líneas.</span>
          </div>
        )}
      </section>
      {!isDeliveryNote ? (
        <div className="quote-pdf-totals quote-pdf-summary">
          <span>{text.subtotal}</span>
          <strong>{tableMoney(subtotal)}</strong>
          <span>{reverseCharge ? REVERSE_CHARGE_TAX_LABEL : `${text.vat} ${taxRate}%`} (Base: {tableMoney(subtotal)})</span>
          <strong>{tableMoney(taxTotal)}</strong>
          <span>{text.totalCurrency || `Total (${currency})`}</span>
          <strong>{money(total)}</strong>
        </div>
      ) : null}
      <table className="quote-pdf-validity-table">
        <colgroup>
          <col className="quote-pdf-validity-main-col" />
          <col className="quote-pdf-validity-payment-col" />
          <col className="quote-pdf-validity-empty-col" />
        </colgroup>
        <thead>
          <tr>
            <th>{validityLabel}</th>
            <th>{text.paymentMethod}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{dateOnly(dueDate)}</td>
            <td>{paymentMethod || ""}</td>
            <td />
          </tr>
        </tbody>
      </table>
      <div className="quote-pdf-notes quote-pdf-long-notes">
        {notes ? <p>{notes}</p> : null}
        {!isDeliveryNote ? (
          <p>Garantía: 10 Años. Plazo de entrega de 24 a 48 horas (Península)<br />Formas de pago: pre-pago, transferencia bancaria, tarjeta de crédito o Paypal.<br />Portes pagados en pedidos superiores a 1000€ excepto envío a islas y pedidos especiales.</p>
        ) : null}
        {reverseCharge ? <p className="quote-pdf-reverse-charge-note">{REVERSE_CHARGE_LEGAL_TEXT}</p> : null}
      </div>
      <footer className="quote-pdf-privacy">
        <strong>{text.privacyTitle}</strong>
        <span>{text.privacyText}</span>
      </footer>
    </div>
  );
}

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

function internalDocumentState(status = "", documentType = "invoice") {
  if (documentType === "delivery_note") {
    return deliveryNoteState({ status });
  }
  if (documentType === "proforma") {
    return quoteStatusState(status);
  }
  return invoicePaymentState({ status }, 0, status);
}

function serializeInternalSalesDocument(item) {
  const status = internalDocumentState(item.status, item.documentType);
  const date = item.issueDate || item.createdAt;
  const firstLine = Array.isArray(item.items) ? item.items[0] : null;
  const numberLabel = item.documentNumber || item.number || "-";
  const labels = {
    invoice: "Factura",
    delivery_note: "Albarán",
    proforma: "Proforma"
  };
  const documentLabel = labels[item.documentType] || "Documento";
  const detail = [
    `${documentLabel} ${numberLabel}${date ? ` ${dateOnly(date)}` : ""}`,
    firstLine?.title || firstLine?.description || ""
  ].filter(Boolean).join("  ");
  const rawLines = (item.items || []).map((line) => ({
    code: line.sku,
    sku: line.sku,
    title: line.title,
    text: line.description || line.title,
    description: line.description || line.title,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discountPercent: line.discountPercent,
    total: line.lineTotal,
    amount: line.lineTotal,
    product: {
      code: line.sku,
      name: line.title,
      title: line.title
    }
  }));

  return {
    id: item.id,
    leadId: item.leadId,
    documentType: item.documentType,
    number: numberLabel,
    series: item.documentSeries || "",
    detail,
    contact: item.contact || "Sin cliente",
    date,
    dueDate: item.dueDate,
    status: status.label,
    statusKey: status.key,
    verifactuStatus: "",
    pendingBalance: ["pending", "partial"].includes(status.key) ? Number(item.total || 0) : 0,
    subtotal: Number(item.subtotal || 0),
    taxTotal: Number(item.taxTotal || 0),
    total: Number(item.total || 0),
    currency: item.currency || "EUR",
    sent: false,
    hasAttachment: Boolean(item.attachments?.length),
    responsible: "",
    lines: rawLines,
    attachments: item.attachments || [],
    raw: {
      item,
      main: {
        counterpart: {
          name: item.contact || "Sin cliente",
          email: item.contactEmail || "",
          countryCode: item.contactCountry || ""
        },
        lines: rawLines,
        docNumber: { formattedSeries: item.documentSeries || "", number: item.documentNumber || "" },
        paymentMethod: item.paymentMethod || "",
        notes: item.notes || "",
        internalNotes: item.internalNotes || "",
        linkedDocuments: [item.sourceQuoteId, item.sourceDocumentId].filter(Boolean)
      }
    }
  };
}

function invoiceRowStatusClass(invoice, today = inputDate()) {
  const statusKey = String(invoice?.statusKey || "").trim().toLowerCase();
  const statusLabel = String(invoice?.status || "").trim().toLowerCase();

  if (statusKey === "paid" || statusLabel === "cobrada") {
    return "invoice-row-paid";
  }

  if (statusKey === "overdue" || statusLabel === "vencida") {
    return "invoice-row-overdue";
  }

  if (["pending", "partial"].includes(statusKey) || ["pendiente", "parcial"].includes(statusLabel)) {
    const dueDate = inputDate(invoice?.dueDate);
    return dueDate && dueDate < today ? "invoice-row-overdue" : "invoice-row-pending";
  }

  return "";
}

function InvoiceCreateForm({ token, onCancel, onNavigateSettings }) {
  const today = inputDate();
  const leads = useResource(() => apiRequest("/api/sales/leads?limit=200&contactKind=client", { token }), [token]);
  const catalog = useResource(() => apiRequest("/api/catalog/products?locale=es&channel=sales_app", { token }), [token]);
  const invoicesResource = useResource(
    () => apiRequest("/api/sales/documents/invoice?limit=300", { token }),
    [token]
  );
  const deliveryNotesResource = useResource(
    () => apiRequest("/api/sales/documents/delivery_note?limit=300", { token }),
    [token]
  );
  const [form, setForm] = useState({
    operation: "Empresa nacional",
    template: "Principal",
    responsible: "",
    clientQuery: "",
    leadId: "",
    date: today,
    dueDate: today,
    invoiceSeries: "",
    invoiceSequence: "",
    sendEmail: "",
    paymentMethod: "",
    billingData: "España",
    notes: "",
    internalNotes: ""
  });
  const [newSeriesValue, setNewSeriesValue] = useState("");
  const [customSeries, setCustomSeries] = useState([]);
  const [deliveryNotesPickerOpen, setDeliveryNotesPickerOpen] = useState(false);
  const [selectedDeliveryNotesToRecover, setSelectedDeliveryNotesToRecover] = useState([]);
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
  const internalInvoices = useMemo(
    () => (invoicesResource.data?.items || []).map(serializeInternalSalesDocument),
    [invoicesResource.data]
  );
  const availableDeliveryNotes = useMemo(
    () => (deliveryNotesResource.data?.items || [])
      .map(serializeInternalSalesDocument)
      .filter((deliveryNote) => !form.leadId || deliveryNote.leadId === form.leadId),
    [deliveryNotesResource.data, form.leadId]
  );
  const invoiceSeriesOptions = useMemo(() => {
    const importedSeries = internalInvoices.map((invoice) => invoice.series || "");
    return Array.from(new Set(["", ...DEFAULT_INVOICE_SERIES, ...importedSeries, ...customSeries]))
      .map((series) => String(series || "").trim())
      .filter((series, index, list) => list.indexOf(series) === index)
      .sort((a, b) => {
        if (a === "") return -1;
        if (b === "") return 1;
        return a.localeCompare(b, "es");
      });
  }, [customSeries, internalInvoices]);
  const nextSequence = useMemo(
    () => nextInvoiceSequence(form.invoiceSeries, internalInvoices),
    [form.invoiceSeries, internalInvoices]
  );
  const resolvedInvoiceSequence = form.invoiceSequence || nextSequence;
  const resolvedDocumentNumber = [form.invoiceSeries, resolvedInvoiceSequence].filter(Boolean).join(" ");
  const clientOptionLabel = (lead) =>
    `${lead.fullName}${lead.companyName ? ` · ${lead.companyName}` : ""}${lead.taxId ? ` · ${lead.taxId}` : ""}`;
  const selectedClient = clients.find((lead) => lead.id === form.leadId) || null;
  const filteredClients = useMemo(() => {
    return clients.filter((lead) =>
      textMatchesQuery([lead.fullName, lead.companyName, lead.email, lead.phone, lead.taxId], form.clientQuery)
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

  function addInvoiceLine(afterLineId = null) {
    const nextLine = {
      id: crypto.randomUUID(),
      skuQuery: "",
      sku: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 21,
      discountPercent: 0
    };

    setLines((current) => {
      if (!afterLineId) return [...current, nextLine];
      const index = current.findIndex((line) => line.id === afterLineId);
      if (index < 0) return [...current, nextLine];
      return [...current.slice(0, index + 1), nextLine, ...current.slice(index + 1)];
    });
  }

  function removeInvoiceLine(lineId) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== lineId)));
  }

  function openDeliveryNotesRecovery() {
    if (!form.leadId) {
      window.alert("debes seleccionar el cliente");
      return;
    }

    setSelectedDeliveryNotesToRecover([]);
    setDeliveryNotesPickerOpen(true);
  }

  function toggleDeliveryNoteToRecover(deliveryNoteId) {
    setSelectedDeliveryNotesToRecover((current) => (
      current.includes(deliveryNoteId)
        ? current.filter((idValue) => idValue !== deliveryNoteId)
        : [...current, deliveryNoteId]
    ));
  }

  function recoverSelectedDeliveryNotes() {
    const selectedDeliveryNotes = availableDeliveryNotes.filter((deliveryNote) => selectedDeliveryNotesToRecover.includes(deliveryNote.id));
    const recoveredLines = selectedDeliveryNotes.flatMap((deliveryNote) => (deliveryNote.lines || []).map((line) => ({
      id: crypto.randomUUID(),
      skuQuery: line.sku || "",
      sku: line.sku || "",
      description: line.title || line.description || "",
      quantity: Number(line.quantity || 1),
      unitPrice: Number(line.unitPrice || 0),
      taxRate: line.taxCode || line.taxMode || line.taxRate || 21,
      discountPercent: Number(line.discountPercent || 0)
    })));

    if (!recoveredLines.length) {
      window.alert("Selecciona al menos un albarán.");
      return;
    }

    setLines(recoveredLines);
    setDeliveryNotesPickerOpen(false);
  }

  function addNewSeries() {
    const normalized = newSeriesValue.trim().toUpperCase();
    if (!normalized) return;
    setCustomSeries((current) => (current.includes(normalized) ? current : [...current, normalized]));
    setForm((current) => ({
      ...current,
      invoiceSeries: normalized,
      invoiceSequence: ""
    }));
    setNewSeriesValue("");
  }

  const subtotal = lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
  const taxTotal = lines.reduce((sum, line) => sum + lineSubtotal(line) * (taxRateFromTaxMode(line.taxRate) / 100), 0);
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
          <button className="recover-delivery-notes-button" type="button" onClick={openDeliveryNotesRecovery}>
            Recuperar albaranes
          </button>
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
        <div className="invoice-number-group">
          <label className="invoice-field">
            <span>Serie</span>
            <select
              value={form.invoiceSeries}
              onChange={(event) => setForm({ ...form, invoiceSeries: event.target.value, invoiceSequence: "" })}
            >
              {invoiceSeriesOptions.map((series) => (
                <option key={series || "no-series"} value={series}>
                  {invoiceSeriesLabel(series)}
                </option>
              ))}
            </select>
          </label>
          <label className="invoice-field invoice-number-field">
            <span>Número</span>
            <input value={resolvedInvoiceSequence} readOnly />
          </label>
          <small>
            {resolvedDocumentNumber ? `Se generará ${resolvedDocumentNumber}` : "El número se generará automáticamente"}
          </small>
          <div className="invoice-new-series-row">
            <input
              value={newSeriesValue}
              onChange={(event) => setNewSeriesValue(event.target.value.toUpperCase())}
              placeholder="Nueva serie"
              aria-label="Nueva serie de factura"
            />
            <button type="button" onClick={addNewSeries}>
              <Plus size={16} />
              Añadir
            </button>
          </div>
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
                {DOCUMENT_TAX_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input type="number" min="0" max="100" value={line.discountPercent} onChange={(event) => updateLine(line.id, { discountPercent: event.target.value })} />
              <strong>{tableMoney(lineSubtotal(line))}</strong>
              <div className="line-action-buttons">
                <button className="tiny-icon-button" type="button" onClick={() => addInvoiceLine(line.id)} aria-label="Añadir línea" title="Añadir línea">
                  <Plus size={14} />
                </button>
                <button className="tiny-icon-button danger" type="button" onClick={() => removeInvoiceLine(line.id)} disabled={lines.length === 1} aria-label="Eliminar línea">
                  <X size={14} />
                </button>
              </div>
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
      {deliveryNotesPickerOpen ? (
        <ModalShell
          title="Recuperar albaranes"
          eyebrow="Factura"
          size="transfer-lines-modal"
          onClose={() => setDeliveryNotesPickerOpen(false)}
        >
          <div className="transfer-lines-content">
            <p>Selecciona los albaranes de este cliente que quieres cargar en la factura.</p>
            <div className="transfer-lines-list">
              {deliveryNotesResource.loading ? (
                <div className="transfer-line-option">Cargando albaranes...</div>
              ) : null}
              {!deliveryNotesResource.loading && !availableDeliveryNotes.length ? (
                <div className="transfer-line-option">No hay albaranes para este cliente.</div>
              ) : null}
              {availableDeliveryNotes.map((deliveryNote) => {
                const checked = selectedDeliveryNotesToRecover.includes(deliveryNote.id);
                return (
                  <label className={`transfer-line-option ${checked ? "active" : ""}`} key={deliveryNote.id}>
                    <input type="checkbox" checked={checked} onChange={() => toggleDeliveryNoteToRecover(deliveryNote.id)} />
                    <span className="invoice-kind-badge delivery-note-badge">A</span>
                    <span>
                      <strong>{deliveryNote.number} · {dateOnly(deliveryNote.date)}</strong>
                      <small>{deliveryNote.detail} · {money(deliveryNote.total)}</small>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={() => setDeliveryNotesPickerOpen(false)}>Cancelar</button>
              <button className="primary-button" type="button" onClick={recoverSelectedDeliveryNotes}>Recuperar líneas</button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

function InvoicesMirrorView({ token, onCreateInvoice }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const invoiceSort = useDocumentSort();
  const invoicesResource = useResource(
    () => apiRequest("/api/sales/documents/invoice?limit=500", { token }),
    [token]
  );
  useSalesDocumentSavedRefresh("invoice", invoicesResource.reload);
  const invoices = (invoicesResource.data?.items || []).map(serializeInternalSalesDocument);
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesQuery = textMatchesQuery([invoice.number, invoice.contact, invoice.status, invoice.total, invoice.detail], query);
    const matchesStatus = statusFilter === "all" || invoice.statusKey === statusFilter;
    const matchesDate = documentMatchesDateFilter(invoice, dateFilter);
    return matchesQuery && matchesStatus && matchesDate;
  });
  const sortedInvoices = sortDocumentRows(filteredInvoices, invoiceSort.sortConfig);
  const invoiceRows = useIncrementalDocumentRows(
    sortedInvoices.length,
    [query, statusFilter, dateFilter, invoiceSort.sortConfig.key, invoiceSort.sortConfig.direction].join("|")
  );
  const visibleInvoices = sortedInvoices.slice(0, invoiceRows.visibleCount);

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

      {invoicesResource.error ? (
        <div className="integration-warning">
          <strong>No se han podido cargar las facturas internas.</strong>
          <p>{invoicesResource.error}</p>
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
          <DocumentDateFilter value={dateFilter} onChange={setDateFilter} />
        </div>
        <div className="module-filters invoice-filter-row">
          <label className="invoice-filter-select">
            <span>Estado</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {INVOICE_STATUS_FILTER_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap invoice-table-wrap" onScroll={invoiceRows.handleTableScroll}>
          <table className="module-table invoice-table">
            <thead>
              <tr>
                <th className="select-column"><input type="checkbox" aria-label="Seleccionar todas las facturas" /></th>
                <th className="invoice-kind-column"></th>
                <SortableDocumentHeader sortKey="date" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort}>Fecha</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="verifactuStatus" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort}>Verifactu</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="status" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort}>Estado</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="number" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort}>Serie / Núm.</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="contact" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort}>Cliente / Detalle</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="pendingBalance" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort}>Saldo pendiente</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="subtotal" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort}>Subtotal</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="total" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort}>Total</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="currency" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort}>Moneda</SortableDocumentHeader>
              </tr>
            </thead>
            <tbody>
              {invoicesResource.loading ? (
                <tr className="empty-table-row">
                  <td colSpan={11}>Cargando facturas internas...</td>
                </tr>
              ) : null}
              {!invoicesResource.loading && !filteredInvoices.length ? (
                <tr className="empty-table-row">
                  <td colSpan={11}>No hay facturas internas de prueba todavía.</td>
                </tr>
              ) : null}
              {visibleInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className={`clickable-table-row ${invoiceRowStatusClass(invoice)}`.trim()}
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
              <DocumentLoadMoreRow
                colSpan={11}
                visibleCount={invoiceRows.visibleCount}
                totalRows={sortedInvoices.length}
                onLoadMore={invoiceRows.loadMoreRows}
              />
            </tbody>
          </table>
        </div>
      </section>
      {selectedInvoice ? (
        <QuoteEditorModal
          token={token}
          documentType="invoice"
          quote={{
            id: selectedInvoice.id,
            leadId: selectedInvoice.leadId,
            quoteNumber: selectedInvoice.number,
            documentNumber: selectedInvoice.number,
            number: selectedInvoice.number,
            status: selectedInvoice.raw?.item?.status || "draft",
            locale: selectedInvoice.raw?.item?.locale || "es",
            currency: selectedInvoice.currency,
            subtotal: selectedInvoice.subtotal,
            taxTotal: selectedInvoice.taxTotal,
            total: selectedInvoice.total,
            notes: selectedInvoice.raw?.item?.notes || "",
            internalNotes: selectedInvoice.raw?.item?.internalNotes || "",
            paymentMethod: selectedInvoice.raw?.item?.paymentMethod || "",
            issueDate: selectedInvoice.raw?.item?.issueDate || selectedInvoice.date,
            dueDate: selectedInvoice.raw?.item?.dueDate || selectedInvoice.dueDate,
            items: selectedInvoice.raw?.item?.items || [],
            attachments: selectedInvoice.raw?.item?.attachments || []
          }}
          onClose={() => setSelectedInvoice(null)}
          onDone={() => {
            setSelectedInvoice(null);
            invoicesResource.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function documentCounterpartBlock(documentRecord) {
  const main = documentRecord.raw?.main || {};
  const counterpart = main.counterpart || {};
  const name = [counterpart.name, counterpart.surname].filter(Boolean).join(" ").trim() || documentRecord.contact;
  const address = [
    counterpart.address,
    counterpart.addressLine1,
    counterpart.street,
    [counterpart.postalCode, counterpart.city || counterpart.town, counterpart.province].filter(Boolean).join(" ")
  ].filter(Boolean);
  const taxId = counterpart.vatNumber || counterpart.taxId || counterpart.legalId || counterpart.fiscalId || "";
  const country = counterpart.country || counterpart.countryCode || "";
  return [name, taxId, ...address, countryLabel(country) || country].filter(Boolean);
}

function documentLinesForPdf(lines = []) {
  return lines.map((line) => {
    const quantity = normalizeMoneyValue(firstValue(line, ["quantity", "units", "amount"], 0));
    const total = normalizeMoneyValue(firstValue(line, ["total", "totalAmount", "amountTotal", "amount"], 0));
    const price = normalizeMoneyValue(firstValue(line, ["unitPrice", "price", "salePrice"], quantity ? total / quantity : total));
    return {
      code: firstValue(line, ["code", "productCode", "sku", "reference", "product.code"], ""),
      concept: firstValue(line, ["text", "description", "title", "concept"], ""),
      customNote: firstValue(line, ["customNote", "custom_note", "productSnapshot.customNote"], ""),
      quantity,
      price,
      discount: normalizeMoneyValue(firstValue(line, ["discount", "discountPercent", "discountPercentage"], 0)),
      total
    };
  });
}

function DocumentSendModal({ token, documentRecord, type, onClose }) {
  const [language, setLanguage] = useState(quoteLanguageForCountry(documentRecord.raw?.main?.counterpart?.countryCode || documentRecord.raw?.main?.counterpart?.country || "ES"));
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState(() => {
    const counterpart = documentRecord.raw?.main?.counterpart || {};
    const typeLabel = type === "invoice" ? "factura" : "albarán";
    return {
      to: splitEmailRecipients(counterpart.email || counterpart.emailAddress || ""),
      from: "ADMINISTRACION <administracion@doinglight.es>",
      subject: `Envío ${typeLabel} ${documentRecord.number}`,
      body: `Estimado cliente:\n\nAdjunto a este correo encontrará nuestro ${typeLabel}.\n\nSi tiene cualquier consulta, no dude en contactar con nosotros.`,
      attachPdf: true
    };
  });
  const label = type === "invoice" ? "Factura" : "Albarán";
  const filename = `${label}-${safeFilePart(dateOnly(documentRecord.date))}-${safeFilePart(documentRecord.number)}.pdf`;
  const elementId = `${type}-pdf-${safeFilePart(documentRecord.id || documentRecord.number)}`;
  const lines = documentLinesForPdf(type === "invoice" ? documentRecord.raw?.main?.lines || [] : documentRecord.lines || []);
  const subtotal = Number(documentRecord.subtotal || 0);
  const total = Number(documentRecord.total || 0);
  const taxMode = taxModeFromDocument(documentRecord);
  const taxTotal = Math.max(total - subtotal, 0);
  const taxRate = taxRateFromTaxMode(taxMode);
  const reverseCharge = isReverseChargeTaxMode(taxMode);
  const selectedLanguageLabel = QUOTE_LANGUAGE_OPTIONS.find((item) => item.value === language)?.label || "Español";

  function updateDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }));
    setStatus("");
  }

  async function downloadPdf() {
    setStatus("Generando PDF...");
    try {
      await renderDocumentElementAsPdf(elementId, filename);
      setStatus("");
    } catch (err) {
      setStatus(err.message);
    }
  }

  function printPdf() {
    try {
      printDocumentElement(elementId, filename);
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function sendPdf(event) {
    event.preventDefault();
    setStatus("Generando y enviando PDF...");
    try {
      const recipients = splitEmailRecipients(draft.to);
      if (!recipients.length) throw new Error("Indica al menos un correo de destino.");
      const invalidRecipients = recipients.filter((item) => !isValidEmailRecipient(item));
      if (invalidRecipients.length) throw new Error(`Revisa los correos de destino: ${invalidRecipients.join(", ")}`);
      const pdfBase64 = draft.attachPdf
        ? await renderDocumentElementAsPdf(elementId, filename, { save: false })
        : "";
      await apiRequest("/api/quotes/documents/send", {
        token,
        method: "POST",
        body: {
          documentType: type,
          documentNumber: documentRecord.number,
          language,
          to: recipients,
          from: draft.from,
          subject: draft.subject,
          body: draft.body,
          filename,
          pdfBase64
        }
      });
      setStatus("Correo enviado correctamente.");
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <div className="quote-send-overlay" role="dialog" aria-modal="true" aria-label="Enviar por correo electrónico">
      <form className="quote-send-dialog" onSubmit={sendPdf}>
        <header className="quote-send-header">
          <h3>Enviar por correo electrónico</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar envío">
            <X size={28} />
          </button>
        </header>
        <div className="quote-send-content">
          <section className="quote-send-fields">
            <EmailRecipientsField value={draft.to} onChange={(to) => updateDraft({ to })} />
            <label>
              <span>Remitente</span>
              <select value={draft.from} onChange={(event) => updateDraft({ from: event.target.value })}>
                <option value="ADMINISTRACION <administracion@doinglight.es>">ADMINISTRACION &lt;administracion@doinglight.es&gt;</option>
                <option value="MARKETING <marketing@doinglight.es>">MARKETING &lt;marketing@doinglight.es&gt;</option>
                <option value="DOINGLIGHT <info@doinglight.es>">DOINGLIGHT &lt;info@doinglight.es&gt;</option>
              </select>
            </label>
            <label>
              <span>Asunto</span>
              <input value={draft.subject} onChange={(event) => updateDraft({ subject: event.target.value })} />
            </label>
            <label className="quote-send-body-field">
              <span>Contenido</span>
              <textarea value={draft.body} onChange={(event) => updateDraft({ body: event.target.value })} />
            </label>
            <div className="quote-send-attachments">
              <span>Archivos adjuntos</span>
              <label>
                <input type="checkbox" checked={draft.attachPdf} onChange={(event) => updateDraft({ attachPdf: event.target.checked })} />
                <strong>{filename}</strong>
              </label>
            </div>
            {status ? <p className={status.includes("correctamente") ? "form-success" : "form-error"}>{status}</p> : null}
          </section>
          <section className="quote-send-preview" aria-label="Vista previa del PDF adjunto">
            <label className="quote-pdf-language-row">
              <span>Idioma del documento</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                {QUOTE_LANGUAGE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <div className="quote-pdf-toolbar">
              <span>Vista previa del PDF · {selectedLanguageLabel}</span>
              <div>
                <button type="button" title="Descargar PDF" onClick={downloadPdf}><Download size={17} /></button>
                <button type="button" title="Imprimir PDF" onClick={printPdf}><Printer size={17} /></button>
                <button type="button" title="Más opciones"><MoreVertical size={17} /></button>
              </div>
            </div>
            <DocumentPdfPage
              id={elementId}
              type={type}
              language={language}
              number={documentRecord.number}
              date={documentRecord.date}
              dueDate={documentRecord.dueDate || addDays(documentRecord.date, 30)}
              clientBlock={documentCounterpartBlock(documentRecord)}
              lines={lines}
              subtotal={subtotal}
              taxRate={taxRate}
              taxTotal={taxTotal}
              total={total}
              reverseCharge={reverseCharge}
              currency={documentRecord.currency}
              paymentMethod={firstValue(documentRecord.raw?.main || {}, ["paymentMethod.name", "paymentMethod", "paymentTerms"], "")}
              notes={type === "invoice" ? firstValue(documentRecord.raw?.main || {}, ["notes", "observations", "publicNotes"], "") : ""}
            />
          </section>
        </div>
        <footer className="quote-send-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="quote-send-icon-button" type="button" onClick={downloadPdf} aria-label="Descargar PDF" title="Descargar PDF">
            <Download size={20} />
          </button>
          <button className="quote-send-icon-button" type="button" onClick={printPdf} aria-label="Imprimir PDF" title="Imprimir PDF">
            <Printer size={20} />
          </button>
          <button className="primary-button send-quote-button" type="submit">
            <Send size={18} />
            Enviar
          </button>
        </footer>
      </form>
    </div>
  );
}

function InvoiceDetailModal({ token, invoice, onClose }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const lines = Array.isArray(invoice.raw?.main?.lines) ? invoice.raw.main.lines : [];
  const pdfId = `invoice-menu-pdf-${safeFilePart(invoice.id || invoice.number)}`;
  const pdfFilename = `Factura-${safeFilePart(dateOnly(invoice.date))}-${safeFilePart(invoice.number)}.pdf`;

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
              onSend={() => setSendOpen(true)}
              onDownload={() => renderDocumentElementAsPdf(pdfId, pdfFilename)}
              onPrint={() => printDocumentElement(pdfId, pdfFilename)}
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
        <div className="hidden-pdf-source" aria-hidden="true">
          <DocumentPdfPage
            id={pdfId}
            type="invoice"
            language="es"
            number={invoice.number}
            date={invoice.date}
            dueDate={invoice.dueDate || addDays(invoice.date, 30)}
            clientBlock={documentCounterpartBlock(invoice)}
            lines={documentLinesForPdf(lines)}
            subtotal={invoice.subtotal}
            taxRate={taxRateFromTaxMode(taxModeFromDocument(invoice))}
            taxTotal={Math.max(invoice.total - invoice.subtotal, 0)}
            total={invoice.total}
            reverseCharge={isReverseChargeTaxMode(taxModeFromDocument(invoice))}
            currency={invoice.currency}
            paymentMethod={firstValue(invoice.raw?.main || {}, ["paymentMethod.name", "paymentMethod", "paymentTerms"], "")}
            notes={firstValue(invoice.raw?.main || {}, ["notes", "observations", "publicNotes"], "")}
          />
        </div>
      </div>
      {sendOpen ? (
        <DocumentSendModal
          token={token}
          documentRecord={invoice}
          type="invoice"
          onClose={() => setSendOpen(false)}
        />
      ) : null}
    </ModalShell>
  );
}

function DeliveryNotesView({ token, onCreateDeliveryNote }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedDeliveryNote, setSelectedDeliveryNote] = useState(null);
  const [selectedDeliveryNoteIds, setSelectedDeliveryNoteIds] = useState([]);
  const deliveryNoteSort = useDocumentSort();
  const deliveryNotesResource = useResource(
    () => apiRequest("/api/sales/documents/delivery_note?limit=500", { token }),
    [token]
  );
  useSalesDocumentSavedRefresh("delivery_note", deliveryNotesResource.reload);
  const deliveryNotes = (deliveryNotesResource.data?.items || []).map(serializeInternalSalesDocument);
  const filteredDeliveryNotes = deliveryNotes.filter((deliveryNote) => {
    const matchesQuery = textMatchesQuery([deliveryNote.number, deliveryNote.contact, deliveryNote.status, deliveryNote.total, deliveryNote.detail], query);
    const matchesStatus = statusFilter === "all" || deliveryNote.statusKey === statusFilter;
    const matchesDate = documentMatchesDateFilter(deliveryNote, dateFilter);
    return matchesQuery && matchesStatus && matchesDate;
  });
  const sortedDeliveryNotes = sortDocumentRows(filteredDeliveryNotes, deliveryNoteSort.sortConfig);
  const deliveryNoteRows = useIncrementalDocumentRows(
    sortedDeliveryNotes.length,
    [query, statusFilter, dateFilter, deliveryNoteSort.sortConfig.key, deliveryNoteSort.sortConfig.direction].join("|")
  );
  const visibleDeliveryNotes = sortedDeliveryNotes.slice(0, deliveryNoteRows.visibleCount);
  const filteredDeliveryNoteIds = filteredDeliveryNotes.map((deliveryNote) => deliveryNote.id);
  const allFilteredDeliveryNotesSelected = Boolean(filteredDeliveryNoteIds.length) && filteredDeliveryNoteIds.every((idValue) => selectedDeliveryNoteIds.includes(idValue));

  useEffect(() => {
    setSelectedDeliveryNoteIds((current) => current.filter((idValue) => filteredDeliveryNoteIds.includes(idValue)));
  }, [filteredDeliveryNoteIds.join("|")]);

  function openDeliveryNote(deliveryNote) {
    setSelectedDeliveryNote(deliveryNote);
  }

  function handleRowKeyDown(event, deliveryNote) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDeliveryNote(deliveryNote);
    }
  }

  function toggleDeliveryNoteSelection(deliveryNoteId) {
    setSelectedDeliveryNoteIds((current) => (
      current.includes(deliveryNoteId)
        ? current.filter((idValue) => idValue !== deliveryNoteId)
        : [...current, deliveryNoteId]
    ));
  }

  function toggleAllFilteredDeliveryNotes() {
    setSelectedDeliveryNoteIds(allFilteredDeliveryNotesSelected ? [] : filteredDeliveryNoteIds);
  }

  async function invoiceSelectedDeliveryNotes() {
    if (!selectedDeliveryNoteIds.length) return;

    try {
      await Promise.all(selectedDeliveryNoteIds.map((deliveryNoteId) =>
        apiRequest(`/api/sales/documents/invoice/from-document/delivery_note/${deliveryNoteId}`, {
          token,
          method: "POST",
          body: {}
        })
      ));
      setSelectedDeliveryNoteIds([]);
      deliveryNotesResource.reload();
    } catch (err) {
      window.alert(err.message || "No se han podido facturar los albaranes seleccionados.");
    }
  }

  async function deleteSelectedDeliveryNotes() {
    if (!selectedDeliveryNoteIds.length) return;
    if (!window.confirm(`¿Eliminar ${selectedDeliveryNoteIds.length} albarán${selectedDeliveryNoteIds.length === 1 ? "" : "es"} seleccionado${selectedDeliveryNoteIds.length === 1 ? "" : "s"}?`)) return;

    try {
      await Promise.all(selectedDeliveryNoteIds.map((deliveryNoteId) =>
        apiRequest(`/api/sales/documents/delivery_note/${deliveryNoteId}`, {
          token,
          method: "DELETE"
        })
      ));
      setSelectedDeliveryNoteIds([]);
      deliveryNotesResource.reload();
    } catch (err) {
      window.alert(err.message || "No se han podido eliminar los albaranes seleccionados.");
    }
  }

  return (
    <div className="module-page invoices-mirror-page">
      <header className="module-page-header invoices-page-header">
        <h3>Albaranes de venta</h3>
        <button className="primary-button" type="button" onClick={onCreateDeliveryNote}>Nuevo albarán</button>
      </header>

      {deliveryNotesResource.error ? (
        <div className="integration-warning">
          <strong>No se han podido cargar los albaranes internos.</strong>
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
          <DocumentDateFilter value={dateFilter} onChange={setDateFilter} />
        </div>
        <div className="module-filters invoice-filter-row">
          <label className="invoice-filter-select">
            <span>Estado</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {DELIVERY_NOTE_STATUS_FILTER_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </label>
          {selectedDeliveryNoteIds.length ? (
            <div className="bulk-document-actions">
              <button className="bulk-document-action" type="button" onClick={invoiceSelectedDeliveryNotes}>
                Facturar {selectedDeliveryNoteIds.length} albarán{selectedDeliveryNoteIds.length === 1 ? "" : "es"}
              </button>
              <button className="bulk-document-action danger" type="button" onClick={deleteSelectedDeliveryNotes}>
                Eliminar
              </button>
            </div>
          ) : null}
        </div>
        <div className="table-wrap invoice-table-wrap" onScroll={deliveryNoteRows.handleTableScroll}>
          <table className="module-table invoice-table delivery-notes-table">
            <thead>
              <tr>
                <th className="select-column">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos los albaranes"
                    checked={allFilteredDeliveryNotesSelected}
                    onChange={toggleAllFilteredDeliveryNotes}
                  />
                </th>
                <th className="invoice-kind-column"></th>
                <SortableDocumentHeader sortKey="date" sortConfig={deliveryNoteSort.sortConfig} onSort={deliveryNoteSort.requestSort}>Fecha</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="status" sortConfig={deliveryNoteSort.sortConfig} onSort={deliveryNoteSort.requestSort}>Estado</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="number" sortConfig={deliveryNoteSort.sortConfig} onSort={deliveryNoteSort.requestSort}>Serie / Núm.</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="contact" sortConfig={deliveryNoteSort.sortConfig} onSort={deliveryNoteSort.requestSort}>Cliente / Detalle</SortableDocumentHeader>
                <th></th>
                <SortableDocumentHeader sortKey="subtotal" sortConfig={deliveryNoteSort.sortConfig} onSort={deliveryNoteSort.requestSort}>Subtotal</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="total" sortConfig={deliveryNoteSort.sortConfig} onSort={deliveryNoteSort.requestSort}>Total</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="currency" sortConfig={deliveryNoteSort.sortConfig} onSort={deliveryNoteSort.requestSort}>Moneda</SortableDocumentHeader>
              </tr>
            </thead>
            <tbody>
              {deliveryNotesResource.loading ? (
                <tr className="empty-table-row">
                  <td colSpan={10}>Cargando albaranes internos...</td>
                </tr>
              ) : null}
              {!deliveryNotesResource.loading && !filteredDeliveryNotes.length ? (
                <tr className="empty-table-row">
                  <td colSpan={10}>No hay albaranes internos de prueba todavía.</td>
                </tr>
              ) : null}
              {visibleDeliveryNotes.map((deliveryNote) => (
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
                      checked={selectedDeliveryNoteIds.includes(deliveryNote.id)}
                      onChange={() => toggleDeliveryNoteSelection(deliveryNote.id)}
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
              <DocumentLoadMoreRow
                colSpan={10}
                visibleCount={deliveryNoteRows.visibleCount}
                totalRows={sortedDeliveryNotes.length}
                onLoadMore={deliveryNoteRows.loadMoreRows}
              />
            </tbody>
          </table>
        </div>
      </section>

      {selectedDeliveryNote ? (
        <QuoteEditorModal
          token={token}
          documentType="delivery_note"
          quote={{
            id: selectedDeliveryNote.id,
            leadId: selectedDeliveryNote.leadId,
            quoteNumber: selectedDeliveryNote.number,
            documentNumber: selectedDeliveryNote.number,
            number: selectedDeliveryNote.number,
            status: selectedDeliveryNote.raw?.item?.status || "draft",
            locale: selectedDeliveryNote.raw?.item?.locale || "es",
            currency: selectedDeliveryNote.currency,
            subtotal: selectedDeliveryNote.subtotal,
            taxTotal: selectedDeliveryNote.taxTotal,
            total: selectedDeliveryNote.total,
            notes: selectedDeliveryNote.raw?.item?.notes || "",
            internalNotes: selectedDeliveryNote.raw?.item?.internalNotes || "",
            paymentMethod: selectedDeliveryNote.raw?.item?.paymentMethod || "",
            issueDate: selectedDeliveryNote.raw?.item?.issueDate || selectedDeliveryNote.date,
            dueDate: selectedDeliveryNote.raw?.item?.dueDate || selectedDeliveryNote.dueDate,
            items: selectedDeliveryNote.raw?.item?.items || [],
            attachments: selectedDeliveryNote.raw?.item?.attachments || []
          }}
          onClose={() => setSelectedDeliveryNote(null)}
          onDone={() => {
            setSelectedDeliveryNote(null);
            deliveryNotesResource.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function ProformasView({ token, onCreateProforma }) {
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedProforma, setSelectedProforma] = useState(null);
  const [selectedProformaIds, setSelectedProformaIds] = useState([]);
  const proformaSort = useDocumentSort();
  const proformasResource = useResource(
    () => apiRequest("/api/sales/documents/proforma?limit=500", { token }),
    [token]
  );
  useSalesDocumentSavedRefresh("proforma", proformasResource.reload);
  const proformas = (proformasResource.data?.items || []).map(serializeInternalSalesDocument);
  const filteredProformas = proformas.filter((proforma) =>
    textMatchesQuery([proforma.number, proforma.contact, proforma.status, proforma.total, proforma.detail], query)
    && documentMatchesDateFilter(proforma, dateFilter)
  );
  const sortedProformas = sortDocumentRows(filteredProformas, proformaSort.sortConfig);
  const proformaRows = useIncrementalDocumentRows(
    sortedProformas.length,
    [query, dateFilter, proformaSort.sortConfig.key, proformaSort.sortConfig.direction].join("|")
  );
  const visibleProformas = sortedProformas.slice(0, proformaRows.visibleCount);
  const filteredProformaIds = filteredProformas.map((proforma) => proforma.id);
  const allFilteredProformasSelected = Boolean(filteredProformaIds.length) && filteredProformaIds.every((idValue) => selectedProformaIds.includes(idValue));

  useEffect(() => {
    setSelectedProformaIds((current) => current.filter((idValue) => filteredProformaIds.includes(idValue)));
  }, [filteredProformaIds.join("|")]);

  function toggleProformaSelection(proformaId) {
    setSelectedProformaIds((current) => (
      current.includes(proformaId)
        ? current.filter((idValue) => idValue !== proformaId)
        : [...current, proformaId]
    ));
  }

  function toggleAllFilteredProformas() {
    setSelectedProformaIds(allFilteredProformasSelected ? [] : filteredProformaIds);
  }

  async function deleteSelectedProformas() {
    if (!selectedProformaIds.length) return;
    if (!window.confirm(`¿Eliminar ${selectedProformaIds.length} proforma${selectedProformaIds.length === 1 ? "" : "s"} seleccionada${selectedProformaIds.length === 1 ? "" : "s"}?`)) return;

    try {
      await Promise.all(selectedProformaIds.map((proformaId) =>
        apiRequest(`/api/sales/documents/proforma/${proformaId}`, {
          token,
          method: "DELETE"
        })
      ));
      setSelectedProformaIds([]);
      proformasResource.reload();
    } catch (err) {
      window.alert(err.message || "No se han podido eliminar las proformas seleccionadas.");
    }
  }

  return (
    <div className="module-page invoices-mirror-page">
      <header className="module-page-header invoices-page-header">
        <h3>Facturas proforma</h3>
        <button className="primary-button" type="button" onClick={onCreateProforma}>Nueva proforma</button>
      </header>
      {proformasResource.error ? (
        <div className="integration-warning">
          <strong>No se han podido cargar las proformas internas.</strong>
          <p>{proformasResource.error}</p>
        </div>
      ) : null}
      <section className="module-panel invoices-list-panel">
        <div className="invoice-toolbar">
          <button className="invoice-view-filter" type="button">
            <FileText size={18} />
            Todas las proformas
            <ChevronDown size={16} />
          </button>
          <div className="module-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar..." />
          </div>
          <DocumentDateFilter value={dateFilter} onChange={setDateFilter} />
        </div>
        {selectedProformaIds.length ? (
          <div className="module-filters invoice-filter-row">
            <div className="bulk-document-actions">
              <button className="bulk-document-action danger" type="button" onClick={deleteSelectedProformas}>
                Eliminar {selectedProformaIds.length} proforma{selectedProformaIds.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        ) : null}
        <div className="table-wrap invoice-table-wrap" onScroll={proformaRows.handleTableScroll}>
          <table className="module-table invoice-table">
            <thead>
              <tr>
                <th className="select-column">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todas las proformas"
                    checked={allFilteredProformasSelected}
                    onChange={toggleAllFilteredProformas}
                  />
                </th>
                <th className="invoice-kind-column"></th>
                <SortableDocumentHeader sortKey="date" sortConfig={proformaSort.sortConfig} onSort={proformaSort.requestSort}>Fecha</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="status" sortConfig={proformaSort.sortConfig} onSort={proformaSort.requestSort}>Estado</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="number" sortConfig={proformaSort.sortConfig} onSort={proformaSort.requestSort}>Serie / Núm.</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="contact" sortConfig={proformaSort.sortConfig} onSort={proformaSort.requestSort}>Cliente / Detalle</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="subtotal" sortConfig={proformaSort.sortConfig} onSort={proformaSort.requestSort}>Subtotal</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="total" sortConfig={proformaSort.sortConfig} onSort={proformaSort.requestSort}>Total</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="currency" sortConfig={proformaSort.sortConfig} onSort={proformaSort.requestSort}>Moneda</SortableDocumentHeader>
              </tr>
            </thead>
            <tbody>
              {proformasResource.loading ? (
                <tr className="empty-table-row">
                  <td colSpan={9}>Cargando proformas internas...</td>
                </tr>
              ) : null}
              {!proformasResource.loading && !filteredProformas.length ? (
                <tr className="empty-table-row">
                  <td colSpan={9}>No hay proformas internas de prueba todavía.</td>
                </tr>
              ) : null}
              {visibleProformas.map((proforma) => (
                <tr
                  key={proforma.id}
                  className="clickable-table-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedProforma(proforma)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedProforma(proforma);
                    }
                  }}
                >
                  <td className="select-column">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar proforma ${proforma.number}`}
                      checked={selectedProformaIds.includes(proforma.id)}
                      onChange={() => toggleProformaSelection(proforma.id)}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    />
                  </td>
                  <td className="invoice-kind-column"><span className="invoice-kind-badge">P</span></td>
                  <td>{dateOnly(proforma.date)}</td>
                  <td><span className={`invoice-payment-status ${proforma.statusKey}`}>{proforma.status}</span></td>
                  <td>{proforma.number}</td>
                  <td>
                    <div className="invoice-detail-cell">
                      <strong>{proforma.contact}</strong>
                      <span>{proforma.detail}</span>
                    </div>
                  </td>
                  <td>{tableMoney(proforma.subtotal)}</td>
                  <td>{tableMoney(proforma.total)}</td>
                  <td>{proforma.currency}</td>
                </tr>
              ))}
              <DocumentLoadMoreRow
                colSpan={9}
                visibleCount={proformaRows.visibleCount}
                totalRows={sortedProformas.length}
                onLoadMore={proformaRows.loadMoreRows}
              />
            </tbody>
          </table>
        </div>
      </section>
      {selectedProforma ? (
        <QuoteEditorModal
          token={token}
          quote={{
            id: selectedProforma.id,
            leadId: selectedProforma.leadId,
            quoteNumber: selectedProforma.number,
            number: selectedProforma.number,
            status: selectedProforma.raw?.item?.status || "draft",
            locale: selectedProforma.raw?.item?.locale || "es",
            currency: selectedProforma.currency,
            subtotal: selectedProforma.subtotal,
            taxTotal: selectedProforma.taxTotal,
            total: selectedProforma.total,
            notes: selectedProforma.raw?.item?.notes || "",
            internalNotes: selectedProforma.raw?.item?.internalNotes || "",
            paymentMethod: selectedProforma.raw?.item?.paymentMethod || "",
            createdAt: selectedProforma.date,
            items: selectedProforma.raw?.item?.items || [],
            attachments: selectedProforma.raw?.item?.attachments || []
          }}
          documentType="proforma"
          onClose={() => setSelectedProforma(null)}
          onUpdated={() => {
            setSelectedProforma(null);
            proformasResource.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function DeliveryNoteDetailModal({ token, deliveryNote, onClose }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const pdfId = `delivery-note-menu-pdf-${safeFilePart(deliveryNote.id || deliveryNote.number)}`;
  const pdfFilename = `Albaran-${safeFilePart(dateOnly(deliveryNote.date))}-${safeFilePart(deliveryNote.number)}.pdf`;
  const main = deliveryNote.raw?.main || {};
  const counterpart = main.counterpart || {};
  const clientBlock = documentCounterpartBlock(deliveryNote);
  const lineRows = documentLinesForPdf(deliveryNote.lines).map((line, index) => {
    const rawLine = deliveryNote.lines[index] || {};
    const productName = firstValue(rawLine, [
      "product.name",
      "product.title",
      "product.description",
      "title",
      "name"
    ], "");
    return {
      ...line,
      product: [line.code, productName].filter(Boolean).join(" ") || line.code || productName || "-"
    };
  });
  const subtotal = Number(deliveryNote.subtotal || 0);
  const total = Number(deliveryNote.total || 0);
  const taxTotal = Math.max(total - subtotal, 0);
  const taxRate = subtotal ? Math.round((taxTotal / subtotal) * 100) : 21;
  const deliveryDate = firstValue(main, ["expectedDeliveryDate", "deliveryDate", "dueDate"], addDays(deliveryNote.date, 0));
  const billingBlock = clientBlock.length ? clientBlock : [deliveryNote.contact, countryLabel(counterpart.countryCode || counterpart.country)];
  const linkedDocuments = Array.isArray(main.linkedDocuments)
    ? main.linkedDocuments.length
    : Array.isArray(main.relatedDocuments)
      ? main.relatedDocuments.length
      : 0;

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
              onSend={() => setSendOpen(true)}
              onDownload={() => renderDocumentElementAsPdf(pdfId, pdfFilename)}
              onPrint={() => printDocumentElement(pdfId, pdfFilename)}
              onCreateInvoice={() => window.dispatchEvent(new CustomEvent("doinglight:create-invoice", { detail: { deliveryNoteId: deliveryNote.id } }))}
              onClose={() => setActionsOpen(false)}
            />
          ) : null}
        </>
      )}
    >
      <div className="quote-record-body document-record-body">
        <section className="document-record-hero">
          <div className="document-record-meta">
            <span>Operación: <strong>{firstValue(main, ["operation.name", "operation", "taxOperation"], "Empresa intracomunitaria (no VIES)")}</strong></span>
            <span>Plantilla: <strong>{firstValue(main, ["template.name", "template"], "Principal")}</strong></span>
            <span>Responsable: <strong>{deliveryNote.responsible || firstValue(main, ["responsible.name", "owner.name"], "-")}</strong></span>
          </div>
          <div className="document-record-title-row">
            <div>
              <h3>Albarán</h3>
              {linkedDocuments ? (
                <span className="linked-document-indicator">
                  <Share2 size={17} />
                  {linkedDocuments} documento{linkedDocuments === 1 ? "" : "s"} enlazado{linkedDocuments === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            <div className="document-record-total">
              <span>Total</span>
              <strong>{tableMoney(total)} <small>{deliveryNote.currency}</small></strong>
            </div>
          </div>
        </section>

        <section className="document-record-fields">
          <DetailItem label="Cliente" value={deliveryNote.contact} />
          <DetailItem label="Fecha" value={dateOnly(deliveryNote.date)} />
          <DetailItem label="Número de documento" value={deliveryNote.number} />
          <DetailItem label="Correo electrónico de envío" value={counterpart.email || counterpart.emailAddress || ""} />
          <DetailItem label="Fecha entrega prevista" value={dateOnly(deliveryDate)} />
          <DetailItem label="Método de pago" value={firstValue(main, ["paymentMethod.name", "paymentMethod", "paymentTerms"], "")} />
          <DetailItem label="Estado del albarán" value={deliveryNote.status} />
          <div className="detail-item document-record-billing">
            <span>Datos de facturación</span>
            <strong>{billingBlock.map((line, index) => <React.Fragment key={`${line}-${index}`}>{line}<br /></React.Fragment>)}</strong>
          </div>
          <DetailItem label="Notas" value={firstValue(main, ["notes", "observations", "publicNotes"], "")} />
          <DetailItem label="Notas internas" value={firstValue(main, ["internalNotes", "privateNotes"], "")} />
        </section>

        <section className="document-record-lines">
          <div className="table-wrap">
            <table className="document-record-lines-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Precio de venta</th>
                  <th>Impuestos</th>
                  <th>Dto (%)</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {lineRows.length ? lineRows.map((line, index) => (
                  <tr key={`${deliveryNote.id}-line-${index}`}>
                    <td>{line.product}</td>
                    <td>{line.concept || "-"}</td>
                    <td>{tableMoney(line.quantity || 0)}</td>
                    <td>{tableMoney(line.price || 0)}</td>
                    <td>IVA {taxRate}%</td>
                    <td>{tableMoney(line.discount || 0)}</td>
                    <td>{tableMoney(line.total || 0)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7}>Este albarán no trae líneas detalladas en la respuesta actual.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="document-record-summary">
            <div>
              <span>Subtotal</span>
              <strong>{tableMoney(subtotal)}</strong>
            </div>
            <div>
              <span>Impuesto</span>
              <span>Base imponible</span>
              <span>Cuota</span>
            </div>
            <div>
              <span>IVA {taxRate}%</span>
              <span>{tableMoney(subtotal)}</span>
              <span>{tableMoney(taxTotal)}</span>
            </div>
            <div>
              <span>Total</span>
              <strong>{tableMoney(total)}</strong>
            </div>
          </div>
        </section>

        <div className="hidden-pdf-source" aria-hidden="true">
          <DocumentPdfPage
            id={pdfId}
            type="delivery-note"
            language="es"
            number={deliveryNote.number}
            date={deliveryNote.date}
            dueDate={addDays(deliveryNote.date, 30)}
            clientBlock={documentCounterpartBlock(deliveryNote)}
            lines={documentLinesForPdf(deliveryNote.lines)}
            subtotal={deliveryNote.subtotal}
            taxRate={taxRateFromTaxMode(taxModeFromDocument(deliveryNote))}
            taxTotal={Math.max(deliveryNote.total - deliveryNote.subtotal, 0)}
            total={deliveryNote.total}
            reverseCharge={isReverseChargeTaxMode(taxModeFromDocument(deliveryNote))}
            currency={deliveryNote.currency}
            paymentMethod={firstValue(deliveryNote.raw?.main || {}, ["paymentMethod.name", "paymentMethod", "paymentTerms"], "")}
            notes={firstValue(deliveryNote.raw?.main || {}, ["notes", "observations", "publicNotes"], "")}
          />
        </div>
      </div>
      {sendOpen ? (
        <DocumentSendModal
          token={token}
          documentRecord={deliveryNote}
          type="delivery-note"
          onClose={() => setSendOpen(false)}
        />
      ) : null}
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
  { id: "integrations", title: "Integraciones", description: "Importación desde FacturaDirecta", icon: RefreshCw },
  { id: "users", title: "Usuarios y roles", description: "Gestiona usuarios, roles y el propietario de la cuenta", icon: UsersRound },
  { id: "taxes", title: "Impuestos", description: "Operador intracomunitario e impuestos habituales", icon: Landmark },
  { id: "verifactu", title: "VeriFactu", description: "Configura VeriFactu", icon: Fingerprint },
  { id: "sales", title: "Ventas", description: "Cálculo de impuestos, creación de facturas y firma digital", icon: Truck },
  { id: "numbering", title: "Numeración", description: "Numeración y series de facturas, presupuestos y albaranes", icon: History },
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
          ) : activeSection === "integrations" ? (
            <FacturaDirectaImportPanel token={session?.token} />
          ) : activeSection === "numbering" ? (
            <NumberingSettingsPanel token={session?.token} />
          ) : (
            <GenericSettingsPanel config={SETTINGS_PANELS[activeSection]} />
          )}
        </main>
      </div>
    </div>
  );
}

function FacturaDirectaImportPanel({ token }) {
  const [salesBusy, setSalesBusy] = useState(false);
  const [purchasesBusy, setPurchasesBusy] = useState(false);
  const [salesResult, setSalesResult] = useState(null);
  const [purchasesResult, setPurchasesResult] = useState(null);
  const [salesProgress, setSalesProgress] = useState("");
  const [purchasesProgress, setPurchasesProgress] = useState("");
  const [purchaseResumeOffset, setPurchaseResumeOffset] = useState(0);
  const [diagnostics, setDiagnostics] = useState([]);
  const [diagnosticTotals, setDiagnosticTotals] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiRequest("/api/facturadirecta/import/recent-errors", { token })
      .then((result) => {
        if (!cancelled) {
          setDiagnostics(result.errors || []);
          setDiagnosticTotals(result.totals || null);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  async function previewSales() {
    setSalesBusy(true);
    setError("");
    setSalesProgress("Revisando una muestra...");
    try {
      const result = await apiRequest("/api/facturadirecta/import/sales-documents", {
        token,
        method: "POST",
        body: { commit: false, limitPerResource: 10, batchSize: 10 }
      });
      setSalesResult(result);
      setSalesProgress("Vista previa completada sin modificar datos.");
    } catch (err) {
      setError(err.message);
      setSalesProgress("");
    } finally {
      setSalesBusy(false);
    }
  }

  async function importAllSales() {
    if (!window.confirm("Se importarán o actualizarán todos los presupuestos, proformas, albaranes y facturas de venta de FacturaDirecta. La operación evita duplicados. ¿Continuar?")) return;
    setSalesBusy(true);
    setError("");
    const totals = { imported: 0, failed: 0, unmatchedContacts: 0, byResource: {} };
    try {
      for (const resource of ["estimates", "deliveryNotes", "invoices"]) {
        let offset = 0;
        let complete = false;
        let batches = 0;
        while (!complete) {
          setSalesProgress(`Importando ${resource} desde el registro ${offset}...`);
          const result = await apiRequest("/api/facturadirecta/import/sales-documents", {
            token,
            method: "POST",
            body: {
              commit: true,
              resources: [resource],
              batchSize: 100,
              limitPerResource: 100,
              offsets: { [resource]: offset }
            }
          });
          const resourceResult = result.byResource?.[resource] || {};
          totals.imported += Number(result.imported || 0);
          totals.failed += Number(result.failed || 0);
          totals.unmatchedContacts += Number(result.unmatchedContacts || 0);
          totals.byResource[resource] = {
            imported: Number(totals.byResource[resource]?.imported || 0) + Number(resourceResult.imported || 0),
            failed: Number(totals.byResource[resource]?.failed || 0) + Number(resourceResult.failed || 0),
            totalAvailable: resourceResult.totalAvailable
          };
          const nextOffset = Number(resourceResult.nextOffset ?? offset);
          complete = Boolean(resourceResult.complete);
          batches += 1;
          if (!complete && (nextOffset <= offset || batches > 10000)) {
            throw new Error(`La importación de ${resource} no pudo avanzar desde el registro ${offset}.`);
          }
          offset = nextOffset;
        }
      }
      setSalesResult(totals);
      setSalesProgress("Importación de ventas completada.");
      window.dispatchEvent(new CustomEvent(SALES_DOCUMENT_SAVED_EVENT, { detail: { documentType: "all" } }));
    } catch (err) {
      setError(err.message);
      setSalesProgress("Importación detenida. Puede reanudarse sin crear duplicados.");
    } finally {
      setSalesBusy(false);
    }
  }

  async function previewPurchases() {
    setPurchasesBusy(true);
    setError("");
    setPurchasesProgress("Revisando una muestra de compras y adjuntos...");
    try {
      const result = await apiRequest("/api/facturadirecta/import/purchases", {
        token,
        method: "POST",
        body: { commit: false, limit: 10, batchSize: 10 }
      });
      setPurchasesResult(result);
      setPurchasesProgress("Vista previa completada sin modificar datos.");
    } catch (err) {
      setError(err.message);
      setPurchasesProgress("");
    } finally {
      setPurchasesBusy(false);
    }
  }

  async function importAllPurchases() {
    if (!window.confirm("Se importarán o actualizarán todas las compras de FacturaDirecta y se copiarán sus archivos adjuntos al almacenamiento del panel. ¿Continuar?")) return;
    setPurchasesBusy(true);
    setError("");
    let offset = purchaseResumeOffset;
    let complete = false;
    let batches = 0;
    const totals = {
      imported: 0,
      failed: 0,
      attachmentCount: 0,
      importedBytes: 0,
      unmatchedSuppliers: 0,
      attachmentStorageConfigured: false,
      attachmentStorageMode: ""
    };
    try {
      while (!complete) {
        setPurchasesProgress(`Importando compras desde el registro ${offset}...`);
        let result;
        let lastRequestError;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          try {
            result = await apiRequest("/api/facturadirecta/import/purchases", {
              token,
              method: "POST",
              body: { commit: true, offset, limit: 10, batchSize: 10 }
            });
            lastRequestError = null;
            break;
          } catch (requestError) {
            lastRequestError = requestError;
            if (attempt < 3) {
              setPurchasesProgress(`Reintentando compras desde el registro ${offset} (${attempt}/3)...`);
              await new Promise((resolve) => window.setTimeout(resolve, attempt * 2000));
            }
          }
        }
        if (lastRequestError) throw lastRequestError;
        totals.imported += Number(result.imported || 0);
        totals.failed += Number(result.failed || 0);
        totals.attachmentCount += Number(result.attachmentCount || 0);
        totals.importedBytes += Number(result.importedBytes || 0);
        totals.unmatchedSuppliers += Number(result.unmatchedSuppliers || 0);
        totals.attachmentStorageConfigured = Boolean(result.attachmentStorageConfigured);
        totals.attachmentStorageMode = result.attachmentStorageMode || totals.attachmentStorageMode;
        const nextOffset = Number(result.nextOffset ?? offset);
        complete = Boolean(result.complete);
        batches += 1;
        if (!complete && (nextOffset <= offset || batches > 10000)) {
          throw new Error(`La importación de compras no pudo avanzar desde el registro ${offset}.`);
        }
        offset = nextOffset;
      }
      setPurchasesResult(totals);
      setPurchaseResumeOffset(0);
      setPurchasesProgress("Importación de compras y adjuntos completada.");
      window.dispatchEvent(new CustomEvent("doinglight:purchases-changed"));
    } catch (err) {
      setPurchaseResumeOffset(offset);
      setError(err.message);
      setPurchasesProgress("Importación detenida. Puede reanudarse sin crear duplicados.");
    } finally {
      setPurchasesBusy(false);
    }
  }

  async function retryFailedPurchases() {
    setPurchasesBusy(true);
    setError("");
    setPurchasesProgress("Reintentando únicamente las compras fallidas...");
    try {
      const result = await apiRequest("/api/facturadirecta/import/purchases/retry-failed", {
        token,
        method: "POST",
        body: {}
      });
      setPurchasesResult(result);
      setPurchasesProgress("Reintento de compras fallidas completado.");
      window.dispatchEvent(new CustomEvent("doinglight:purchases-changed"));
    } catch (err) {
      setError(err.message);
      setPurchasesProgress("No se pudieron completar los reintentos.");
    } finally {
      setPurchasesBusy(false);
    }
  }

  function salesBreakdown(result) {
    return Object.entries(result?.byResource || {}).map(([resource, values]) => {
      const labels = { estimates: "Presupuestos/proformas", deliveryNotes: "Albaranes", invoices: "Facturas" };
      return `${labels[resource] || resource}: ${values.imported || 0}`;
    }).join(" · ");
  }

  return (
    <div className="settings-card-stack fd-import-settings">
      {diagnosticTotals ? (
        <section className="settings-card">
          <header className="settings-card-header">
            <div>
              <h3>Resumen importado</h3>
              <p>{diagnosticTotals.quotes} presupuestos · {diagnosticTotals.proformas} proformas · {diagnosticTotals.deliveryNotes} albaranes · {diagnosticTotals.invoices} facturas</p>
              <p>{diagnosticTotals.purchases} compras · {diagnosticTotals.attachments} adjuntos · {attachmentSize(diagnosticTotals.attachmentBytes)}</p>
            </div>
          </header>
        </section>
      ) : null}
      <section className="settings-card">
        <header className="settings-card-header">
          <div>
            <h3>Documentos de venta</h3>
            <p>Presupuestos, proformas, albaranes y facturas de venta. Las repeticiones actualizan el documento existente.</p>
          </div>
        </header>
        <div className="fd-import-actions">
          <button className="secondary-button" type="button" disabled={salesBusy || purchasesBusy} onClick={previewSales}>Revisar muestra</button>
          <button className="primary-button" type="button" disabled={salesBusy || purchasesBusy} onClick={importAllSales}>
            {salesBusy ? "Procesando..." : "Importar todas las ventas"}
          </button>
        </div>
        {salesProgress ? <p className="fd-import-progress">{salesProgress}</p> : null}
        {salesResult ? (
          <div className="fd-import-result">
            <strong>{salesResult.imported || 0} documentos procesados</strong>
            <span>{salesBreakdown(salesResult) || `${salesResult.scanned || 0} revisados`}</span>
            <span>{salesResult.failed || 0} errores · {salesResult.unmatchedContacts || 0} sin cliente asociado</span>
          </div>
        ) : null}
        {diagnostics.length ? (
          <div className="fd-import-result">
            <strong>Diagnóstico de errores recientes</strong>
            {diagnostics.slice(0, 5).map((item, index) => (
              <span key={`${item.sourceItemType}-${index}`}>{item.sourceItemType}: {item.occurrences} · {item.error}</span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="settings-card">
        <header className="settings-card-header">
          <div>
            <h3>Compras y documentos originales</h3>
            <p>Importa facturas de compra y tiques; copia sus PDF/JPG al almacenamiento configurado del panel.</p>
          </div>
        </header>
        <div className="fd-import-actions">
          <button className="secondary-button" type="button" disabled={salesBusy || purchasesBusy} onClick={previewPurchases}>Revisar muestra</button>
          <button className="primary-button" type="button" disabled={salesBusy || purchasesBusy} onClick={importAllPurchases}>
            {purchasesBusy ? "Procesando..." : purchaseResumeOffset ? `Reanudar compras desde ${purchaseResumeOffset}` : "Importar todas las compras"}
          </button>
        </div>
        {purchasesProgress ? <p className="fd-import-progress">{purchasesProgress}</p> : null}
        {purchasesResult ? (
          <div className="fd-import-result">
            <strong>{purchasesResult.imported || 0} compras procesadas</strong>
            <span>{purchasesResult.attachmentCount || 0} adjuntos · {purchasesResult.importedBytes ? attachmentSize(purchasesResult.importedBytes) : "0 B"}</span>
            <span>
              Almacenamiento de adjuntos: {purchasesResult.attachmentStorageMode === "s3" ? "S3" : "base de datos del panel"}
            </span>
            <span>{purchasesResult.failed || 0} errores · {purchasesResult.unmatchedSuppliers || 0} sin proveedor asociado</span>
          </div>
        ) : null}
      </section>

      {error ? <p className="form-error">{error}</p> : null}
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

const NUMBERING_DOCUMENTS = {
  invoice: {
    title: "Series de factura",
    singular: "factura",
    description: "Puedes tener múltiples series para utilizar en tus facturas",
    columns: ["Serie", "Tipo factura", "Plantilla", "Reinicio", "Número inicial", "Manual", "Ocultar", "Notas"]
  },
  quote: {
    title: "Series de presupuesto",
    singular: "presupuesto",
    description: "Puedes tener múltiples series para utilizar en tus presupuestos",
    columns: ["Serie", "Plantilla", "Reinicio", "Número inicial", "Manual", "Ocultar", "Notas"]
  },
  deliveryNote: {
    title: "Series de albaranes",
    singular: "albarán",
    description: "Puedes tener múltiples series para utilizar en tus albaranes",
    columns: ["Serie", "Plantilla", "Reinicio", "Número inicial", "Manual", "Ocultar", "Notas"]
  }
};

function NumberingSettingsPanel({ token }) {
  const settings = useResource(() => apiRequest("/api/settings", { token }), [token]);
  const numbering = useMemo(() => normalizeNumbering(settings.data?.item?.numbering), [settings.data]);
  const [modalType, setModalType] = useState(null);
  const [editingSeries, setEditingSeries] = useState(null);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveNumbering(nextNumbering) {
    setSaving(true);
    setError("");
    try {
      await apiRequest("/api/settings/numbering", {
        token,
        method: "PATCH",
        body: nextNumbering
      });
      await settings.reload();
      setModalType(null);
      setEditingSeries(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addSeries(type, series) {
    const nextNumbering = {
      ...numbering,
      series: {
        ...numbering.series,
        [type]: [
          ...(numbering.series[type] || []),
          {
            ...series,
            id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`
          }
        ]
      }
    };
    await saveNumbering(nextNumbering);
  }

  async function updateSeries(type, index, series) {
    const currentRows = numbering.series[type] || [];
    const nextRows = currentRows.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      return {
        ...row,
        ...series,
        id: row.id || `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`
      };
    });
    await saveNumbering({
      ...numbering,
      series: {
        ...numbering.series,
        [type]: nextRows
      }
    });
  }

  async function savePreferences(preferences) {
    await saveNumbering({
      ...numbering,
      preferences: {
        ...numbering.preferences,
        ...preferences
      }
    });
    setEditingPreferences(false);
  }

  const preferences = numbering.preferences;

  return (
    <div className="settings-card-stack">
      {settings.error ? <p className="form-error">{settings.error}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <section className="settings-card numbering-preferences-card">
        <header className="settings-card-header">
          <div>
            <h3>Numeración de documentos</h3>
            <p>Preferencias de numeración de tus facturas, presupuestos y albaranes</p>
          </div>
          <button className="settings-outline-button" type="button" onClick={() => setEditingPreferences(true)}>Modificar</button>
        </header>
        <div className="numbering-preferences-grid">
          <SettingField label="Longitud mínima del número de documento" value={preferences.minLength || "Sin longitud mínima"} />
          <SettingField label="Longitud del número de documento en Facturae" value={preferences.facturaeMinLength || "Sin longitud mínima"} />
          <SettingField
            label="Posición de la serie en el número de documento"
            value={`${preferences.seriesPosition || "Delante"} · Ejemplo. ${preferences.seriesExample || "ABC/0012"}`}
            wide
          />
        </div>
      </section>

      {Object.entries(NUMBERING_DOCUMENTS).map(([type, config]) => (
        <NumberingSeriesCard
          key={type}
          config={config}
          rows={numbering.series[type] || []}
          type={type}
          onAdd={() => setModalType(type)}
          onEdit={(row, index) => setEditingSeries({ type, index, row })}
        />
      ))}

      {modalType ? (
        <NumberingSeriesModal
          config={NUMBERING_DOCUMENTS[modalType]}
          type={modalType}
          onClose={() => setModalType(null)}
          onSave={(series) => addSeries(modalType, series)}
          saving={saving}
        />
      ) : null}
      {editingSeries ? (
        <NumberingSeriesModal
          config={NUMBERING_DOCUMENTS[editingSeries.type]}
          type={editingSeries.type}
          initial={editingSeries.row}
          onClose={() => setEditingSeries(null)}
          onSave={(series) => updateSeries(editingSeries.type, editingSeries.index, series)}
          saving={saving}
        />
      ) : null}
      {editingPreferences ? (
        <NumberingPreferencesModal
          initial={preferences}
          onClose={() => setEditingPreferences(false)}
          onSave={savePreferences}
          saving={saving}
        />
      ) : null}
    </div>
  );
}

function NumberingSeriesCard({ config, rows, type, onAdd, onEdit }) {
  return (
    <section className="settings-card numbering-series-card">
      <header className="settings-card-header">
        <div>
          <h3>{config.title}</h3>
          <p>{config.description}</p>
        </div>
      </header>
      <button className="settings-outline-button numbering-add-button" type="button" onClick={onAdd}>
        Añadir serie
      </button>
      <div className="numbering-table-wrap">
        <table className="numbering-table">
          <thead>
            <tr>
              {config.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                className="numbering-table-row-clickable"
                key={row.id || `${type}-${row.code}-${row.notes}-${index}`}
                onClick={() => onEdit(row, index)}
                tabIndex={0}
                role="button"
                aria-label={`Editar serie ${row.code || row.notes || "sin serie"}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onEdit(row, index);
                  }
                }}
              >
                <td>{row.code || ""}</td>
                {type === "invoice" ? <td>{row.invoiceType || "Completa"}</td> : null}
                <td>{row.template || "Principal"}</td>
                <td>{row.restart || "Nunca"}</td>
                <td>{row.initialNumber || ""}</td>
                <td><BooleanMark value={row.manual} /></td>
                <td><BooleanMark value={row.hidden} /></td>
                <td>{row.notes || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BooleanMark({ value }) {
  return (
    <span className={value ? "numbering-boolean yes" : "numbering-boolean no"} aria-label={value ? "Sí" : "No"}>
      {value ? <CheckCircle2 size={17} /> : <X size={17} />}
    </span>
  );
}

function NumberingPreferencesModal({ initial, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    minLength: initial.minLength || "",
    facturaeMinLength: initial.facturaeMinLength || "",
    seriesPosition: initial.seriesPosition || "Delante",
    seriesExample: initial.seriesExample || "ABC/0012"
  });

  async function submit(event) {
    event.preventDefault();
    await onSave({
      minLength: form.minLength ? Number(form.minLength) : "",
      facturaeMinLength: form.facturaeMinLength ? Number(form.facturaeMinLength) : "",
      seriesPosition: form.seriesPosition,
      seriesExample: form.seriesExample
    });
  }

  return (
    <ModalShell title="Numeración de documentos" eyebrow="Ajustes" size="payment-modal" onClose={onClose}>
      <form className="numbering-series-form" onSubmit={submit}>
        <div className="numbering-form-grid">
          <label>
            Longitud mínima del número de documento
            <input
              type="number"
              min="0"
              value={form.minLength}
              onChange={(event) => setForm({ ...form, minLength: event.target.value })}
            />
          </label>
          <label>
            Longitud del número de documento en Facturae
            <input
              type="number"
              min="0"
              placeholder="Sin longitud mínima"
              value={form.facturaeMinLength}
              onChange={(event) => setForm({ ...form, facturaeMinLength: event.target.value })}
            />
          </label>
        </div>
        <div className="numbering-form-grid">
          <label>
            Posición de la serie en el número de documento
            <select value={form.seriesPosition} onChange={(event) => setForm({ ...form, seriesPosition: event.target.value })}>
              <option value="Delante">Delante</option>
              <option value="Detrás">Detrás</option>
            </select>
          </label>
          <label>
            Ejemplo
            <input value={form.seriesExample} onChange={(event) => setForm({ ...form, seriesExample: event.target.value })} />
          </label>
        </div>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </form>
    </ModalShell>
  );
}

function NumberingSeriesModal({ type, config, initial, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    invoiceType: initial?.invoiceType || "Completa",
    code: initial?.code || "",
    initialNumber: initial?.initialNumber === "" || initial?.initialNumber == null ? "" : String(initial.initialNumber),
    notes: initial?.notes || "",
    restartYearly: initial?.restart === "Cada año",
    hidden: Boolean(initial?.hidden),
    manual: Boolean(initial?.manual),
    template: initial?.template || "Principal"
  });

  async function submit(event) {
    event.preventDefault();
    await onSave({
      code: form.code.trim(),
      invoiceType: type === "invoice" ? form.invoiceType : undefined,
      template: form.template,
      restart: form.restartYearly ? "Cada año" : "Nunca",
      initialNumber: form.initialNumber === "" ? "" : Number(form.initialNumber || 1),
      manual: form.manual,
      hidden: form.hidden,
      notes: form.notes.trim()
    });
  }

  return (
    <ModalShell title={`${initial ? "Editar" : "Nueva"} serie de ${config.singular}`} eyebrow="Numeración" size="numbering-modal" onClose={onClose}>
      <form className="numbering-series-form" onSubmit={submit}>
        {type === "invoice" ? (
          <label className="wide-field">
            Tipo de factura
            <select value={form.invoiceType} onChange={(event) => setForm({ ...form, invoiceType: event.target.value })}>
              <option value="Completa">Completa</option>
              <option value="Completa rectificativa">Completa rectificativa</option>
              <option value="Simplificada">Simplificada</option>
              <option value="Factura proforma">Factura proforma</option>
            </select>
            <small>Indica para qué tipo de facturas se usará esta serie</small>
          </label>
        ) : null}

        <div className="numbering-form-grid">
          <label>
            Serie
            <input
              placeholder="Serie"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
            />
            <small>Puedes usar ## o #### para indicar el año del documento con 2 o 4 dígitos respectivamente</small>
          </label>
          <label>
            Número inicial
            <input
              type="number"
              min="1"
              value={form.initialNumber}
              onChange={(event) => setForm({ ...form, initialNumber: event.target.value })}
            />
            <small>Si no existe ningún documento en esta serie, empezará por este número.</small>
          </label>
        </div>

        <label>
          Notas
          <input placeholder="Notas" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </label>

        <div className="numbering-checkbox-grid">
          <label className="numbering-checkbox">
            <input
              type="checkbox"
              checked={form.restartYearly}
              onChange={(event) => setForm({ ...form, restartYearly: event.target.checked })}
            />
            <span>Reiniciar la numeración cada año</span>
          </label>
          <label className="numbering-checkbox">
            <input
              type="checkbox"
              checked={form.hidden}
              onChange={(event) => setForm({ ...form, hidden: event.target.checked })}
            />
            <span>Ocultar la serie en los listados</span>
          </label>
          <label className="numbering-checkbox">
            <input
              type="checkbox"
              checked={form.manual}
              onChange={(event) => setForm({ ...form, manual: event.target.checked })}
            />
            <span>Permitir numeración manual</span>
          </label>
        </div>

        <label className="numbering-template-field">
          Plantilla de PDF asociada a la serie
          <select value={form.template} onChange={(event) => setForm({ ...form, template: event.target.value })}>
            <option value="Principal">Principal</option>
            <option value="Tubo Solar">Tubo Solar</option>
          </select>
        </label>

        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </form>
    </ModalShell>
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

const SALES_DOCUMENT_SAVED_EVENT = "doinglight:sales-document-saved";

function notifySalesDocumentSaved(documentType, documentRecord) {
  window.dispatchEvent(
    new CustomEvent(SALES_DOCUMENT_SAVED_EVENT, {
      detail: {
        documentType,
        documentId: documentRecord?.id || null,
      },
    })
  );
}

function useSalesDocumentSavedRefresh(documentType, reload) {
  const reloadRef = useRef(reload);

  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    function handleDocumentSaved(event) {
      if (event.detail?.documentType !== documentType) return;
      reloadRef.current?.();
    }

    window.addEventListener(SALES_DOCUMENT_SAVED_EVENT, handleDocumentSaved);
    return () => {
      window.removeEventListener(SALES_DOCUMENT_SAVED_EVENT, handleDocumentSaved);
    };
  }, [documentType]);
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
    return products.filter((product) =>
      textMatchesQuery([product.sku, product.title, product.family, product.subcategory], query)
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
  const normalizedQuery = query.trim();
  const contactKindParam = contactFilter === "clients" ? "client" : contactFilter === "suppliers" ? "supplier" : "";
  const leads = useResource(
    () => {
      const params = new URLSearchParams({ limit: "500" });
      if (contactKindParam) params.set("contactKind", contactKindParam);
      if (normalizedQuery) params.set("q", normalizedQuery);
      return apiRequest(`/api/sales/leads?${params.toString()}`, { token });
    },
    [token, contactKindParam, normalizedQuery]
  );
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
    return contacts.filter((contact) => {
      const matchesLevel =
        contact.contactClass !== "client" ||
        customerLevelFilter === "all" ||
        (customerLevelFilter === "level_4"
          ? String(contact.customerLevel || "").startsWith("level_4")
          : contact.customerLevel === customerLevelFilter);

      if (!matchesLevel) return false;

      return textMatchesQuery([
        contact.fullName,
        contact.companyName,
        contact.taxId,
        contact.email,
        contact.phone,
        contact.population,
        contact.city,
        contact.province,
        contact.country
      ], query);
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

const PURCHASE_STATUS_OPTIONS = [
  { value: "draft", label: "Borrador" },
  { value: "pending", label: "Pendiente" },
  { value: "paid", label: "Pagada" },
  { value: "overdue", label: "Vencida" },
  { value: "void", label: "Anulada" }
];

const PURCHASE_TAX_OPTIONS = [
  { value: "vat_non_deductible", label: "IVA no deducible", rate: 21, kind: "non_deductible" },
  { value: "vat_21", label: "IVA (servicios) 21%", rate: 21, kind: "vat" },
  { value: "vat_10", label: "IVA (servicios) 10%", rate: 10, kind: "vat" },
  { value: "vat_4", label: "IVA (servicios) 4%", rate: 4, kind: "vat" },
  { value: "vat_5", label: "IVA (servicios) 5%", rate: 5, kind: "vat" },
  { value: "irpf_15", label: "IRPF 15%", rate: -15, kind: "withholding" },
  { value: "irpf_7", label: "IRPF 7%", rate: -7, kind: "withholding" },
  { value: "rent_withholding_19", label: "Retención alquiler urbano 19%", rate: -19, kind: "withholding" },
  { value: "disbursement", label: "Suplidos", rate: 0, kind: "disbursement" }
];

function purchaseTaxOption(line = {}) {
  const byCode = PURCHASE_TAX_OPTIONS.find((option) => option.value === (line.taxCode || line.tax_code));
  if (byCode) return byCode;
  const rate = Number(line.taxRate ?? line.tax_rate ?? 21);
  if (rate === 21) return PURCHASE_TAX_OPTIONS.find((option) => option.value === "vat_21");
  return PURCHASE_TAX_OPTIONS.find((option) => option.rate === rate)
    || PURCHASE_TAX_OPTIONS.find((option) => option.value === "vat_21");
}

function legacyPurchaseLineTotal(line, option) {
  const quantity = Math.max(0, Number(line.quantity) || 0);
  const unitCost = Math.max(0, Number(line.unitCost ?? line.unit_cost) || 0);
  const discount = Math.min(100, Math.max(0, Number(line.discountPercent ?? line.discount_percent) || 0));
  const base = quantity * unitCost * (1 - discount / 100);
  return option.kind === "disbursement" ? base : base * (1 + option.rate / 100);
}

function normalizePurchaseLine(line = {}) {
  const option = purchaseTaxOption(line);
  const explicitTotal = line.lineTotal ?? line.line_total ?? line.total;
  const hasExplicitTotal = explicitTotal !== undefined && explicitTotal !== null && explicitTotal !== "";
  return {
    ...line,
    taxCode: option.value,
    taxRate: option.rate,
    lineTotal: hasExplicitTotal ? Number(explicitTotal) : legacyPurchaseLineTotal(line, option)
  };
}

function purchaseLineAmounts(line = {}) {
  const taxOption = purchaseTaxOption(line);
  const total = Math.max(0, Number(line.lineTotal ?? line.line_total ?? line.total) || 0);
  const divisor = taxOption.kind === "disbursement" ? 1 : 1 + taxOption.rate / 100;
  const base = divisor > 0 ? total / divisor : total;
  const adjustment = total - base;
  return {
    base,
    taxOption,
    vat: taxOption.kind === "vat" ? adjustment : 0,
    nonDeductibleVat: taxOption.kind === "non_deductible" ? adjustment : 0,
    withholding: taxOption.kind === "withholding" ? Math.abs(adjustment) : 0,
    disbursement: taxOption.kind === "disbursement" ? total : 0,
    total
  };
}

function purchaseStatusLabel(value) {
  return PURCHASE_STATUS_OPTIONS.find((option) => option.value === value)?.label || value;
}

function purchaseTypeLabel(value) {
  return value === "expense" ? "Gasto / tique" : "Factura de compra";
}

function emptyPurchaseLine() {
  return {
    reference: "",
    description: "",
    quantity: 1,
    unitCost: 0,
    discountPercent: 0,
    taxCode: "vat_21",
    taxRate: 21,
    lineTotal: ""
  };
}

function PurchasesView({ token, onCreate, onOpen }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [revision, setRevision] = useState(0);
  const [fdInventory, setFdInventory] = useState(null);
  const [fdInventoryLoading, setFdInventoryLoading] = useState(false);
  const [fdInventoryError, setFdInventoryError] = useState("");
  const purchases = useResource(
    () => apiRequest("/api/purchases?limit=500", { token }),
    [token, revision]
  );

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("doinglight:purchases-changed", refresh);
    return () => window.removeEventListener("doinglight:purchases-changed", refresh);
  }, []);

  const items = purchases.data?.items || [];
  const summary = purchases.data?.summary || { count: 0, total: 0, taxTotal: 0, byStatus: {} };
  const filteredItems = items.filter((item) => {
    const supplier = item.supplier || {};
    const matchesQuery = !query || textMatchesQuery(
      [item.documentNumber, supplier.companyName, supplier.fullName, supplier.taxId].filter(Boolean).join(" "),
      query
    );
    return matchesQuery
      && (typeFilter === "all" || item.documentType === typeFilter)
      && (statusFilter === "all" || item.status === statusFilter);
  });
  const pendingTotal = Number(summary.byStatus?.pending || 0) + Number(summary.byStatus?.overdue || 0);

  async function runFdInventory() {
    setFdInventoryLoading(true);
    setFdInventoryError("");
    try {
      const result = await apiRequest("/api/facturadirecta/purchases/inventory?limit=20&offset=0", { token });
      setFdInventory(result);
    } catch (error) {
      setFdInventoryError(error.message);
    } finally {
      setFdInventoryLoading(false);
    }
  }

  return (
    <section className="module-page purchases-page">
      <header className="module-page-header purchases-page-header">
        <div>
          <h3>Compras y gastos</h3>
        </div>
        <div className="purchase-header-actions">
          <button className="secondary-button" type="button" disabled={fdInventoryLoading} onClick={runFdInventory}>
            {fdInventoryLoading ? "Revisando..." : "Inventario FD"}
          </button>
          <button className="secondary-button" type="button" onClick={() => onCreate("expense")}>Gasto / tique</button>
          <button className="primary-button" type="button" onClick={() => onCreate("supplier_invoice")}>
            <Plus size={17} />
            Factura de compra
          </button>
        </div>
      </header>

      <div className="module-metrics">
        <div className="metric"><span>Total compras</span><strong>{money(summary.total)}</strong></div>
        <div className="metric"><span>Pendiente de pago</span><strong>{money(pendingTotal)}</strong></div>
        <div className="metric"><span>IVA soportado</span><strong>{money(summary.taxTotal)}</strong></div>
        <div className="metric"><span>Documentos</span><strong>{summary.count || 0}</strong></div>
      </div>

      {fdInventoryError ? <p className="form-error module-message">{fdInventoryError}</p> : null}
      {fdInventory ? (
        <div className="fd-inventory-summary" role="status">
          <div>
            <strong>Muestra de adjuntos de FacturaDirecta</strong>
            <span>{fdInventory.scannedBills} facturas revisadas, sin descargar archivos ni modificar datos.</span>
          </div>
          <dl>
            <div><dt>Con adjuntos</dt><dd>{fdInventory.billsWithAttachments}</dd></div>
            <div><dt>Archivos</dt><dd>{fdInventory.attachmentCount}</dd></div>
            <div><dt>Tamaño conocido</dt><dd>{fdInventory.knownBytes > 0 ? attachmentSize(fdInventory.knownBytes) : "0 B"}</dd></div>
            <div><dt>Tamaño desconocido</dt><dd>{fdInventory.unknownSizeCount}</dd></div>
            <div><dt>Errores</dt><dd>{fdInventory.failureCount}</dd></div>
          </dl>
          <small>Tipos: {Object.entries(fdInventory.extensionCounts || {}).map(([type, count]) => `${type}: ${count}`).join(" · ") || "sin datos"}</small>
        </div>
      ) : null}

      <div className="module-panel">
        <div className="module-toolbar purchases-toolbar">
          <div className="purchase-filter-controls">
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrar por tipo">
              <option value="all">Todas las compras</option>
              <option value="supplier_invoice">Facturas de compra</option>
              <option value="expense">Gastos y tiques</option>
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar por estado">
              <option value="all">Todos los estados</option>
              {PURCHASE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <label className="module-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por proveedor, NIF o número" />
          </label>
        </div>

        {purchases.error ? <p className="form-error module-message">{purchases.error}</p> : null}
        <div className="table-wrap">
          <table className="module-table purchases-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Número</th>
                <th>Proveedor / detalle</th>
                <th>Estado</th>
                <th>Vencimiento</th>
                <th className="numeric-cell">Base</th>
                <th className="numeric-cell">IVA</th>
                <th className="numeric-cell">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchases.loading ? (
                <tr><td colSpan="9" className="empty-table-cell">Cargando compras...</td></tr>
              ) : filteredItems.length ? filteredItems.map((item) => {
                const supplierName = item.supplier?.companyName || item.supplier?.fullName || "Sin proveedor";
                return (
                  <tr key={item.id} className="clickable-row" onClick={() => onOpen(item)}>
                    <td>{dateOnly(item.issueDate)}</td>
                    <td><span className={`purchase-kind ${item.documentType}`}>{item.documentType === "expense" ? "G" : "C"}</span> {purchaseTypeLabel(item.documentType)}</td>
                    <td>{item.documentNumber || "Sin número"}</td>
                    <td><strong>{supplierName}</strong>{item.supplier?.taxId ? <small>{item.supplier.taxId}</small> : null}</td>
                    <td><span className={`purchase-status ${item.status}`}>{purchaseStatusLabel(item.status)}</span></td>
                    <td>{dateOnly(item.dueDate)}</td>
                    <td className="numeric-cell">{money(item.subtotal)}</td>
                    <td className="numeric-cell">{money(item.taxTotal)}</td>
                    <td className="numeric-cell"><strong>{money(item.total)}</strong></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="9" className="empty-table-cell">No hay compras que coincidan con los filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function PurchaseForm({ token, documentType, purchase, onCancel, onDone }) {
  const initialDocumentType = purchase?.documentType || documentType || "supplier_invoice";
  const [form, setForm] = useState({
    documentType: initialDocumentType,
    documentNumber: purchase?.documentNumber || "",
    supplierLeadId: purchase?.supplierLeadId || purchase?.supplier?.id || "",
    issueDate: inputDate(purchase?.issueDate || new Date()),
    dueDate: inputDate(purchase?.dueDate || ""),
    status: purchase?.status || "pending",
    currency: purchase?.currency || "EUR",
    deductible: purchase?.deductible ?? true,
    paymentMethod: purchase?.paymentMethod || "",
    notes: purchase?.notes || "",
    internalNotes: purchase?.internalNotes || "",
    lines: purchase?.lines?.length ? purchase.lines.map(normalizePurchaseLine) : [emptyPurchaseLine()]
  });
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(Boolean(purchase?.id));
  const [error, setError] = useState("");
  const [attachments, setAttachments] = useState(purchase?.attachments || []);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const suppliers = useResource(
    () => apiRequest("/api/sales/leads?contactKind=supplier&limit=500", { token }),
    [token]
  );

  useEffect(() => {
    if (!purchase?.id) return undefined;
    let active = true;
    apiRequest(`/api/purchases/${purchase.id}`, { token })
      .then((result) => {
        if (!active) return;
        const item = result.item || result;
        setForm({
          documentType: item.documentType || initialDocumentType,
          documentNumber: item.documentNumber || "",
          supplierLeadId: item.supplierLeadId || item.supplier?.id || "",
          issueDate: inputDate(item.issueDate),
          dueDate: inputDate(item.dueDate || ""),
          status: item.status || "pending",
          currency: item.currency || "EUR",
          deductible: item.deductible ?? true,
          paymentMethod: item.paymentMethod || "",
          notes: item.notes || "",
          internalNotes: item.internalNotes || "",
          lines: item.lines?.length ? item.lines.map(normalizePurchaseLine) : [emptyPurchaseLine()]
        });
        setAttachments(item.attachments || []);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoadingDetail(false));
    return () => { active = false; };
  }, [purchase?.id, token]);

  const supplierItems = suppliers.data?.items || suppliers.data?.leads || [];
  const totals = form.lines.reduce((acc, line) => {
    const amounts = purchaseLineAmounts(line);
    return {
      subtotal: acc.subtotal + (amounts.taxOption.kind === "disbursement" ? 0 : amounts.base),
      vat: acc.vat + amounts.vat,
      nonDeductibleVat: acc.nonDeductibleVat + amounts.nonDeductibleVat,
      withholding: acc.withholding + amounts.withholding,
      disbursement: acc.disbursement + amounts.disbursement,
      total: acc.total + amounts.total
    };
  }, { subtotal: 0, vat: 0, nonDeductibleVat: 0, withholding: 0, disbursement: 0, total: 0 });
  const canDelete = purchase?.status !== "paid";

  function updateLine(index, key, value) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line)
    }));
  }

  function addLine(index = form.lines.length - 1) {
    setForm((current) => {
      const lines = [...current.lines];
      lines.splice(index + 1, 0, emptyPurchaseLine());
      return { ...current, lines };
    });
  }

  function removeLine(index) {
    setForm((current) => ({
      ...current,
      lines: current.lines.length === 1 ? [emptyPurchaseLine()] : current.lines.filter((_, lineIndex) => lineIndex !== index)
    }));
  }

  async function addAttachments(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setError("");
    setAttachmentBusy(true);
    try {
      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase();
        const mimeType = file.type || (extension === "pdf" ? "application/pdf" : "image/jpeg");
        if (!["pdf", "jpg", "jpeg"].includes(extension) || !["application/pdf", "image/jpeg"].includes(mimeType)) {
          throw new Error("Solo se pueden adjuntar archivos PDF, JPG o JPEG.");
        }
        if (file.size > 10 * 1024 * 1024) throw new Error("Cada archivo puede ocupar como máximo 10 MB.");
        const dataBase64 = await fileToBase64(file);
        const input = { fileName: file.name, mimeType, fileSize: file.size, dataBase64 };
        if (purchase?.id) {
          const result = await apiRequest(`/api/purchases/${purchase.id}/attachments`, {
            token,
            method: "POST",
            body: input
          });
          setAttachments((current) => [...current, result.item]);
        } else {
          setPendingAttachments((current) => [...current, { ...input, localId: crypto.randomUUID() }]);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAttachmentBusy(false);
    }
  }

  async function downloadAttachment(attachment, pending = false) {
    setError("");
    try {
      if (pending) {
        const bytes = Uint8Array.from(atob(attachment.dataBase64), (character) => character.charCodeAt(0));
        saveBlob(new Blob([bytes], { type: attachment.mimeType }), attachment.fileName);
        return;
      }
      await downloadAuthenticatedFile(attachment.url, { token, fileName: attachment.fileName });
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeAttachment(attachment, pending = false) {
    setError("");
    if (pending) {
      setPendingAttachments((current) => current.filter((item) => item.localId !== attachment.localId));
      return;
    }
    try {
      await apiRequest(`/api/purchases/${purchase.id}/attachments/${attachment.id}`, { token, method: "DELETE" });
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.documentType === "supplier_invoice" && !form.supplierLeadId) {
      setError("Selecciona el proveedor de la factura.");
      return;
    }
    if (!form.lines.some((line) => String(line.description || "").trim())) {
      setError("Añade al menos una línea con descripción.");
      return;
    }
    setSaving(true);
    try {
      const result = await apiRequest(purchase?.id ? `/api/purchases/${purchase.id}` : "/api/purchases", {
        token,
        method: purchase?.id ? "PATCH" : "POST",
        body: {
          ...form,
          supplierLeadId: form.supplierLeadId || null,
          dueDate: form.dueDate || null,
          lines: form.lines.filter((line) => String(line.description || "").trim())
        }
      });
      const purchaseId = result.item?.id || purchase?.id;
      for (const attachment of pendingAttachments) {
        await apiRequest(`/api/purchases/${purchaseId}/attachments`, {
          token,
          method: "POST",
          body: attachment
        });
      }
      setPendingAttachments([]);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removePurchase() {
    if (!purchase?.id || !window.confirm("¿Eliminar este documento de compra?")) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/api/purchases/${purchase.id}`, { token, method: "DELETE" });
      onDone?.();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loadingDetail) return <p className="module-message">Cargando documento...</p>;

  return (
    <form className="purchase-form" onSubmit={submit}>
      <fieldset disabled={saving}>
        <input
          id="purchase-attachment-input"
          className="purchase-attachment-input"
          type="file"
          accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
          multiple
          onChange={addAttachments}
        />
        <div className="purchase-form-grid">
          <label>
            Tipo de documento
            <select value={form.documentType} onChange={(event) => setForm({ ...form, documentType: event.target.value })}>
              <option value="supplier_invoice">Factura de compra</option>
              <option value="expense">Gasto / tique</option>
            </select>
          </label>
          <label>
            Proveedor
            <select value={form.supplierLeadId} onChange={(event) => setForm({ ...form, supplierLeadId: event.target.value })}>
              <option value="">{form.documentType === "expense" ? "Sin proveedor" : "Seleccionar proveedor"}</option>
              {supplierItems.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.companyName || supplier.fullName}{supplier.taxId ? ` · ${supplier.taxId}` : ""}</option>
              ))}
            </select>
          </label>
          <label>
            Número de documento
            <input value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value })} placeholder="Número del proveedor" />
          </label>
          <label>
            Fecha
            <input type="date" value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} />
          </label>
          <label>
            Vencimiento
            <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
          </label>
          <label>
            Estado
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {PURCHASE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            Método de pago
            <select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}>
              <option value="">Seleccionar método de pago</option>
              {form.paymentMethod && !PAYMENT_METHOD_DEFAULTS.some((option) => option.name === form.paymentMethod) ? (
                <option value={form.paymentMethod}>{form.paymentMethod}</option>
              ) : null}
              {PAYMENT_METHOD_DEFAULTS.map((option) => (
                <option key={option.name} value={option.name}>
                  {option.detail ? `${option.name} · ${option.detail}` : option.name}
                </option>
              ))}
            </select>
          </label>
          <label className="purchase-deductible-field">
            <input type="checkbox" checked={form.deductible} onChange={(event) => setForm({ ...form, deductible: event.target.checked })} />
            IVA deducible
          </label>
        </div>

        {form.documentType === "supplier_invoice" ? (
          <section className="purchase-attachments">
            <header>
              <div>
                <h4>Factura original</h4>
                <p>PDF o JPG, hasta 10 MB por archivo.</p>
              </div>
              <span>{attachmentBusy ? "Adjuntando..." : `${attachments.length + pendingAttachments.length} archivo(s)`}</span>
            </header>
            {attachments.length || pendingAttachments.length ? (
              <div className="purchase-attachment-list">
                {[...attachments.map((item) => ({ item, pending: false })), ...pendingAttachments.map((item) => ({ item, pending: true }))].map(({ item, pending }) => (
                  <div className="purchase-attachment-row" key={item.id || item.localId}>
                    <FileText size={18} />
                    <div className="purchase-attachment-info">
                      <strong>{item.fileName}</strong>
                      <span>{attachmentSize(item.fileSize)}</span>
                    </div>
                    {pending ? <span className="purchase-attachment-pending">Se guardará con la factura</span> : null}
                    <div className="purchase-attachment-actions">
                      <button className="icon-button" type="button" title="Descargar" onClick={() => downloadAttachment(item, pending)}><Download size={16} /></button>
                      <button className="icon-button" type="button" title="Quitar adjunto" onClick={() => removeAttachment(item, pending)}><X size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="purchase-attachment-empty">No hay ninguna factura original adjunta.</p>}
          </section>
        ) : null}

        <section className="purchase-lines">
          <header>
            <div>
              <h4>Líneas de compra</h4>
            </div>
            <button className="secondary-button" type="button" onClick={() => addLine()}><Plus size={16} /> Añadir línea</button>
          </header>
          <div className="purchase-line-header" aria-hidden="true">
            <span>Descripción</span><span>Impuesto</span><span>Total</span><span />
          </div>
          {form.lines.map((line, index) => {
            return (
              <div className="purchase-line-row" key={`${index}-${line.id || "new"}`}>
                <input value={line.description} onChange={(event) => updateLine(index, "description", event.target.value)} placeholder="Descripción" aria-label="Descripción" />
                <select
                  value={line.taxCode}
                  onChange={(event) => {
                    const option = PURCHASE_TAX_OPTIONS.find((item) => item.value === event.target.value) || PURCHASE_TAX_OPTIONS[0];
                    setForm((current) => ({
                      ...current,
                      lines: current.lines.map((item, lineIndex) => lineIndex === index
                        ? { ...item, taxCode: option.value, taxRate: option.rate }
                        : item)
                    }));
                  }}
                  aria-label="Impuesto"
                >
                  {PURCHASE_TAX_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <input
                  className="purchase-line-total-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.lineTotal ?? ""}
                  onChange={(event) => updateLine(index, "lineTotal", event.target.value)}
                  placeholder="0,00"
                  aria-label="Total de línea"
                />
                <div className="purchase-line-actions">
                  <button className="icon-button" type="button" onClick={() => addLine(index)} aria-label="Añadir línea"><Plus size={15} /></button>
                  <button className="icon-button" type="button" onClick={() => removeLine(index)} aria-label="Eliminar línea"><X size={15} /></button>
                </div>
              </div>
            );
          })}
        </section>

        <div className="purchase-notes-grid">
          <label>Notas<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
          <label>Notas internas<textarea value={form.internalNotes} onChange={(event) => setForm({ ...form, internalNotes: event.target.value })} /></label>
        </div>
      </fieldset>

      <aside className="purchase-summary" aria-label="Resumen de compra">
        <span>Base imponible <strong>{money(totals.subtotal)}</strong></span>
        <span>IVA <strong>{money(totals.vat)}</strong></span>
        {totals.nonDeductibleVat ? <span>IVA no deducible <strong>{money(totals.nonDeductibleVat)}</strong></span> : null}
        {totals.withholding ? <span>Retenciones <strong>-{money(totals.withholding)}</strong></span> : null}
        {totals.disbursement ? <span>Suplidos <strong>{money(totals.disbursement)}</strong></span> : null}
        <span className="purchase-summary-total">Total <strong>{money(totals.total)}</strong></span>
      </aside>

      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions purchase-form-actions">
        {purchase?.id && canDelete ? <button className="danger-text-button" type="button" onClick={removePurchase}>Eliminar</button> : null}
        <span className="form-actions-spacer" />
        <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button>
        <button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar compra"}</button>
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

function DuplicateAsDocumentModal({ onClose, onDuplicateAsQuote, onDuplicateAsDeliveryNote }) {
  async function run(action) {
    try {
      if (action) await action();
      onClose();
    } catch (err) {
      window.alert(err.message || "No se ha podido duplicar el documento.");
    }
  }

  return (
    <div className="document-actions-backdrop stacked" role="presentation" onMouseDown={onClose}>
      <article className="duplicate-document-modal" role="dialog" aria-modal="true" aria-label="Duplicar como" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h3>Duplicar como...</h3>
          <button className="document-actions-close" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={24} />
          </button>
        </header>
        <button type="button" onClick={() => run(onDuplicateAsQuote)}>
          <span>Presupuesto</span>
          <ChevronRight size={22} />
        </button>
        <button type="button" onClick={() => run(onDuplicateAsDeliveryNote)}>
          <span>Albarán</span>
          <ChevronRight size={22} />
        </button>
      </article>
    </div>
  );
}

function DocumentActionsMenu({
  type,
  onClose,
  onSend,
  onPrint,
  onDownload,
  onModify,
  onDuplicate,
  onDuplicateAsQuote,
  onDuplicateAsDeliveryNote,
  onCreateDeliveryNote,
  onCreateInvoice,
  onDownloadFacturae,
  onRegisterIncome,
  onRegisterPayment,
  onVoid,
  onDelete,
  canModify = true,
  canDelete = true,
  canVoid = false
}) {
  const [duplicateAsOpen, setDuplicateAsOpen] = useState(false);
  const isInvoice = type === "invoice";
  const unavailable = (label) => () => {
    window.alert(`${label} quedará activo cuando este documento esté importado como documento interno del panel.`);
  };
  const exportActions = [
    { label: "Imprimir", action: onPrint || (() => window.print()) },
    { label: "Descargar PDF", action: onDownload || unavailable("Descargar PDF") },
    ...(isInvoice ? [{ label: "Descargar Facturae", action: onDownloadFacturae || unavailable("Descargar Facturae") }] : [])
  ];
  const convertActions = isInvoice
    ? [
        { label: "Duplicar", action: onDuplicate || unavailable("Duplicar") },
        { label: "Duplicar como...", action: () => { setDuplicateAsOpen(true); return false; } }
      ]
    : [
        { label: "Duplicar", action: onDuplicate || unavailable("Duplicar") },
        { label: "Duplicar como presupuesto", action: onDuplicateAsQuote || onDuplicate || unavailable("Duplicar como presupuesto") },
        ...(type === "quote" ? [{ label: "Crear albarán", action: onCreateDeliveryNote || unavailable("Crear albarán") }] : []),
        { label: "Crear factura", action: onCreateInvoice || unavailable("Crear factura") }
      ];
  const documentActions = isInvoice
    ? [
        ...(canModify ? [{ label: "Modificar", action: onModify || unavailable("Modificar") }] : []),
        { label: "Enviar", action: onSend || unavailable("Enviar") },
        { label: "Registrar ingreso", action: onRegisterIncome || unavailable("Registrar ingreso") },
        { label: "Registrar pago", action: onRegisterPayment || unavailable("Registrar pago") },
        ...(canVoid ? [{ label: "Anular", action: onVoid || unavailable("Anular") }] : []),
        ...(canDelete ? [{ label: "Borrar", action: onDelete || unavailable("Borrar"), danger: true }] : [])
      ]
    : [
        ...(canModify ? [{ label: "Modificar", action: onModify || unavailable("Modificar") }] : []),
        { label: "Enviar", action: onSend || unavailable("Enviar") },
        ...(canVoid ? [{ label: "Anular", action: onVoid || unavailable("Anular") }] : []),
        ...(canDelete ? [{ label: "Borrar", action: onDelete || unavailable("Borrar"), danger: true }] : [])
      ];

  async function runAction(action) {
    try {
      const result = action ? await action() : undefined;
      if (result !== false) onClose();
    } catch (err) {
      window.alert(err.message || "No se ha podido completar la acción.");
    }
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
      {duplicateAsOpen ? (
        <DuplicateAsDocumentModal
          onClose={() => setDuplicateAsOpen(false)}
          onDuplicateAsQuote={onDuplicateAsQuote || onDuplicate || unavailable("Duplicar como presupuesto")}
          onDuplicateAsDeliveryNote={onDuplicateAsDeliveryNote || unavailable("Duplicar como albarán")}
        />
      ) : null}
    </>
  );
}

const TRACE_LABELS = {
  quote: "Presupuesto",
  delivery_note: "Albarán",
  invoice: "Factura",
  proforma: "Proforma"
};

function DocumentTrace({ trace = [], currentType, currentId, onOpen }) {
  const visibleTrace = (trace || []).filter((entry) => entry?.id && entry?.type && entry?.number);
  if (!visibleTrace.length) return null;

  return (
    <nav className="document-trace" aria-label="Trazabilidad del documento">
      <span>Trazabilidad</span>
      <div>
        {visibleTrace.map((entry, index) => {
          const isCurrent = entry.type === currentType && entry.id === currentId;
          return (
            <Fragment key={`${entry.type}-${entry.id}`}>
              {index > 0 ? <ChevronRight size={15} /> : null}
              <button
                type="button"
                className={isCurrent ? "active" : ""}
                onClick={() => {
                  if (!isCurrent) onOpen?.(entry);
                }}
              >
                {TRACE_LABELS[entry.type] || "Documento"} {entry.number}
              </button>
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}

function LeadDetailModal({ lead, token, onClose, onSaved }) {
  const [draft, setDraft] = useState(() => leadToDraft(lead));
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState("idle");
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
    setSaveState("saving");
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
      setSaveState("saved");
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      setEditing(false);
      setSaveState("idle");
    } catch (err) {
      setError(err.message);
      setSaveState("idle");
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
              <button className={`secondary-button ${saveState === "saved" ? "save-confirmed" : ""}`} type="button" onClick={saveProfile} disabled={saving || !token}>
                {saving ? "Guardando..." : saveState === "saved" ? <><CheckCircle2 size={16} /> Guardado</> : "Guardar cambios"}
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
  const [saveState, setSaveState] = useState("idle");
  const [viesMessage, setViesMessage] = useState("");
  const [viesChecking, setViesChecking] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const paymentNotificationsAllowed = !["level_1", "level_2"].includes(form.customerLevel);

  async function submit(event) {
    event?.preventDefault();
    setError("");
    setSaveState("saving");
    try {
      const result = await onSubmit({
        ...form,
        contactKind: "client",
        fullName: fullNameFromDraft(form),
        defaultTaxRate: form.taxIdentifierType === "sujeto_pasivo" || form.viesValid ? 0 : form.defaultTaxRate
      });
      setSaveState("saved");
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      onDone?.(result, form);
    } catch (err) {
      setError(err.message);
      setSaveState("idle");
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
        <button className={`primary-button ${saveState === "saved" ? "save-confirmed" : ""}`} type="submit" disabled={saveState === "saving"}>
          {saveState === "saving" ? "Guardando..." : saveState === "saved" ? <><CheckCircle2 size={16} /> Guardado</> : submitLabel}
        </button>
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
  },
  {
    id: "k3-zp-1-5",
    name: "K3+ZP+1,5",
    description: "Kit 340, base plana y 1,5 m de tubo",
    lines: [
      { sku: "K340", quantity: 1, discountPercent: 0 },
      { sku: "ZP340", quantity: 1, discountPercent: 0 },
      { sku: "T3401000", quantity: 1, discountPercent: 0 },
      { sku: "T340500", quantity: 1, discountPercent: 0 }
    ]
  },
  {
    id: "k2-zi-1-5",
    name: "K2+ZI+1,5",
    description: "Kit 240, base inclinada y 1,5 m de tubo",
    lines: [
      { sku: "K240", quantity: 1, discountPercent: 0 },
      { sku: "ZI240", quantity: 1, discountPercent: 0 },
      { sku: "T2401000", quantity: 1, discountPercent: 0 },
      { sku: "T240500", quantity: 1, discountPercent: 0 }
    ]
  },
  {
    id: "k3-zi-1-5",
    name: "K3+ZI+1,5",
    description: "Kit 340, base inclinada y 1,5 m de tubo",
    lines: [
      { sku: "K340", quantity: 1, discountPercent: 0 },
      { sku: "ZI340", quantity: 1, discountPercent: 0 },
      { sku: "T3401000", quantity: 1, discountPercent: 0 },
      { sku: "T340500", quantity: 1, discountPercent: 0 }
    ]
  }
];

function QuotesView({ token }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedPdfTemplate, setSelectedPdfTemplate] = useState("doinglight");
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const quoteSort = useDocumentSort();
  const quotes = useResource(() => apiRequest("/api/sales/quotes?limit=500", { token }), [token]);
  useSalesDocumentSavedRefresh("quote", quotes.reload);
  const leads = useResource(() => apiRequest("/api/sales/leads?limit=500&contactKind=client", { token }), [token]);
  const leadsById = useMemo(() => {
    const map = new Map();
    (leads.data?.items || []).forEach((lead) => map.set(lead.id, lead));
    return map;
  }, [leads.data]);
  const quoteRows = (quotes.data?.items || []).map((quote) => serializeSalesQuote(quote, leadsById));
  const filteredQuotes = quoteRows.filter((quote) => {
    const matchesQuery = textMatchesQuery([quote.number, quote.contact, quote.status, quote.total, quote.detail], query);
    const matchesStatus = statusFilter === "all" || quote.statusKey === statusFilter;
    const matchesDate = documentMatchesDateFilter(quote, dateFilter);
    return matchesQuery && matchesStatus && matchesDate;
  });
  const sortedQuotes = sortDocumentRows(filteredQuotes, quoteSort.sortConfig);
  const quoteRowsList = useIncrementalDocumentRows(
    sortedQuotes.length,
    [query, statusFilter, dateFilter, quoteSort.sortConfig.key, quoteSort.sortConfig.direction].join("|")
  );
  const visibleQuotes = sortedQuotes.slice(0, quoteRowsList.visibleCount);
  const filteredQuoteIds = filteredQuotes.map((quote) => quote.id);
  const allFilteredQuotesSelected = Boolean(filteredQuoteIds.length) && filteredQuoteIds.every((idValue) => selectedQuoteIds.includes(idValue));

  useEffect(() => {
    setSelectedQuoteIds((current) => current.filter((idValue) => filteredQuoteIds.includes(idValue)));
  }, [filteredQuoteIds.join("|")]);

  function openEmptyQuote(pdfTemplate = "doinglight") {
    setSelectedTemplate(null);
    setSelectedPdfTemplate(pdfTemplate);
    setShowForm(true);
  }

  function openTemplateQuote(templateId) {
    const template = QUOTE_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    setSelectedTemplate(template);
    setSelectedPdfTemplate("doinglight");
    setShowForm(true);
  }

  function toggleQuoteSelection(quoteId) {
    setSelectedQuoteIds((current) => (
      current.includes(quoteId)
        ? current.filter((idValue) => idValue !== quoteId)
        : [...current, quoteId]
    ));
  }

  function toggleAllFilteredQuotes() {
    setSelectedQuoteIds(allFilteredQuotesSelected ? [] : filteredQuoteIds);
  }

  async function transferSelectedQuotesToDeliveryNotes() {
    if (!selectedQuoteIds.length) return;
    const blockedQuotes = filteredQuotes.filter((quote) => selectedQuoteIds.includes(quote.id) && isQuoteTransferBlockedStatus(quote.statusKey === "partial" ? "partial" : quote.raw?.item?.status || quote.status));
    if (blockedQuotes.length) {
      window.alert("Uno o varios presupuestos seleccionados ya están traspasados o parcialmente traspasados. No se pueden volver a traspasar.");
      return;
    }

    try {
      await Promise.all(selectedQuoteIds.map((quoteId) =>
        apiRequest(`/api/sales/documents/delivery_note/from-quote/${quoteId}`, {
          token,
          method: "POST",
          body: {}
        })
      ));
      setSelectedQuoteIds([]);
      quotes.reload();
    } catch (err) {
      window.alert(err.message || "No se han podido traspasar los presupuestos seleccionados.");
    }
  }

  async function invoiceSelectedQuotes() {
    if (!selectedQuoteIds.length) return;
    const blockedQuotes = filteredQuotes.filter((quote) => selectedQuoteIds.includes(quote.id) && isQuoteTransferBlockedStatus(quote.statusKey === "partial" ? "partial" : quote.raw?.item?.status || quote.status));
    if (blockedQuotes.length) {
      window.alert("Uno o varios presupuestos seleccionados ya están traspasados o parcialmente traspasados. No se pueden volver a facturar desde presupuesto.");
      return;
    }

    try {
      for (const quoteId of selectedQuoteIds) {
        const deliveryNoteResult = await apiRequest(`/api/sales/documents/delivery_note/from-quote/${quoteId}`, {
          token,
          method: "POST",
          body: {}
        });
        const deliveryNote = deliveryNoteResult.item;
        if (!deliveryNote?.id) throw new Error("No se ha podido crear el albarán previo a la factura.");

        await apiRequest(`/api/sales/documents/invoice/from-document/delivery_note/${deliveryNote.id}`, {
          token,
          method: "POST",
          body: {}
        });
      }
      setSelectedQuoteIds([]);
      quotes.reload();
    } catch (err) {
      window.alert(err.message || "No se han podido facturar los presupuestos seleccionados.");
    }
  }

  async function deleteSelectedQuotes() {
    if (!selectedQuoteIds.length) return;
    if (!window.confirm(`¿Eliminar ${selectedQuoteIds.length} presupuesto${selectedQuoteIds.length === 1 ? "" : "s"} seleccionado${selectedQuoteIds.length === 1 ? "" : "s"}?`)) return;

    try {
      await Promise.all(selectedQuoteIds.map((quoteId) =>
        apiRequest(`/api/sales/quotes/${quoteId}`, {
          token,
          method: "DELETE"
        })
      ));
      setSelectedQuoteIds([]);
      quotes.reload();
    } catch (err) {
      window.alert(err.message || "No se han podido eliminar los presupuestos seleccionados.");
    }
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
          <button className="invoice-new-split single-action" type="button" onClick={() => openEmptyQuote("doinglight")}>
            Nuevo presupuesto
          </button>
          <button
            className="invoice-new-split single-action quote-new-alt-action"
            type="button"
            onClick={() => openEmptyQuote("tubo-solar")}
            title="Nuevo presupuesto con plantilla Tubo Solar"
          >
            Nuevo presupuesto
          </button>
        </div>
      </header>

      {quotes.error || leads.error ? <p className="form-error">{quotes.error || leads.error}</p> : null}
      <section className="module-panel invoices-list-panel quotes-list-panel">
        <div className="invoice-toolbar">
          <div className="module-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar..." />
          </div>
          <DocumentDateFilter value={dateFilter} onChange={setDateFilter} />
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
        {selectedQuoteIds.length ? (
          <div className="document-selection-actions" aria-live="polite">
            <span className="selection-count">
              {selectedQuoteIds.length} presupuesto{selectedQuoteIds.length === 1 ? "" : "s"} seleccionado{selectedQuoteIds.length === 1 ? "" : "s"}
            </span>
            <button className="bulk-document-action" type="button" onClick={transferSelectedQuotesToDeliveryNotes}>
              Traspasar a albarán
            </button>
            <button className="bulk-document-action" type="button" onClick={invoiceSelectedQuotes}>
              Facturar
            </button>
            <button className="bulk-document-action danger" type="button" onClick={deleteSelectedQuotes}>
              Eliminar
            </button>
          </div>
        ) : null}
        <div className="table-wrap invoice-table-wrap" onScroll={quoteRowsList.handleTableScroll}>
          <table className="module-table invoice-table quotes-table">
            <thead>
              <tr>
                <th className="select-column">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos los presupuestos"
                    checked={allFilteredQuotesSelected}
                    onChange={toggleAllFilteredQuotes}
                  />
                </th>
                <th className="invoice-kind-column"></th>
                <SortableDocumentHeader sortKey="date" sortConfig={quoteSort.sortConfig} onSort={quoteSort.requestSort}>Fecha</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="status" sortConfig={quoteSort.sortConfig} onSort={quoteSort.requestSort}>Estado</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="number" sortConfig={quoteSort.sortConfig} onSort={quoteSort.requestSort}>Serie / Núm.</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="contact" sortConfig={quoteSort.sortConfig} onSort={quoteSort.requestSort}>Cliente / Detalle</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="subtotal" sortConfig={quoteSort.sortConfig} onSort={quoteSort.requestSort}>Subtotal</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="total" sortConfig={quoteSort.sortConfig} onSort={quoteSort.requestSort}>Total</SortableDocumentHeader>
                <SortableDocumentHeader sortKey="currency" sortConfig={quoteSort.sortConfig} onSort={quoteSort.requestSort}>Moneda</SortableDocumentHeader>
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
              {visibleQuotes.map((quote) => (
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
                      checked={selectedQuoteIds.includes(quote.id)}
                      onChange={() => toggleQuoteSelection(quote.id)}
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
              <DocumentLoadMoreRow
                colSpan={9}
                visibleCount={quoteRowsList.visibleCount}
                totalRows={sortedQuotes.length}
                onLoadMore={quoteRowsList.loadMoreRows}
              />
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
            visualTemplate={selectedPdfTemplate}
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

const SALES_DOCUMENT_FORM_META = {
  quote: {
    type: "quote",
    title: "Presupuesto",
    eyebrow: "Presupuesto",
    createLabel: "Guardar presupuesto",
    updateLabel: "Guardar cambios",
    endpoint: "/api/sales/quotes",
    listView: "quotes",
    pdfPrefix: "Presupuesto",
    subject: "Envío presupuesto",
    body: "Estimado cliente:\n\nAdjunto a este correo encontrará nuestro presupuesto.\n\nSi tiene cualquier consulta, no dude en contactar con nosotros."
  },
  proforma: {
    type: "proforma",
    title: "Factura Proforma",
    eyebrow: "Factura Proforma",
    createLabel: "Crear proforma",
    updateLabel: "Guardar cambios",
    endpoint: "/api/sales/documents/proforma",
    listView: "proformas",
    pdfPrefix: "Factura-Proforma",
    subject: "Envío factura proforma",
    body: "Estimado cliente:\n\nAdjunto a este correo encontrará nuestra factura proforma.\n\nSi tiene cualquier consulta, no dude en contactar con nosotros."
  },
  delivery_note: {
    type: "delivery_note",
    title: "Albarán",
    eyebrow: "Albarán",
    createLabel: "Crear albarán",
    updateLabel: "Guardar cambios",
    endpoint: "/api/sales/documents/delivery_note",
    listView: "delivery-notes",
    pdfPrefix: "Albaran",
    subject: "Envío albarán",
    body: "Estimado cliente:\n\nAdjunto a este correo encontrará nuestro albarán.\n\nSi tiene cualquier consulta, no dude en contactar con nosotros."
  },
  invoice: {
    type: "invoice",
    title: "Factura simplificada",
    eyebrow: "Factura de venta",
    createLabel: "Crear factura",
    updateLabel: "Guardar cambios",
    endpoint: "/api/sales/documents/invoice",
    listView: "invoices",
    pdfPrefix: "Factura",
    subject: "Envío factura",
    body: "Estimado cliente:\n\nAdjunto a este correo encontrará nuestra factura.\n\nSi tiene cualquier consulta, no dude en contactar con nosotros."
  }
};

function documentFormMeta(documentType) {
  return SALES_DOCUMENT_FORM_META[documentType] || SALES_DOCUMENT_FORM_META.quote;
}

function QuoteEditorModal({ token, quote, documentType = "quote", onClose, onDone, onUpdated }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [activeDocument, setActiveDocument] = useState(() => ({
    id: quote.id,
    number: quote.number || quote.quoteNumber || quote.documentNumber || "",
    documentType
  }));
  const meta = documentFormMeta(activeDocument.documentType);
  const detail = useResource(() => apiRequest(`${meta.endpoint}/${activeDocument.id}`, { token }), [token, activeDocument.id, meta.endpoint]);
  const item = detail.data?.item || null;
  const quoteActionsRef = useRef({});
  const finish = onDone || onUpdated || onClose;
  const itemStatus = String(item?.status || "").toLowerCase();
  const isTransferBlockedQuote =
    activeDocument.documentType === "quote" && isQuoteTransferBlockedStatus(itemStatus);
  const isLockedDeliveryNote = activeDocument.documentType === "delivery_note" && (
    itemStatus.includes("factur") ||
    itemStatus.includes("invoice") ||
    itemStatus.includes("void") ||
    itemStatus.includes("anulad") ||
    itemStatus.includes("cancel")
  );
  const documentLocked = isLockedDeliveryNote;
  const documentNumber = item?.quoteNumber || item?.documentNumber || activeDocument.number || quote.number;
  const lockMessage = isLockedDeliveryNote
    ? itemStatus.includes("invoice") || itemStatus.includes("factur")
      ? "Albarán facturado. No se puede modificar ni eliminar."
      : "Albarán anulado. No se puede modificar ni eliminar."
    : "";

  function openQuoteSendFromMenu() {
    if (!quoteActionsRef.current.openSend) throw new Error("Todavía no se ha cargado el presupuesto.");
    quoteActionsRef.current.openSend();
  }

  function modifyQuoteFromMenu() {
    if (!quoteActionsRef.current.focusForEdit) throw new Error("Todavía no se ha cargado el presupuesto.");
    quoteActionsRef.current.focusForEdit();
  }

  function downloadQuoteFromMenu() {
    if (!quoteActionsRef.current.downloadPdf) throw new Error("Todavía no se ha cargado el PDF del presupuesto.");
    return quoteActionsRef.current.downloadPdf();
  }

  function printQuoteFromMenu() {
    if (!quoteActionsRef.current.printPdf) throw new Error("Todavía no se ha cargado el PDF del presupuesto.");
    quoteActionsRef.current.printPdf();
  }

  async function duplicateQuoteFromMenu() {
    const buildPayload = quoteActionsRef.current.buildPayload;
    if (!buildPayload) throw new Error("Todavía no se ha cargado el documento.");

    await apiRequest(meta.endpoint, {
      token,
      method: "POST",
      body: buildPayload({ status: "draft" })
    });
    finish();
  }

  async function duplicateAsQuoteFromMenu() {
    const buildPayload = quoteActionsRef.current.buildPayload;
    if (!buildPayload) throw new Error("Todavía no se ha cargado el documento.");

    await apiRequest("/api/sales/quotes", {
      token,
      method: "POST",
      body: buildPayload({ status: "draft" })
    });
    finish();
  }

  async function createDocumentFromCurrent(targetType) {
    if (activeDocument.documentType === targetType) {
      return duplicateQuoteFromMenu();
    }

    const endpoint = activeDocument.documentType === "quote"
      ? `/api/sales/documents/${targetType}/from-quote/${activeDocument.id}`
      : `/api/sales/documents/${targetType}/from-document/${activeDocument.documentType}/${activeDocument.id}`;
    await apiRequest(endpoint, { token, method: "POST", body: {} });
    finish();
  }

  function createInvoiceFromQuote() {
    return createDocumentFromCurrent("invoice");
  }

  function createDeliveryNoteFromQuote() {
    return createDocumentFromCurrent("delivery_note");
  }

  function duplicateAsDeliveryNoteFromMenu() {
    return createDocumentFromCurrent("delivery_note");
  }

  async function deleteQuoteFromMenu() {
    if (!window.confirm(`¿Borrar ${meta.title.toLowerCase()} ${documentNumber}? Esta acción no se puede deshacer.`)) {
      return false;
    }

    await apiRequest(`${meta.endpoint}/${activeDocument.id}`, { token, method: "DELETE" });
    finish();
  }

  async function voidDocumentFromMenu() {
    if (!window.confirm(`¿Anular ${meta.title.toLowerCase()} ${documentNumber}?`)) {
      return false;
    }

    await apiRequest(`${meta.endpoint}/${activeDocument.id}/void`, { token, method: "POST" });
    finish();
  }

  function openTraceDocument(entry) {
    setActionsOpen(false);
    setActiveDocument({
      id: entry.id,
      number: entry.number,
      documentType: entry.type
    });
  }

  return (
    <ModalShell
      title={`${meta.title} ${documentNumber}`}
      eyebrow={`Editar ${meta.title.toLowerCase()}`}
      size="wide-modal quote-work-modal"
      onClose={onClose}
      actions={(
        <>
          <button className="document-actions-trigger" type="button" onClick={() => setActionsOpen(true)} aria-label={`Opciones de ${meta.title.toLowerCase()}`}>
            <MoreVertical size={22} />
          </button>
          {actionsOpen ? (
            <DocumentActionsMenu
              type={activeDocument.documentType === "delivery_note" ? "delivery_note" : activeDocument.documentType}
              onClose={() => setActionsOpen(false)}
              onSend={openQuoteSendFromMenu}
              onPrint={printQuoteFromMenu}
              onDownload={downloadQuoteFromMenu}
              onModify={documentLocked ? null : modifyQuoteFromMenu}
              onDuplicate={duplicateQuoteFromMenu}
              onDuplicateAsQuote={duplicateAsQuoteFromMenu}
              onDuplicateAsDeliveryNote={duplicateAsDeliveryNoteFromMenu}
              onCreateDeliveryNote={isTransferBlockedQuote ? null : createDeliveryNoteFromQuote}
              onCreateInvoice={createInvoiceFromQuote}
              onVoid={voidDocumentFromMenu}
              onDelete={deleteQuoteFromMenu}
              canModify={!documentLocked}
              canDelete={activeDocument.documentType !== "delivery_note" && !isTransferBlockedQuote && !documentLocked}
              canVoid={activeDocument.documentType === "delivery_note" && !documentLocked}
            />
          ) : null}
        </>
      )}
    >
      {detail.error ? <p className="form-error">{detail.error}</p> : null}
      {detail.loading ? <p className="muted-text">Cargando documento...</p> : null}
      {item ? (
        <QuoteForm
          key={item.id}
          token={token}
          documentType={activeDocument.documentType}
          initialQuote={item}
          onCancel={onClose}
          onDone={finish}
          actionsRef={quoteActionsRef}
          readOnly={documentLocked}
          lockMessage={lockMessage}
          onOpenTrace={openTraceDocument}
        />
      ) : null}
    </ModalShell>
  );
}

function PaymentMethodSelector({ value, methods, selectedLead, onChange, onSaveMethod }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customMethod, setCustomMethod] = useState({ name: "", bank: "" });
  const [sepaMethod, setSepaMethod] = useState(() => ({
    contact: selectedLead?.companyName || selectedLead?.fullName || "",
    iban: "",
    name: "Recibo domiciliado",
    mandateReference: generateMandateReference(),
    mandateType: "CORE (Básico)",
    paymentType: "Pago periódico",
    bicSwift: "",
    signedAt: inputDate(new Date())
  }));
  const filteredMethods = useMemo(() => {
    const source = normalizePaymentMethods({ items: methods });
    if (!query.trim()) return source;
    return source.filter((method) => textMatchesQuery([method.name, method.detail], query));
  }, [methods, query]);

  function openCreation(kind) {
    setError("");
    setOpen(false);
    if (kind === "sepa") {
      setSepaMethod((current) => ({
        ...current,
        contact: selectedLead?.companyName || selectedLead?.fullName || current.contact || "",
        mandateReference: current.mandateReference || generateMandateReference(),
        signedAt: current.signedAt || inputDate(new Date())
      }));
    }
    setModal(kind);
  }

  async function saveMethod(method) {
    setSaving(true);
    setError("");
    try {
      await onSaveMethod(method);
      onChange(paymentMethodLabel(method));
      setModal("");
    } catch (err) {
      setError(err.message || "No se ha podido guardar el método de pago.");
    } finally {
      setSaving(false);
    }
  }

  function saveCustomMethod() {
    const name = customMethod.name.trim();
    if (!name) {
      setError("Indica un nombre para este método de pago.");
      return;
    }
    saveMethod({
      id: `custom-${Date.now()}`,
      type: "custom",
      name,
      detail: customMethod.bank.trim()
    });
  }

  function saveSepaMethod() {
    if (!sepaMethod.iban.trim()) {
      setError("Indica el IBAN del cliente.");
      return;
    }
    saveMethod({
      id: `sepa-${Date.now()}`,
      type: "sepa",
      name: sepaMethod.name.trim() || "Recibo domiciliado",
      detail: [sepaMethod.iban.trim(), sepaMethod.contact.trim()].filter(Boolean).join(" · "),
      iban: sepaMethod.iban.trim(),
      bicSwift: sepaMethod.bicSwift.trim(),
      mandateReference: sepaMethod.mandateReference.trim(),
      mandateType: sepaMethod.mandateType,
      paymentType: sepaMethod.paymentType,
      signedAt: sepaMethod.signedAt
    });
  }

  return (
    <div className="payment-method-field">
      <span>Método de pago</span>
      <div className="payment-method-picker">
        <button className="payment-method-trigger" type="button" onClick={() => setOpen((current) => !current)}>
          <span>{value || "Sin definir"}</span>
          <ChevronDown size={17} />
        </button>
        {open ? (
          <div className="payment-method-menu">
            <div className="payment-method-menu-search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Escribe para buscar..." autoFocus />
            </div>
            <button className="payment-method-create-row" type="button" onClick={() => openCreation("sepa")}>
              <Plus size={18} />
              <span>
                <strong>Nueva domiciliación SEPA</strong>
                <small>Cobro automático desde la cuenta bancaria del cliente</small>
              </span>
            </button>
            <button className="payment-method-create-row" type="button" onClick={() => openCreation("custom")}>
              <Plus size={18} />
              <span>
                <strong>Nuevo método de pago</strong>
                <small>Método de pago personalizado (efectivo, cheque, etc.)</small>
              </span>
            </button>
            <div className="payment-method-menu-title">Métodos de pago habituales</div>
            <div className="payment-method-options">
              {filteredMethods.map((method) => (
                <button
                  key={method.id}
                  className={paymentMethodLabel(method) === value ? "payment-method-option active" : "payment-method-option"}
                  type="button"
                  onClick={() => {
                    onChange(paymentMethodLabel(method));
                    setOpen(false);
                  }}
                >
                  <strong>{method.name}</strong>
                  {method.detail ? <small>{method.detail}</small> : null}
                </button>
              ))}
              {!filteredMethods.length ? <p>No hay métodos con esa búsqueda.</p> : null}
            </div>
          </div>
        ) : null}
      </div>
      {error && !modal ? <small className="form-error">{error}</small> : null}
      {modal === "custom" ? (
        <ModalShell title="Método de pago" eyebrow="Nuevo método" size="payment-modal" onClose={() => setModal("")}>
          <div className="payment-method-modal-form">
            <label>
              <span>Nombre</span>
              <input
                value={customMethod.name}
                onChange={(event) => setCustomMethod({ ...customMethod, name: event.target.value })}
                placeholder="Indica un nombre para este método de pago"
                autoFocus
              />
            </label>
            <label>
              <span>Banco de ingreso</span>
              <select value={customMethod.bank} onChange={(event) => setCustomMethod({ ...customMethod, bank: event.target.value })}>
                <option value="">Sin banco asociado</option>
                {PAYMENT_BANK_OPTIONS.map((bank) => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={() => setModal("")}>Cerrar</button>
              <button className="primary-button" type="button" onClick={saveCustomMethod} disabled={saving}>
                {saving ? "Guardando..." : "Guardar y cerrar"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
      {modal === "sepa" ? (
        <ModalShell title="Mandato SEPA (Autorización de remesa bancaria)" eyebrow="Nueva domiciliación" size="payment-modal sepa-payment-modal" onClose={() => setModal("")}>
          <div className="payment-method-modal-form">
            <label>
              <span>Contacto</span>
              <input value={sepaMethod.contact} onChange={(event) => setSepaMethod({ ...sepaMethod, contact: event.target.value })} placeholder="Contacto" />
              <small>El contacto de este método de pago no se puede cambiar. Si necesitas cambiarlo, crea otro método asociado al contacto deseado.</small>
            </label>
            <label>
              <span>IBAN</span>
              <input value={sepaMethod.iban} onChange={(event) => setSepaMethod({ ...sepaMethod, iban: event.target.value.toUpperCase() })} placeholder="IBAN (Cuenta bancaria de tu cliente)" />
            </label>
            <label>
              <span>Nombre</span>
              <input value={sepaMethod.name} onChange={(event) => setSepaMethod({ ...sepaMethod, name: event.target.value })} />
            </label>
            <label>
              <span>Referencia del mandato</span>
              <input value={sepaMethod.mandateReference} onChange={(event) => setSepaMethod({ ...sepaMethod, mandateReference: event.target.value.toUpperCase() })} />
            </label>
            <label>
              <span>Tipo de mandato</span>
              <select value={sepaMethod.mandateType} onChange={(event) => setSepaMethod({ ...sepaMethod, mandateType: event.target.value })}>
                <option value="CORE (Básico)">CORE (Básico) · Cobros a consumidores, empresas o autónomos</option>
                <option value="B2B">B2B · Cobros entre empresas</option>
              </select>
            </label>
            <label>
              <span>Tipo de pago</span>
              <select value={sepaMethod.paymentType} onChange={(event) => setSepaMethod({ ...sepaMethod, paymentType: event.target.value })}>
                <option value="Pago periódico">Pago periódico · Vas a realizar periódicamente cobros a este cliente</option>
                <option value="Pago único">Pago único</option>
              </select>
            </label>
            <label>
              <span>BIC/SWIFT</span>
              <input value={sepaMethod.bicSwift} onChange={(event) => setSepaMethod({ ...sepaMethod, bicSwift: event.target.value.toUpperCase() })} placeholder="BIC/SWIFT (Banco de tu cliente)" />
              <small>El código BIC o SWIFT completa la información del IBAN. Déjalo en blanco si no lo conoces.</small>
            </label>
            <label>
              <span>Fecha de la firma del mandato</span>
              <input type="date" value={sepaMethod.signedAt} onChange={(event) => setSepaMethod({ ...sepaMethod, signedAt: event.target.value })} />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={() => setModal("")}>Cerrar</button>
              <button className="primary-button" type="button" onClick={saveSepaMethod} disabled={saving}>
                {saving ? "Guardando..." : "Guardar y cerrar"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
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

function QuoteForm({ token, onDone, onCancel, template, initialQuote, actionsRef, documentType = "quote", readOnly = false, lockMessage = "", onOpenTrace, visualTemplate = "doinglight" }) {
  const currentUser = readSession()?.user || null;
  const meta = documentFormMeta(documentType);
  const isQuote = documentType === "quote";
  const isInvoice = documentType === "invoice";
  const isDeliveryNote = documentType === "delivery_note";
  const isProforma = documentType === "proforma";
  const statusOptions = isInvoice ? INVOICE_STATUS_OPTIONS : QUOTE_STATUS_OPTIONS;
  const [savedDocument, setSavedDocument] = useState(initialQuote || null);
  const currentDocument = savedDocument || initialQuote || null;
  const [selectedOwnerUserId, setSelectedOwnerUserId] = useState(initialQuote?.ownerUserId || currentUser?.id || "");
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [pdfTemplate, setPdfTemplate] = useState(
    () => currentDocument?.pdfTemplate || currentDocument?.visualTemplate || currentDocument?.metadata?.pdfTemplate || visualTemplate || "doinglight"
  );
  const documentTitle = meta.title;
  const documentEyebrow = meta.eyebrow;
  const createButtonLabel = currentDocument ? meta.updateLabel : meta.createLabel;
  const [clientMode, setClientMode] = useState("existing");
  const [selectedLeadId, setSelectedLeadId] = useState(initialQuote?.leadId || "");
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [leadSearchTouched, setLeadSearchTouched] = useState(false);
  const [selectedLeadSnapshot, setSelectedLeadSnapshot] = useState(null);
  const [leadDraft, setLeadDraft] = useState(null);
  const [leadEditorOpen, setLeadEditorOpen] = useState(false);
  const [leadSaveStatus, setLeadSaveStatus] = useState("");
  const [leadSaving, setLeadSaving] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [quoteViesMessage, setQuoteViesMessage] = useState("");
  const [quoteViesChecking, setQuoteViesChecking] = useState(false);
  const normalizedLeadSearch = leadSearchQuery.trim();
  const leads = useResource(
    () => apiRequest(`/api/sales/leads?limit=100&contactKind=client&q=${encodeURIComponent(normalizedLeadSearch)}`, { token }),
    [token, normalizedLeadSearch]
  );
  const assignableUsers = useResource(() => apiRequest("/api/sales/users", { token }), [token]);
  const paymentSettings = useResource(() => apiRequest("/api/settings", { token }), [token]);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [documentPicker, setDocumentPicker] = useState(null);
  const [transferLinesOpen, setTransferLinesOpen] = useState(false);
  const [transferLineIds, setTransferLineIds] = useState([]);
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
        manualTotal: null,
        customNote: line.customNote || line.productSnapshot?.customNote || "",
        customNoteOpen: Boolean(line.customNote || line.productSnapshot?.customNote)
      }));
    }

    if (template?.lines?.length) {
      return template.lines.map((line) => ({
        id: crypto.randomUUID(),
        skuQuery: line.sku,
        sku: line.sku,
        quantity: line.quantity || 1,
        discountPercent: line.discountPercent || 0,
        manualTotal: null,
        customNote: line.customNote || "",
        customNoteOpen: Boolean(line.customNote)
      }));
    }

    return [{ id: crypto.randomUUID(), skuQuery: "", sku: "", quantity: 1, discountPercent: 0, manualTotal: null, customNote: "", customNoteOpen: false }];
  });
  const [templatePicker, setTemplatePicker] = useState(template?.id || "");
  const [draggingLineId, setDraggingLineId] = useState("");
  const [taxRate, setTaxRate] = useState(() => taxModeFromDocument(initialQuote || { taxMode: "21" }));
  const [notes, setNotes] = useState(initialQuote?.notes || "");
  const [quoteStatus, setQuoteStatus] = useState(() => (
    isInvoice
      ? invoicePaymentState({ status: initialQuote?.status }, Number(initialQuote?.total || 0), initialQuote?.status).key
      : initialQuote?.status || "draft"
  ));
  const [quoteDate, setQuoteDate] = useState(inputDate(initialQuote?.issueDate || initialQuote?.createdAt || new Date()));
  const [validUntil, setValidUntil] = useState(initialQuote?.dueDate ? inputDate(initialQuote.dueDate) : addDaysInput(initialQuote?.issueDate || initialQuote?.createdAt || new Date(), 30));
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
  const ownerUsers = assignableUsers.data?.items || [];
  const selectedOwner = ownerUsers.find((user) => user.id === selectedOwnerUserId);
  const selectedOwnerName = selectedOwner?.fullName
    || currentDocument?.ownerFullName
    || currentUser?.fullName
    || currentUser?.email
    || "Sin asignar";

  useEffect(() => {
    const nextOwnerId = currentDocument?.ownerUserId || currentUser?.id || "";
    if (nextOwnerId) setSelectedOwnerUserId(nextOwnerId);
  }, [currentDocument?.ownerUserId, currentUser?.id]);

  useEffect(() => {
    const persistedLeadId = currentDocument?.leadId || initialQuote?.leadId || "";
    if (persistedLeadId) setSelectedLeadId((current) => current || persistedLeadId);
  }, [currentDocument?.leadId, initialQuote?.leadId]);

  const leadsList = leads.data?.items || [];
  const paymentMethods = useMemo(
    () => normalizePaymentMethods(paymentSettings.data?.item?.paymentMethods),
    [paymentSettings.data]
  );
  const leadOptionLabel = (lead) =>
    `${lead.fullName}${lead.companyName ? ` · ${lead.companyName}` : ""}${lead.taxId ? ` · ${lead.taxId}` : ""}`;
  const selectedLead = (selectedLeadSnapshot?.id === selectedLeadId ? selectedLeadSnapshot : null) || leadsList.find((lead) => lead.id === selectedLeadId) || null;
  const effectiveLeadId = selectedLeadId || selectedLeadSnapshot?.id || currentDocument?.leadId || initialQuote?.leadId || "";
  const selectedLeadDefaultDiscount = Number(selectedLead?.defaultDiscountPercent || 0);
  const filteredLeadSuggestions = useMemo(() => {
    const needle = normalizeSearchText(leadSearchQuery);
    const source = needle
      ? leadsList.filter((lead) =>
          textMatchesQuery([
            lead.fullName,
            lead.companyName,
            lead.email,
            lead.phone,
            lead.mobilePhone,
            lead.taxId,
            lead.address,
            lead.postalCode,
            lead.town,
            lead.city,
            lead.province,
            lead.country
          ], leadSearchQuery)
        )
      : leadsList;

    return source.slice(0, 20);
  }, [leadsList, leadSearchQuery]);
  const leadBillingSource = leadDraft || selectedLead;
  const billingData = selectedLead
    ? [
        leadBillingSource.fullName || leadBillingSource.companyName,
        [leadBillingSource.address, leadBillingSource.postalCode, leadBillingSource.city || leadBillingSource.town, leadBillingSource.province].filter(Boolean).join(" "),
        leadBillingSource.country
      ].filter(Boolean).join("\n")
    : "Sin datos de facturación";
  const selectedStatusLabel = statusOptions.find((status) => status.value === quoteStatus)?.label
    || (isInvoice
      ? invoicePaymentState({ status: quoteStatus }, Number(currentDocument?.total || 0), quoteStatus).label
      : quoteStatusState(quoteStatus).label)
    || "Pendiente";
  const selectedQuoteLanguageLabel = QUOTE_LANGUAGE_OPTIONS.find((language) => language.value === quoteLanguage)?.label || "Español";
  const quotePdfText = QUOTE_PDF_TEXT[quoteLanguage] || QUOTE_PDF_TEXT.es;
  const quoteTransferBlocked = isQuote && isQuoteTransferBlockedStatus(quoteStatus || currentDocument?.status);
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
    if (selectedLead.taxIdentifierType === "sujeto_pasivo") {
      setTaxRate(REVERSE_CHARGE_TAX_CODE);
    } else if (selectedLead.viesValid) {
      setTaxRate("0");
    } else if (selectedLead.defaultTaxRate !== null && selectedLead.defaultTaxRate !== undefined) {
      setTaxRate(taxOptionFromMode(selectedLead.defaultTaxRate).value);
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
      setLeadEditorOpen(false);
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
    setLeadEditorOpen(false);
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
        setTaxRate("0");
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
      window.setTimeout(() => setLeadSaveStatus(""), 1800);
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
    return {
      id: crypto.randomUUID(),
      skuQuery: "",
      sku: "",
      quantity: 1,
      discountPercent: selectedLeadDefaultDiscount,
      manualTotal: null,
      customNote: "",
      customNoteOpen: false
    };
  }

  function applyQuoteTemplate(templateId) {
    setTemplatePicker(templateId);
    const selectedTemplateItem = QUOTE_TEMPLATES.find((item) => item.id === templateId);
    if (!selectedTemplateItem) return;

    setLines(selectedTemplateItem.lines.map((line) => ({
      id: crypto.randomUUID(),
      skuQuery: line.sku,
      sku: line.sku,
      quantity: line.quantity || 1,
      discountPercent: Number(line.discountPercent) > 0
        ? Number(line.discountPercent)
        : selectedLeadDefaultDiscount,
      manualTotal: null,
      customNote: line.customNote || "",
      customNoteOpen: Boolean(line.customNote)
    })));
  }

  function addLine(focus = false, afterLineId = null) {
    const nextLine = createEmptyLine();
    setLines((current) => {
      if (!afterLineId) return [...current, nextLine];
      const index = current.findIndex((line) => line.id === afterLineId);
      if (index < 0) return [...current, nextLine];
      return [...current.slice(0, index + 1), nextLine, ...current.slice(index + 1)];
    });
    if (focus) {
      window.setTimeout(() => lineReferenceRefs.current[nextLine.id]?.focus(), 0);
    }
  }

  function openTransferLines() {
    if (quoteTransferBlocked) {
      window.alert("Este presupuesto ya está traspasado y no se puede volver a traspasar.");
      return;
    }

    setTransferLineIds(lines.filter((line) => line.sku).map((line) => line.id));
    setTransferLinesOpen(true);
  }

  function toggleTransferLine(lineId) {
    setTransferLineIds((current) => (
      current.includes(lineId)
        ? current.filter((idValue) => idValue !== lineId)
        : [...current, lineId]
    ));
  }

  async function confirmTransferLines() {
    if (quoteTransferBlocked) {
      window.alert("Este presupuesto ya está traspasado y no se puede volver a traspasar.");
      return;
    }

    if (!transferLineIds.length) {
      window.alert("Selecciona al menos una línea para traspasar.");
      return;
    }

    if (!isQuote || !currentDocument?.id) {
      window.alert("Guarda primero el presupuesto para poder traspasar líneas con trazabilidad.");
      return;
    }

    try {
      await apiRequest(`/api/sales/documents/delivery_note/from-quote/${currentDocument.id}`, {
        token,
        method: "POST",
        body: {
          lineIds: transferLineIds,
          dueDate: validUntil,
          paymentMethod,
          leadId: effectiveLeadId || null
        }
      });
      setTransferLinesOpen(false);
      onDone();
    } catch (err) {
      window.alert(err.message || "No se ha podido crear el albarán.");
    }
  }

  async function createInvoiceFromDeliveryNote() {
    if (!isDeliveryNote || !currentDocument?.id) {
      window.alert("Guarda primero el albarán para poder facturarlo con trazabilidad.");
      return;
    }

    try {
      await apiRequest(`/api/sales/documents/invoice/from-document/delivery_note/${currentDocument.id}`, {
        token,
        method: "POST",
        body: { leadId: effectiveLeadId || null }
      });
      onDone();
    } catch (err) {
      window.alert(err.message || "No se ha podido crear la factura.");
    }
  }

  async function invoiceQuoteDirectly() {
    if (quoteTransferBlocked) {
      window.alert("Este presupuesto ya está traspasado y no se puede facturar de nuevo desde el presupuesto.");
      return;
    }

    if (!isQuote || !currentDocument?.id) {
      window.alert("Guarda primero el presupuesto para poder facturarlo con trazabilidad.");
      return;
    }

    try {
      const deliveryNoteResult = await apiRequest(`/api/sales/documents/delivery_note/from-quote/${currentDocument.id}`, {
        token,
        method: "POST",
        body: {
          dueDate: validUntil,
          paymentMethod,
          leadId: effectiveLeadId || null
        }
      });
      const deliveryNote = deliveryNoteResult.item;
      if (!deliveryNote?.id) throw new Error("No se ha podido crear el albarán previo a la factura.");

      await apiRequest(`/api/sales/documents/invoice/from-document/delivery_note/${deliveryNote.id}`, {
        token,
        method: "POST",
        body: { leadId: deliveryNote.leadId || effectiveLeadId || null }
      });
      onDone();
    } catch (err) {
      window.alert(err.message || "No se ha podido facturar el presupuesto.");
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
  const activeTaxOption = taxOptionFromMode(taxRate);
  const activeTaxRate = taxRateFromTaxMode(taxRate);
  const reverseCharge = isReverseChargeTaxMode(taxRate);
  const taxTotal = subtotal * (activeTaxRate / 100);
  const total = subtotal + taxTotal;
  const quoteNumberLabel = currentDocument?.quoteNumber || currentDocument?.documentNumber || currentDocument?.number || "borrador";
  const quotePdfName = `${meta.pdfPrefix}-${safeFilePart(quoteDate || inputDate(new Date()))}-${safeFilePart(quoteNumberLabel)}.pdf`;
  const quotePdfElementId = `quote-pdf-${safeFilePart(quoteNumberLabel)}-${safeFilePart(quoteDate || "borrador")}`;
  const pdfDocumentType = documentType === "delivery_note" ? "delivery-note" : documentType;
  const quotePdfLines = lines.map((line) => {
    const selectedProduct = productForLine(line);
    const quantity = Number(line.quantity || 0);
    const lineAmount = lineTotal(line);
    const unitPrice = quantity ? lineAmount / quantity : lineAmount;
    const lineImageUrl =
      getProductImage(selectedProduct) ||
      line.imageUrl ||
      line.mainImageUrl ||
      line.productSnapshot?.mainImageUrl ||
      line.productSnapshot?.media?.[0]?.url ||
      "";
    return {
      code: line.skuQuery || line.sku || "-",
      concept: selectedProduct?.title || selectedProduct?.shortDescription || "Producto pendiente",
      customNote: String(line.customNote || "").trim(),
      imageUrl: imageUrlForDisplay(lineImageUrl, 220),
      quantity,
      price: unitPrice,
      discount: Number(line.discountPercent || 0),
      total: lineAmount
    };
  });

  function buildDefaultSendDraft() {
    return {
      to: splitEmailRecipients(leadDraft?.email || selectedLead?.email || ""),
      from: "ADMINISTRACION <administracion@doinglight.es>",
      subject: quoteNumberLabel !== "borrador" ? `${meta.subject} ${quoteNumberLabel}` : meta.subject,
      body: meta.body,
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

  async function downloadQuotePdf() {
    setSendStatus("Generando PDF...");
    try {
      await renderDocumentElementAsPdf(quotePdfElementId, quotePdfName);
      setSendStatus("");
    } catch (err) {
      setSendStatus(err.message);
    }
  }

  function printQuotePdf() {
    try {
      printDocumentElement(quotePdfElementId, quotePdfName);
    } catch (err) {
      setSendStatus(err.message);
    }
  }

  async function prepareSend(event) {
    event.preventDefault();
    setSendStatus("Generando y enviando PDF...");
    try {
      const recipients = splitEmailRecipients(sendDraft.to);
      if (!recipients.length) throw new Error("Indica al menos un correo de destino.");
      const invalidRecipients = recipients.filter((item) => !isValidEmailRecipient(item));
      if (invalidRecipients.length) throw new Error(`Revisa los correos de destino: ${invalidRecipients.join(", ")}`);
      const pdfBase64 = sendDraft.attachPdf
        ? await renderDocumentElementAsPdf(quotePdfElementId, quotePdfName, { save: false })
        : "";
      await apiRequest("/api/quotes/documents/send", {
        token,
        method: "POST",
        body: {
          documentType,
          documentNumber: quoteNumberLabel,
          language: quoteLanguage,
          to: recipients,
          from: sendDraft.from,
          subject: sendDraft.subject,
          body: sendDraft.body,
          filename: quotePdfName,
          pdfBase64
        }
      });
      setSendStatus("Correo enviado correctamente.");
    } catch (err) {
      setSendStatus(err.message);
    }
  }

  function buildQuotePayload(overrides = {}) {
    return {
      locale: quoteLanguage || "es",
      leadId: effectiveLeadId || null,
      ownerUserId: selectedOwnerUserId || currentUser?.id || null,
      status: isInvoice ? invoicePaymentState({ status: quoteStatus }, total, quoteStatus).key : quoteStatus,
      issueDate: quoteDate,
      dueDate: validUntil,
      paymentMethod,
      notes,
      internalNotes,
      subtotal,
      taxTotal,
      total,
      taxRate: activeTaxRate,
      taxMode: activeTaxOption.value,
      taxCode: activeTaxOption.value,
      reverseCharge,
      pdfTemplate,
      visualTemplate: pdfTemplate,
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
          unitPrice: unitPriceForSubmit(line),
          customNote: String(line.customNote || "").trim()
        }))
        .filter((line) => line.sku),
      ...overrides
    };
  }

  async function savePaymentMethod(method) {
    const nextMethods = mergePaymentMethod(paymentMethods, method);
    await apiRequest("/api/settings/payment_methods", {
      token,
      method: "PATCH",
      body: { items: nextMethods }
    });
    paymentSettings.reload();
  }

  useEffect(() => {
    if (!actionsRef) return undefined;

    actionsRef.current = {
      downloadPdf: downloadQuotePdf,
      printPdf: printQuotePdf,
      openSend: openSendModal,
      buildPayload: buildQuotePayload,
      focusForEdit: () => {
        lineReferenceRefs.current[lines[0]?.id]?.focus();
      }
    };

    return () => {
      actionsRef.current = {};
    };
  });

  async function submit(event) {
    event?.preventDefault();
    if (readOnly) {
      setError(lockMessage || "Este documento está bloqueado y no se puede modificar.");
      return;
    }
    setError("");
    try {
      if (clientMode === "new") {
        setError("Guarda primero el cliente nuevo desde el bloque de cliente.");
        return;
      }

      setSaveState("saving");
      const result = await apiRequest(currentDocument ? `${meta.endpoint}/${currentDocument.id}` : meta.endpoint, {
        token,
        method: currentDocument ? "PATCH" : "POST",
        body: buildQuotePayload()
      });
      const savedItem = result?.item || result;
      const saved = savedItem?.id && !savedItem.leadId && effectiveLeadId
        ? { ...savedItem, leadId: effectiveLeadId }
        : savedItem;
      if (saved?.id) {
        setSavedDocument(saved);
        if (saved.leadId) setSelectedLeadId(saved.leadId);
        if (Array.isArray(saved.items)) {
          setLines((currentLines) => currentLines.map((line, index) => {
            const savedLine = saved.items[index];
            if (!savedLine) return line;
            return {
              ...line,
              id: savedLine.id || line.id,
              skuQuery: savedLine.sku || line.skuQuery,
              sku: savedLine.sku || line.sku,
              quantity: savedLine.quantity ?? line.quantity,
              discountPercent: savedLine.discountPercent ?? line.discountPercent,
              unitPriceOverride: savedLine.unitPrice ?? line.unitPriceOverride,
              manualTotal: null
            };
          }));
        }
        setQuoteStatus(isInvoice
          ? invoicePaymentState({ status: saved.status || quoteStatus }, Number(saved.total || total), saved.status || quoteStatus).key
          : saved.status || quoteStatus);
      }

      notifySalesDocumentSaved(documentType, saved);
      setSaveState("saved");

      if (!isQuote) {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        onDone();
      } else {
        window.setTimeout(() => setSaveState("idle"), 1800);
      }
    } catch (err) {
      setError(err.message);
      setSaveState("idle");
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
      <DocumentTrace
        trace={currentDocument?.trace}
        currentType={documentType}
        currentId={currentDocument?.id}
        onOpen={onOpenTrace}
      />
      {readOnly ? <p className="document-lock-notice">{lockMessage || "Este documento está bloqueado."}</p> : null}
      <section className="quote-fd-header">
        <div className="quote-fd-toolbar">
          {!isQuote ? <span>Operación: <strong>Empresa nacional</strong></span> : null}
          {isQuote ? (
            <label className="quote-visual-template-control">
              <span>Plantilla:</span>
              <select
                value={pdfTemplate}
                disabled={readOnly}
                onChange={(event) => setPdfTemplate(event.target.value)}
              >
                <option value="doinglight">Doinglight</option>
                <option value="tubo-solar">Tubo Solar</option>
              </select>
            </label>
          ) : (
            <span>Plantilla: <strong>{pdfTemplate === "tubo-solar" ? "Tubo Solar" : "Doinglight"}</strong></span>
          )}
          <span className="document-owner-control">
            Responsable: <strong>{selectedOwnerName}</strong>
            {!readOnly ? (
              <button
                type="button"
                aria-expanded={ownerMenuOpen}
                aria-haspopup="menu"
                onClick={() => setOwnerMenuOpen((open) => !open)}
              >
                Cambiar responsable
              </button>
            ) : null}
            {ownerMenuOpen && !readOnly ? (
              <div className="document-owner-menu" role="menu">
                {assignableUsers.loading ? <p>Cargando usuarios...</p> : null}
                {assignableUsers.error ? <p>No se pudieron cargar los usuarios.</p> : null}
                {!assignableUsers.loading && !assignableUsers.error && ownerUsers.length === 0 ? (
                  <p>No hay usuarios asignables.</p>
                ) : null}
                {ownerUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    role="menuitem"
                    className={user.id === selectedOwnerUserId ? "is-active" : ""}
                    onClick={() => {
                      setSelectedOwnerUserId(user.id);
                      setOwnerMenuOpen(false);
                    }}
                  >
                    <span>{user.fullName || user.email}</span>
                    <small>{user.email}</small>
                  </button>
                ))}
              </div>
            ) : null}
          </span>
        </div>
        <div className="quote-fd-title-row">
          <h4>{documentTitle}</h4>
          <div className="quote-fd-title-actions">
            <div className="quote-fd-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            {!isQuote ? (
              <>
                <button className="quote-document-icon-button" type="button" onClick={downloadQuotePdf} aria-label="Descargar PDF" title="Descargar PDF">
                  <Download size={20} />
                </button>
                <button className="quote-document-icon-button" type="button" onClick={printQuotePdf} aria-label="Imprimir" title="Imprimir">
                  <Printer size={20} />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <fieldset className="quote-form-fieldset" disabled={readOnly}>
      <section className="quote-fd-fields">
        <div className="quote-fd-actions">
          {isQuote ? (
            <select
              className="quote-template-select in-modal"
              aria-label="Presupuestos predefinidos"
              value={templatePicker}
              onChange={(event) => applyQuoteTemplate(event.target.value)}
            >
              <option value="">Presupuestos predefinidos</option>
              {QUOTE_TEMPLATES.map((templateItem) => (
                <option key={templateItem.id} value={templateItem.id}>{templateItem.name}</option>
              ))}
            </select>
          ) : null}
          <div className="quote-client-header-actions">
            <button type="button" className={`quote-client-create-button ${clientMode === "new" ? "active" : ""}`} onClick={() => setClientMode("new")}>
              Crear
            </button>
            {clientMode === "new" ? (
              <button type="button" className="quote-client-cancel-button" onClick={() => setClientMode("existing")}>
                Cancelar
              </button>
            ) : null}
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
              {selectedLead ? (
                <div className="quote-client-selected-meta">
                  <small>{selectedLead.email || "Sin email"} · {selectedLead.phone || selectedLead.mobilePhone || "Sin teléfono"}</small>
                  <span className="quote-client-level-badge">
                    {customerLevelLabel(selectedLead.customerLevel)} · {discountLabel(selectedLead.defaultDiscountPercent, selectedLead.defaultDiscountMaxPercent)}
                  </span>
                  <button className="quote-client-edit-toggle" type="button" onClick={() => setLeadEditorOpen((value) => !value)}>
                    <Pencil size={14} />
                    {leadEditorOpen ? "Cerrar edición" : "Editar cliente"}
                  </button>
                </div>
              ) : null}
            </label>
            {selectedLead && leadDraft && leadEditorOpen ? (
              <div className="quote-client-quick-edit">
                <div className="quote-client-quick-edit-head">
                  <div>
                    <strong>Datos rápidos del cliente</strong>
                    <span>Completa estos campos sin salir del {documentTitle.toLowerCase()}.</span>
                  </div>
                  <button className={leadSaveStatus === "Datos del cliente guardados." ? "save-confirmed" : ""} type="button" onClick={saveSelectedLeadDraft} disabled={leadSaving}>
                    {leadSaving ? "Guardando..." : leadSaveStatus === "Datos del cliente guardados." ? <><CheckCircle2 size={16} /> Guardado</> : "Guardar cliente"}
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
              <input value={currentDocument?.quoteNumber || currentDocument?.documentNumber || ""} placeholder="Se generará automáticamente" readOnly />
            </label>
            <label>
              <span>Correo electrónico de envío</span>
              <input value={leadDraft?.email || selectedLead?.email || ""} onChange={(event) => updateLeadDraft({ email: event.target.value })} placeholder="Sin correo electrónico" readOnly={!selectedLead} />
            </label>
            <label>
              <span>Válido hasta</span>
              <input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
            </label>
            {isQuote || isProforma ? (
              <PaymentMethodSelector
                value={paymentMethod}
                methods={paymentMethods}
                selectedLead={selectedLead}
                onChange={setPaymentMethod}
                onSaveMethod={savePaymentMethod}
              />
            ) : (
              <label>
                <span>Método de pago</span>
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  <option value="">Sin definir</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={paymentMethodLabel(method)}>{paymentMethodLabel(method)}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>Estado del {documentTitle.toLowerCase()}</span>
              <select value={quoteStatus} onChange={(event) => setQuoteStatus(event.target.value)}>
                {statusOptions.map((status) => (
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
            <div className={`quote-fd-internal-notes${isDeliveryNote ? " with-carriers" : ""}`}>
              <label className="quote-fd-textarea internal-notes">
                <span>Notas internas</span>
                <textarea value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
                <small>Notas no visibles para el cliente</small>
              </label>
              {isDeliveryNote ? (
                <aside className="delivery-carrier-panel" aria-label="Opciones de transporte">
                  <button type="button" className="delivery-carrier-button seur" title="SEUR · Pendiente de configurar" aria-label="SEUR, pendiente de configurar">
                    <span>SEUR</span>
                  </button>
                  <button type="button" className="delivery-carrier-button gls" title="GLS · Pendiente de configurar" aria-label="GLS, pendiente de configurar">
                    <span>GLS</span>
                  </button>
                  <button type="button" className="delivery-carrier-button dhl" title="DHL · Pendiente de configurar" aria-label="DHL, pendiente de configurar">
                    <span>DHL</span>
                  </button>
                  <button type="button" className="delivery-carrier-button groupage" title="Grupaje · Pendiente de configurar" aria-label="Grupaje, pendiente de configurar">
                    <span>GRUPAJE</span>
                  </button>
                </aside>
              ) : null}
            </div>
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
          <h4>Líneas del documento</h4>
          {isQuote ? (
            <div className="quote-line-tools">
              <button
                className="quote-transfer-lines-button"
                type="button"
                onClick={openTransferLines}
                disabled={quoteTransferBlocked}
                title={quoteTransferBlocked ? "Este presupuesto ya está traspasado." : undefined}
              >
                Traspasar líneas a albarán
              </button>
              <button
                className="quote-transfer-lines-button"
                type="button"
                onClick={invoiceQuoteDirectly}
                disabled={quoteTransferBlocked}
                title={quoteTransferBlocked ? "Este presupuesto ya está traspasado." : undefined}
              >
                Facturar presupuesto
              </button>
            </div>
          ) : null}
        </header>
        {lines.map((line, index) => {
          const selectedProduct = productForLine(line);
          const supportsCustomNote = Boolean(String(line.sku || line.skuQuery || "").trim());
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
                <span className="quote-product-description">{selectedProduct?.shortDescription || "Selecciona un producto del catálogo"}</span>
                {supportsCustomNote ? (
                  <div className="quote-line-custom-note">
                    {line.customNoteOpen || line.customNote ? (
                      <input
                        type="text"
                        aria-label={`Descripción personalizada de ${line.sku || line.skuQuery}`}
                        placeholder="Ej.: Medida, acabado o indicación especial"
                        value={line.customNote || ""}
                        onChange={(event) => updateLine(line.id, { customNote: event.target.value })}
                      />
                    ) : (
                      <button
                        type="button"
                        className="quote-line-custom-note-trigger"
                        onClick={() => updateLine(line.id, { customNoteOpen: true })}
                      >
                        <Plus size={13} />
                        Descripción personalizada
                      </button>
                    )}
                  </div>
                ) : null}
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
                  className="tiny-icon-button"
                  onClick={() => addLine(false, line.id)}
                  aria-label="Añadir línea"
                  title="Añadir línea"
                >
                  <Plus size={14} />
                </button>
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
          <select value={taxRate} onChange={(event) => setTaxRate(event.target.value)}>
            {DOCUMENT_TAX_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
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
      </fieldset>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        {onCancel ? <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button> : null}
        {!readOnly ? (
          <button className={`primary-button ${saveState === "saved" ? "save-confirmed" : ""}`} type="button" onClick={submit} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Guardando..." : saveState === "saved" ? <><CheckCircle2 size={16} /> Guardado</> : createButtonLabel}
          </button>
        ) : null}
        {isQuote && currentDocument?.id ? (
          <>
            <button className="quote-send-icon-button" type="button" onClick={downloadQuotePdf} aria-label="Descargar PDF" title="Descargar PDF">
              <Download size={20} />
            </button>
            <button className="quote-send-icon-button" type="button" onClick={printQuotePdf} aria-label="Imprimir PDF" title="Imprimir PDF">
              <Printer size={20} />
            </button>
          </>
        ) : null}
        {isDeliveryNote && currentDocument && !readOnly ? (
          <button className="primary-button" type="button" onClick={createInvoiceFromDeliveryNote}>
            Facturar
          </button>
        ) : null}
        <button className="primary-button send-quote-button" type="button" onClick={openSendModal}>
          Enviar
        </button>
      </div>
      {transferLinesOpen ? (
        <ModalShell
          title="Traspasar líneas a albarán"
          eyebrow={documentEyebrow}
          size="transfer-lines-modal"
          onClose={() => setTransferLinesOpen(false)}
        >
          <div className="transfer-lines-content">
            <p>Selecciona las líneas que quieres servir ahora. Cuando activemos albaranes internos, estas líneas quedarán enlazadas y bloqueadas en el presupuesto.</p>
            <div className="transfer-lines-list">
              {lines.map((line) => {
                const selectedProduct = productForLine(line);
                const checked = transferLineIds.includes(line.id);
                return (
                  <label className={`transfer-line-option ${checked ? "active" : ""}`} key={line.id}>
                    <input type="checkbox" checked={checked} onChange={() => toggleTransferLine(line.id)} />
                    <ProductThumbnail product={selectedProduct || { sku: line.sku }} />
                    <span>
                      <strong>{line.sku || "Sin referencia"} · {selectedProduct?.title || "Producto no seleccionado"}</strong>
                      <small>Cantidad {tableMoney(line.quantity)} · Importe {money(lineTotal(line))}</small>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={() => setTransferLinesOpen(false)}>Cancelar</button>
              <button className="primary-button" type="button" onClick={confirmTransferLines}>Crear albarán con estas líneas</button>
            </div>
          </div>
        </ModalShell>
      ) : null}
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
                <EmailRecipientsField value={sendDraft.to} onChange={(to) => updateSendDraft({ to })} />
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
                  <div className="quote-send-attachments-head">
                    <span>Archivos adjuntos</span>
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
                  <label>
                    <input
                      type="checkbox"
                      checked={sendDraft.attachPdf}
                      onChange={(event) => updateSendDraft({ attachPdf: event.target.checked })}
                    />
                    <strong>{quotePdfName}</strong>
                  </label>
                  {attachments.length ? (
                    <div className="quote-send-attachment-list">
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
                  ) : <small>Sin otros adjuntos.</small>}
                </div>
                {sendStatus ? <p className="form-success">{sendStatus}</p> : null}
              </section>
              <section className="quote-send-preview" aria-label="Vista previa del PDF adjunto">
                <label className="quote-pdf-language-row">
                  <span>Idioma del documento</span>
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
                    <button type="button" title="Descargar PDF" onClick={downloadQuotePdf}><Download size={17} /></button>
                    <button type="button" title="Imprimir PDF" onClick={printQuotePdf}><Printer size={17} /></button>
                    <button type="button" title="Más opciones"><MoreVertical size={17} /></button>
                  </div>
                </div>
                <DocumentPdfPage
                  id={`${quotePdfElementId}-preview`}
                  type={pdfDocumentType}
                  language={quoteLanguage}
                  number={quoteNumberLabel}
                  date={quoteDate}
                  dueDate={validUntil}
                  clientBlock={quoteClientBlock}
                  lines={quotePdfLines}
                  subtotal={subtotal}
                  taxRate={activeTaxRate}
                  reverseCharge={reverseCharge}
                  taxTotal={taxTotal}
                  total={total}
                  paymentMethod={paymentMethod}
                  notes={notes || "**Para pagar con tarjeta por favor haga click en el siguiente enlace:**\n\nhttps://sis.redsys.es/sis/p2f?..."}
                  pdfTemplate={pdfTemplate}
                />
              </section>
            </div>
            <footer className="quote-send-actions">
              <button className="secondary-button" type="button" onClick={() => setSendModalOpen(false)}>Cancelar</button>
              <button className="quote-send-icon-button" type="button" onClick={downloadQuotePdf} aria-label="Descargar PDF" title="Descargar PDF">
                <Download size={20} />
              </button>
              <button className="quote-send-icon-button" type="button" onClick={printQuotePdf} aria-label="Imprimir PDF" title="Imprimir PDF">
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
      <div className="hidden-pdf-source" aria-hidden="true">
        <DocumentPdfPage
          id={quotePdfElementId}
          type={pdfDocumentType}
          language={quoteLanguage}
          number={quoteNumberLabel}
          date={quoteDate}
          dueDate={validUntil}
          clientBlock={quoteClientBlock}
          lines={quotePdfLines}
          subtotal={subtotal}
          taxRate={activeTaxRate}
          reverseCharge={reverseCharge}
          taxTotal={taxTotal}
          total={total}
          paymentMethod={paymentMethod}
          notes={notes || "**Para pagar con tarjeta por favor haga click en el siguiente enlace:**\n\nhttps://sis.redsys.es/sis/p2f?..."}
          pdfTemplate={pdfTemplate}
        />
      </div>
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
