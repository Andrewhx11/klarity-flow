/* Klarity Flow — no-build version (runs via Babel in the browser, no npm needed) */
const { useState, useEffect, useRef, useMemo, useContext, createContext } = React;

/* ====================== THEME ====================== */
const DARK = {
  mode: "dark", bgDeep: "#0A0A0A", bgCard: "#121212", bgCard2: "#171717", bgInput: "#1A1A1A",
  border: "rgba(255,255,255,0.07)", borderStrong: "rgba(255,255,255,0.14)",
  green: "#00E8A0", greenSoft: "rgba(0,232,160,0.13)",
  blue: "#2FA8FF", blueSoft: "rgba(47,168,255,0.13)",
  red: "#FF4D6D", redSoft: "rgba(255,77,109,0.13)",
  textPrimary: "#F2F2F4", textSecondary: "#8C8C96", textMuted: "#5A5A63", overlay: "rgba(0,0,0,0.6)",
};
const LIGHT = {
  mode: "light", bgDeep: "#F2F2F5", bgCard: "#FFFFFF", bgCard2: "#F7F7FA", bgInput: "#F0F0F4",
  border: "rgba(0,0,0,0.08)", borderStrong: "rgba(0,0,0,0.16)",
  green: "#00A876", greenSoft: "rgba(0,168,118,0.12)",
  blue: "#1C7ED6", blueSoft: "rgba(28,126,214,0.12)",
  red: "#E0314B", redSoft: "rgba(224,49,75,0.1)",
  textPrimary: "#15151A", textSecondary: "#5C5C66", textMuted: "#9A9AA2", overlay: "rgba(0,0,0,0.35)",
};
const ThemeCtx = createContext(DARK);
const useTheme = () => useContext(ThemeCtx);

/* ====================== CONSTANTS ====================== */
const COLOR_PRESETS = ["#00E8A0", "#2FA8FF", "#FF4D6D", "#FFB020", "#9D7BFF", "#FF6B9D", "#4DD0E1", "#8C8C96"];
const EMOJI_OPTIONS = ["🍔","☕","🛒","🚗","🚌","✈️","🏠","💡","📱","🎬","🎮","👗","💊","🏋️","📚","🎓","💼","💰","🎁","🐾","✨","🧾","🍕","🍻"];
const DEFAULT_CATEGORIES = [
  { id: "cat-food", name: "Food & Drink", color: "#00E8A0", icon: "🍔", order: 0 },
  { id: "cat-transport", name: "Transport", color: "#2FA8FF", icon: "🚗", order: 1 },
  { id: "cat-shopping", name: "Shopping", color: "#FFB020", icon: "🛍️", order: 2 },
  { id: "cat-bills", name: "Bills & Utilities", color: "#FF4D6D", icon: "🧾", order: 3 },
  { id: "cat-salary", name: "Salary", color: "#9D7BFF", icon: "💼", order: 4 },
  { id: "cat-other", name: "Other", color: "#8C8C96", icon: "✨", order: 5 },
];
const DEFAULT_SHORTCUTS = [
  { id: "sc-coffee", name: "Coffee", value: 6, type: "expense", buttonColor: "#1A1A1A", textColor: "#FF4D6D" },
  { id: "sc-lunch", name: "Lunch", value: 15, type: "expense", buttonColor: "#1A1A1A", textColor: "#FF4D6D" },
  { id: "sc-tip", name: "Tip", value: 20, type: "income", buttonColor: "#1A1A1A", textColor: "#00E8A0" },
];
const STORAGE_KEY = "klarity-flow:data";
const WEEKDAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ====================== UTILITIES ====================== */
function uid() { return (crypto && crypto.randomUUID) ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2) + Date.now(); }
function pad(n) { return String(n).padStart(2, "0"); }
function toISODate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseISODate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function todayISO() { return toISODate(new Date()); }
function mondayOf(date) { const d = new Date(date); d.setHours(0,0,0,0); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; d.setDate(d.getDate() + diff); return d; }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function addMonthsTo(date, n) { const d = new Date(date); d.setMonth(d.getMonth() + n); return d; }
function sameDate(a, b) { return toISODate(a) === toISODate(b); }
function formatExact(num) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  let n = num; if (Object.is(n, -0)) n = 0;
  let s = n.toFixed(8); s = s.replace(/0+$/, ""); s = s.replace(/\.$/, "");
  if (s === "" || s === "-") s = "0";
  return s;
}
function addThousands(s) {
  const neg = s.startsWith("-"); if (neg) s = s.slice(1);
  let [intPart, decPart] = s.split(".");
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + intPart + (decPart ? "." + decPart : "");
}
function formatMoney(num, symbol) { return `${symbol}${addThousands(formatExact(num))}`; }
function weekRangeLabel(monday, sunday) {
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const a = `${MONTH_LABELS[monday.getMonth()]} ${monday.getDate()}`;
  const b = sameMonth ? `${sunday.getDate()}` : `${MONTH_LABELS[sunday.getMonth()]} ${sunday.getDate()}`;
  return `${a} – ${b}, ${sunday.getFullYear()}`;
}
function buildWeeksRange(earliestDate, latestDate) {
  const weeks = []; let cur = mondayOf(earliestDate); const lastMonday = mondayOf(latestDate); let guard = 0;
  while (cur.getTime() <= lastMonday.getTime() && guard < 2000) {
    const end = addDays(cur, 6);
    weeks.push({ start: new Date(cur), end, key: toISODate(cur) });
    cur = addDays(cur, 7); guard++;
  }
  return weeks;
}
function buildMonthsRange(earliestDate, latestDate) {
  const months = []; let cur = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
  const last = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1); let guard = 0;
  while (cur.getTime() <= last.getTime() && guard < 1200) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth(), key: `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}` });
    cur = addMonthsTo(cur, 1); guard++;
  }
  return months;
}
function storageGet(key) { try { const raw = localStorage.getItem(key); return raw === null ? null : JSON.parse(raw); } catch (e) { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; } }

/* ====================== UI ATOMS ====================== */
function Card({ children, style, className = "" }) {
  const t = useTheme();
  return <div className={`rounded-2xl ${className}`} style={{ background: t.bgCard, border: `1px solid ${t.border}`, ...style }}>{children}</div>;
}
function SectionTitle({ icon, title, right }) {
  const t = useTheme();
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <div className="flex items-center gap-1.5">
        <span>{icon}</span>
        <span className="font-semibold uppercase tracking-wider" style={{ color: t.textSecondary, fontSize: "11px" }}>{title}</span>
      </div>
      {right}
    </div>
  );
}
function SegmentedControl({ options, value, onChange, accent }) {
  const t = useTheme();
  return (
    <div className="flex rounded-xl p-1 gap-1" style={{ background: t.bgInput, border: `1px solid ${t.border}` }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} className="flex-1 text-xs font-semibold py-1.5 rounded-lg"
            style={{ background: active ? (accent || t.blue) : "transparent", color: active ? "#0A0A0A" : t.textSecondary }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
function Switch({ checked, onChange }) {
  const t = useTheme();
  return (
    <button onClick={() => onChange(!checked)} className="relative rounded-full shrink-0" style={{ width: 44, height: 24, background: checked ? t.green : t.bgInput, border: `1px solid ${checked ? t.green : t.border}` }}>
      <span style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: 9, background: checked ? "#0A0A0A" : t.textSecondary, transition: "left 150ms ease" }} />
    </button>
  );
}
function ColorPicker({ value, onChange, label }) {
  const t = useTheme();
  const [custom, setCustom] = useState(value);
  useEffect(() => setCustom(value), [value]);
  return (
    <div>
      {label && <div className="mb-1.5" style={{ color: t.textSecondary, fontSize: "12px" }}>{label}</div>}
      <div className="flex flex-wrap gap-2 mb-2">
        {COLOR_PRESETS.map((c) => (
          <button key={c} onClick={() => onChange(c)} className="rounded-full flex items-center justify-center" style={{ width: 28, height: 28, background: c, transform: value === c ? "scale(1.15)" : "scale(1)", boxShadow: value === c ? `0 0 0 2px ${t.bgCard}, 0 0 0 3.5px ${c}` : "none" }}>
            {value === c && <span style={{ color: "#0A0A0A", fontSize: 12, fontWeight: 900 }}>✓</span>}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="rounded-full shrink-0" style={{ width: 28, height: 28, background: custom, border: `1px solid ${t.border}` }} />
        <input value={custom} onChange={(e) => { setCustom(e.target.value); if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) onChange(e.target.value); }}
          placeholder="#00E8A0" className="px-2.5 py-1.5 rounded-lg flex-1 outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}`, fontFamily: "monospace", fontSize: "12px" }} />
      </div>
    </div>
  );
}
function EmojiPicker({ value, onChange }) {
  const t = useTheme();
  return (
    <div>
      <div className="mb-1.5" style={{ color: t.textSecondary, fontSize: "12px" }}>Icon</div>
      <div className="grid grid-cols-6 gap-1.5 mb-2">
        {EMOJI_OPTIONS.map((e) => (
          <button key={e} onClick={() => onChange(e)} className="rounded-lg flex items-center justify-center" style={{ width: 32, height: 32, background: value === e ? t.greenSoft : t.bgInput, border: `1px solid ${value === e ? t.green : t.border}` }}>{e}</button>
        ))}
      </div>
    </div>
  );
}
function Modal({ open, onClose, title, children }) {
  const t = useTheme();
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-end justify-center" style={{ background: t.overlay, zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl p-5 overflow-y-auto" style={{ background: t.bgCard, border: `1px solid ${t.border}`, maxHeight: "85vh" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold" style={{ color: t.textPrimary, fontSize: "16px" }}>{title}</h3>
          <button onClick={onClose} className="rounded-full flex items-center justify-center" style={{ width: 28, height: 28, background: t.bgInput, color: t.textSecondary }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function PrimaryButton({ children, onClick, color, disabled, full }) {
  const t = useTheme();
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-1.5 font-semibold rounded-xl px-4 py-2.5 text-sm ${full ? "w-full" : ""}`}
      style={{ background: disabled ? t.bgInput : (color || t.green), color: disabled ? t.textMuted : "#0A0A0A", opacity: disabled ? 0.6 : 1 }}>{children}</button>
  );
}
function GhostButton({ children, onClick, full }) {
  const t = useTheme();
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-1.5 font-semibold rounded-xl px-4 py-2.5 text-sm ${full ? "w-full" : ""}`}
      style={{ background: "transparent", color: t.textSecondary, border: `1px solid ${t.border}` }}>{children}</button>
  );
}
function ToastStack({ toasts }) {
  const t = useTheme();
  return (
    <div className="fixed bottom-24 left-0 right-0 flex flex-col items-center gap-2 px-4" style={{ zIndex: 60, pointerEvents: "none" }}>
      {toasts.map((toast) => (
        <div key={toast.id} className="px-4 py-2 rounded-full text-xs font-medium shadow-lg" style={{ background: t.bgCard2, color: t.textPrimary, border: `1px solid ${t.borderStrong}` }}>{toast.text}</div>
      ))}
    </div>
  );
}

/* ====================== HAND-ROLLED CHARTS (no chart library) ====================== */
function MiniBarChart({ data }) {
  const t = useTheme();
  const width = 320, height = 150, padding = 22;
  const maxVal = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const innerW = width - padding * 2, innerH = height - padding * 2;
  const groupW = innerW / Math.max(1, data.length);
  const barW = Math.max(3, Math.min(14, groupW / 3));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 150 }}>
      <line x1={padding} y1={padding + innerH} x2={width - padding} y2={padding + innerH} stroke={t.border} strokeWidth="1" />
      {data.map((d, i) => {
        const gx = padding + i * groupW + groupW / 2;
        const incH = (d.income / maxVal) * innerH, expH = (d.expense / maxVal) * innerH;
        return (
          <g key={i}>
            <rect x={gx - barW - 1.5} y={padding + innerH - incH} width={barW} height={Math.max(0, incH)} fill={t.green} rx={2} />
            <rect x={gx + 1.5} y={padding + innerH - expH} width={barW} height={Math.max(0, expH)} fill={t.red} rx={2} />
            {(i % Math.ceil(data.length / 8 || 1) === 0) && <text x={gx} y={height - 4} fontSize="8" textAnchor="middle" fill={t.textMuted}>{d.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}
function MiniLineChart({ data }) {
  const t = useTheme();
  const width = 320, height = 150, padding = 22;
  const vals = data.map((d) => d.net);
  const minV = Math.min(0, ...vals), maxV = Math.max(0, 1, ...vals);
  const innerW = width - padding * 2, innerH = height - padding * 2;
  const stepX = innerW / Math.max(1, data.length - 1);
  const points = data.map((d, i) => {
    const x = padding + i * stepX;
    const y = padding + innerH - ((d.net - minV) / ((maxV - minV) || 1)) * innerH;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 150 }}>
      <line x1={padding} y1={padding + innerH} x2={width - padding} y2={padding + innerH} stroke={t.border} strokeWidth="1" />
      <polyline points={points} fill="none" stroke={t.blue} strokeWidth="2" />
    </svg>
  );
}

/* ====================== TOP BAR + SIDEBAR ====================== */
function TopBar({ onMenu, onSearch }) {
  const t = useTheme();
  return (
    <div className="sticky top-0 flex items-center justify-between px-4 py-3" style={{ zIndex: 30, background: `${t.bgDeep}E6`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${t.border}` }}>
      <button onClick={onMenu} className="p-2 rounded-xl" style={{ background: t.bgCard }}>☰</button>
      <div className="flex items-center gap-1.5">
        <span>✨</span>
        <span className="font-bold tracking-tight" style={{ color: t.textPrimary, fontSize: "14px" }}>Klarity Flow</span>
      </div>
      <button onClick={onSearch} className="p-2 rounded-xl" style={{ background: t.bgCard }}>🔍</button>
    </div>
  );
}
function Sidebar({ open, onClose, view, setView }) {
  const t = useTheme();
  const items = [
    { id: "dashboard", label: "Dashboard", icon: "💰" },
    { id: "shortcuts", label: "Shortcuts", icon: "✨" },
    { id: "categories", label: "Categories", icon: "📁" },
    { id: "analytics", label: "Expense Category", icon: "📊" },
    { id: "reports", label: "Reports", icon: "📋" },
    { id: "search", label: "Search", icon: "🔍" },
    { id: "importExport", label: "Import & Export", icon: "⬇️" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];
  return (
    <React.Fragment>
      {open && <div className="fixed inset-0" style={{ background: t.overlay, zIndex: 40 }} onClick={onClose} />}
      <div className="fixed top-0 left-0 h-full p-4 flex flex-col" style={{ width: 280, zIndex: 50, background: t.bgCard, borderRight: `1px solid ${t.border}`, transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 220ms ease" }}>
        <div className="flex items-center gap-2 mb-6 px-2 pt-1">
          <span>✨</span>
          <span className="font-bold" style={{ color: t.textPrimary, fontSize: "15px" }}>Klarity Flow</span>
        </div>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {items.map((item) => {
            const active = view === item.id;
            return (
              <button key={item.id} onClick={() => { setView(item.id); onClose(); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: active ? t.greenSoft : "transparent", color: active ? t.green : t.textSecondary }}>
                <span>{item.icon}</span>{item.label}
              </button>
            );
          })}
        </div>
        <div className="mt-auto px-2 pb-2" style={{ color: t.textMuted, fontSize: "10px" }}>Klarity Flow · v1.0 (lite)</div>
      </div>
    </React.Fragment>
  );
}

/* ====================== BALANCE + QUICK ADD + SHORTCUTS ====================== */
function BalanceCard({ initialBalance, setInitialBalance, currentBalance, todayNet, symbol }) {
  const t = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(initialBalance));
  return (
    <Card className="p-4 mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold uppercase tracking-wider" style={{ color: t.textSecondary, fontSize: "11px" }}>Current Balance</span>
        {!editing && <button onClick={() => { setDraft(String(initialBalance)); setEditing(true); }} className="rounded-lg px-2 py-1" style={{ background: t.bgInput, color: t.textSecondary, fontSize: "12px" }}>✎</button>}
      </div>
      {!editing ? (
        <div className="font-bold" style={{ color: t.textPrimary, fontSize: "30px", fontFamily: "monospace" }}>{formatMoney(currentBalance, symbol)}</div>
      ) : (
        <div className="flex items-center gap-2">
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} inputMode="decimal" className="font-bold rounded-lg px-2.5 py-1.5 flex-1 outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.borderStrong}`, fontFamily: "monospace", fontSize: "18px" }} />
          <button onClick={() => { const v = parseFloat(draft); if (!isNaN(v)) setInitialBalance(v); setEditing(false); }} className="rounded-lg px-3 py-2" style={{ background: t.green, color: "#0A0A0A" }}>✓</button>
        </div>
      )}
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <span style={{ color: todayNet >= 0 ? t.green : t.red, fontFamily: "monospace", fontSize: "12px" }}>{todayNet >= 0 ? "↗" : "↘"} {formatMoney(Math.abs(todayNet), symbol)}</span>
        <span style={{ color: t.textMuted, fontSize: "12px" }}>today</span>
        <span className="ml-2" style={{ color: t.textMuted, fontSize: "12px" }}>Starting: {formatMoney(initialBalance, symbol)}</span>
      </div>
    </Card>
  );
}
function QuickAddForm({ categories, onAdd, symbol }) {
  const t = useTheme();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0] ? categories[0].id : null);
  const [type, setType] = useState("expense");
  const canAdd = description.trim().length > 0 && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
  function submit() { if (!canAdd) return; onAdd({ description: description.trim(), amount: parseFloat(amount), type, categoryId }); setDescription(""); setAmount(""); }
  return (
    <Card className="p-3.5 mb-3">
      <SectionTitle icon="➕" title="Quick Add" />
      <div className="flex gap-2 mb-2">
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="text-sm px-3 py-2.5 rounded-xl outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}`, flex: 2 }} />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`${symbol}0.00`} inputMode="decimal" className="flex-1 text-sm px-3 py-2.5 rounded-xl outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}`, fontFamily: "monospace" }} />
      </div>
      <div className="flex gap-1.5 ove
