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

/* ---- AI context builder: compact summary by default, detail only when the question needs it ---- */
function buildAIContext(transactions, categories, initialBalance, symbol, question) {
  const catMap = {}; categories.forEach((c) => { catMap[c.id] = c.name; });
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const currentBalance = initialBalance + totalIncome - totalExpense;

  const now = new Date();
  const monthBuckets = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({ year: d.getFullYear(), month: d.getMonth(), label: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}` });
  }
  const catSummaryLines = categories.map((c) => {
    const parts = monthBuckets.map((b) => {
      const tx = transactions.filter((t) => { if (t.categoryId !== c.id) return false; const dd = parseISODate(t.date); return dd.getFullYear() === b.year && dd.getMonth() === b.month; });
      const inc = tx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const exp = tx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      return `${b.label}: -${formatExact(exp)}/+${formatExact(inc)}`;
    });
    return `${c.name}: ${parts.join(", ")}`;
  });

  const q = (question || "").toLowerCase();
  const wantsDetail =
    /\b(today|yesterday|this week|last week|this month|last month|on |date|when|list|show me|which|specific|each|every|recent)\b/.test(q) ||
    categories.some((c) => q.includes(c.name.toLowerCase())) ||
    MONTH_LABELS.some((m) => q.includes(m.toLowerCase()));

  let detailBlock = "";
  if (wantsDetail) {
    const relevant = [...transactions]
      .sort((a, b) => (b.date + String(b.createdAt)).localeCompare(a.date + String(a.createdAt)))
      .slice(0, 80)
      .map((t) => `${t.date} | ${t.type} | ${formatExact(t.amount)} | ${catMap[t.categoryId] || "Uncategorized"} | ${t.description}`);
    detailBlock = `\n\nMost recent matching transactions (up to 80, date | type | amount | category | description):\n${relevant.join("\n")}`;
  }

  return `Currency symbol: ${symbol}\nInitial balance: ${formatExact(initialBalance)}\nCurrent balance: ${formatExact(currentBalance)}\nTotal income (all time): ${formatExact(totalIncome)}\nTotal expense (all time): ${formatExact(totalExpense)}\n\nPer-category totals, last 3 months (expense/income):\n${catSummaryLines.join("\n")}${detailBlock}`;
}

function bumpAndGetDailyAICount() {
  const today = todayISO();
  const data = storageGet("klarity-flow:ai-usage") || { date: today, count: 0 };
  if (data.date !== today) { data.date = today; data.count = 0; }
  data.count += 1;
  storageSet("klarity-flow:ai-usage", data);
  return data.count;
}
function getDailyAICount() {
  const data = storageGet("klarity-flow:ai-usage");
  if (!data || data.date !== todayISO()) return 0;
  return data.count;
}

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

/* ====================== AI ASSISTANT (via your own Cloudflare Worker + Gemini) ====================== */
function AIAssistantView({ transactions, categories, initialBalance, symbol, settings }) {
  const t = useTheme();
  const [messages, setMessages] = useState([{ role: "model", text: "Hi! Ask me about your spending, income, or categories — for example: \"How much did I spend on Food & Drink this month?\"" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [todayCount, setTodayCount] = useState(getDailyAICount());
  const scrollRef = useRef(null);
  const configured = !!(settings.aiBackendUrl && settings.aiBackendUrl.trim());

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, loading]);

  async function send(text) {
    const userText = (text !== undefined ? text : input).trim();
    if (!userText || !configured) return;
    const history = messages.slice(-8);
    setMessages((m) => [...m, { role: "user", text: userText }]);
    setInput("");
    setLoading(true);
    try {
      const contents = [
        ...history.map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
        { role: "user", parts: [{ text: userText }] },
      ];
      const systemPrompt = `You are the in-app finance assistant for Klarity Flow, a personal daily cash-flow tracking app. Answer using ONLY the data below. Be concise and specific. Always state exact figures (never round). If something can't be answered from the data, say so plainly.\n\n${buildAIContext(transactions, categories, initialBalance, symbol, userText)}`;
      const res = await fetch(settings.aiBackendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-App-Secret": settings.aiSecret || "" },
        body: JSON.stringify({ systemPrompt, contents }),
      });
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : "Request failed");
      const candidate = data.candidates && data.candidates[0];
      const textOut = (candidate && candidate.content && candidate.content.parts && candidate.content.parts.map((p) => p.text || "").join("").trim()) || "I couldn't generate a response — try rephrasing.";
      setMessages((m) => [...m, { role: "model", text: textOut }]);
      setTodayCount(bumpAndGetDailyAICount());
    } catch (e) {
      setMessages((m) => [...m, { role: "model", text: "Sorry, I couldn't reach the assistant just now (" + e.message + "). Check your AI Backend URL and Secret in Settings." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!configured) {
    return (
      <div>
        <SectionTitle icon="🤖" title="AI Assistant" />
        <Card className="p-4">
          <div className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>Not set up yet</div>
          <div style={{ color: t.textMuted, fontSize: "12px" }}>Once you've deployed the Cloudflare Worker, paste its URL (and your app secret) into Settings → AI Assistant Setup, then come back here.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
      <SectionTitle icon="🤖" title="AI Assistant" right={<span style={{ color: t.textMuted, fontSize: "10px" }}>{todayCount} today</span>} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-2 mb-3">
        {messages.map((m, i) => (
          <div key={i} className="flex" style={{ justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div className="text-sm px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap" style={{ background: m.role === "user" ? t.blueSoft : t.bgCard, color: t.textPrimary, border: `1px solid ${m.role === "user" ? t.blue : t.border}`, maxWidth: "85%" }}>{m.text}</div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="px-3.5 py-2.5 rounded-2xl" style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textSecondary, fontSize: "12px" }}>Thinking…</div></div>}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Ask about your finances…" className="flex-1 text-sm px-3.5 py-2.5 rounded-xl outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}` }} />
        <button onClick={() => send()} disabled={loading} className="rounded-xl px-4" style={{ background: t.green, opacity: loading ? 0.6 : 1, color: "#0A0A0A", fontWeight: 700 }}>➤</button>
      </div>
    </div>
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
    { id: "ai", label: "AI Assistant", icon: "🤖" },
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
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCategoryId(c.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0"
            style={{ background: categoryId === c.id ? `${c.color}22` : t.bgInput, border: `1px solid ${categoryId === c.id ? c.color : t.border}`, color: categoryId === c.id ? c.color : t.textSecondary }}>
            <span>{c.icon}</span>{c.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex rounded-xl p-1 flex-1" style={{ background: t.bgInput, border: `1px solid ${t.border}` }}>
          <button onClick={() => setType("expense")} className="flex-1 text-xs font-bold py-2 rounded-lg" style={{ background: type === "expense" ? t.red : "transparent", color: type === "expense" ? "#0A0A0A" : t.textSecondary }}>Expense</button>
          <button onClick={() => setType("income")} className="flex-1 text-xs font-bold py-2 rounded-lg" style={{ background: type === "income" ? t.green : "transparent", color: type === "income" ? "#0A0A0A" : t.textSecondary }}>Income</button>
        </div>
        <PrimaryButton onClick={submit} disabled={!canAdd} color={type === "expense" ? t.red : t.green}>+ Add</PrimaryButton>
      </div>
    </Card>
  );
}
function ShortcutsRow({ shortcuts, onTap, onManage }) {
  const t = useTheme();
  return (
    <div className="mb-3">
      <SectionTitle icon="✨" title="Shortcuts" right={<button onClick={onManage} className="font-semibold" style={{ color: t.blue, fontSize: "11px" }}>Manage</button>} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {shortcuts.map((s) => (
          <button key={s.id} onClick={() => onTap(s)} className="px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0" style={{ background: s.buttonColor, color: s.textColor, border: `1px solid ${t.border}` }}>
            {s.type === "income" ? "+" : "−"}{formatExact(s.value)} · {s.name}
          </button>
        ))}
        {shortcuts.length === 0 && <div className="px-1" style={{ color: t.textMuted, fontSize: "12px" }}>No shortcuts yet — tap Manage.</div>}
      </div>
    </div>
  );
}

/* ====================== TRANSACTION LIST ====================== */
function TransactionList({ transactions, categories, selectedDate, onDelete, runningBalanceFor, symbol }) {
  const t = useTheme();
  const dayTx = transactions.filter((tx) => tx.date === selectedDate).sort((a, b) => b.createdAt - a.createdAt);
  const dateObj = parseISODate(selectedDate);
  const isToday = sameDate(dateObj, new Date());
  const label = isToday ? "Today" : `${MONTH_LABELS[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
  return (
    <Card className="p-3.5 mb-3">
      <SectionTitle icon="📋" title={label} />
      {dayTx.length === 0 ? (
        <div className="text-center py-6" style={{ color: t.textMuted, fontSize: "12px" }}>No transactions on this day yet.</div>
      ) : (
        <div className="flex flex-col gap-1">
          {dayTx.map((tx) => {
            const cat = categories.find((c) => c.id === tx.categoryId);
            const running = runningBalanceFor(tx.id);
            return (
              <div key={tx.id} className="flex items-center gap-2 py-2 px-1 rounded-lg" style={{ borderBottom: `1px solid ${t.border}` }}>
                <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 28, height: 28, background: `${(cat ? cat.color : t.textMuted)}1F`, fontSize: "14px" }}>{cat ? cat.icon : "•"}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: t.textPrimary }}>{tx.description}</div>
                  <div style={{ color: t.textMuted, fontSize: "11px" }}>{cat ? cat.name : "Uncategorized"}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold" style={{ color: tx.type === "income" ? t.green : t.red, fontFamily: "monospace" }}>{tx.type === "income" ? "+" : "−"}{formatMoney(tx.amount, symbol)}</div>
                  <div style={{ color: t.textMuted, fontFamily: "monospace", fontSize: "10px" }}>{formatMoney(running, symbol)}</div>
                </div>
                <button onClick={() => onDelete(tx.id)} className="rounded-lg shrink-0 px-1.5 py-1.5" style={{ background: t.bgInput, color: t.textMuted, fontSize: "12px" }}>🗑</button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ====================== CALENDAR ====================== */
function CalendarPanel({ selectedDate, setSelectedDate, transactions }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const selDate = parseISODate(selectedDate);
  const [viewMonth, setViewMonth] = useState(new Date(selDate.getFullYear(), selDate.getMonth(), 1));
  const netByDate = useMemo(() => {
    const map = {};
    transactions.forEach((tx) => { map[tx.date] = (map[tx.date] || 0) + (tx.type === "income" ? tx.amount : -tx.amount); });
    return map;
  }, [transactions]);
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells = []; for (let i = 0; i < startOffset; i++) cells.push(null); for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const years = []; for (let y = new Date().getFullYear() - 6; y <= new Date().getFullYear() + 1; y++) years.push(y);
  return (
    <Card className="p-3.5 mb-3">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full">
        <span className="font-semibold uppercase tracking-wider" style={{ color: t.textSecondary, fontSize: "11px" }}>📅 {MONTH_LABELS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
        <span style={{ color: t.textSecondary }}>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-3 gap-2">
            <button onClick={() => setViewMonth(addMonthsTo(viewMonth, -1))} className="rounded-lg px-2 py-1.5" style={{ background: t.bgInput, color: t.textPrimary }}>‹</button>
            <div className="flex gap-1.5 flex-1">
              <select value={viewMonth.getMonth()} onChange={(e) => setViewMonth(new Date(viewMonth.getFullYear(), Number(e.target.value), 1))} className="text-xs rounded-lg px-2 py-1.5 flex-1 outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}` }}>
                {MONTH_LABELS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={viewMonth.getFullYear()} onChange={(e) => setViewMonth(new Date(Number(e.target.value), viewMonth.getMonth(), 1))} className="text-xs rounded-lg px-2 py-1.5 outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}` }}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={() => setViewMonth(addMonthsTo(viewMonth, 1))} className="rounded-lg px-2 py-1.5" style={{ background: t.bgInput, color: t.textPrimary }}>›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((w) => <div key={w} className="text-center font-semibold" style={{ color: t.textMuted, fontSize: "10px" }}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) return <div key={idx} />;
              const iso = toISODate(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
              const net = netByDate[iso];
              const isSel = iso === selectedDate;
              return (
                <button key={idx} onClick={() => setSelectedDate(iso)} className="aspect-square flex flex-col items-center justify-center rounded-lg gap-0.5" style={{ background: isSel ? t.greenSoft : "transparent", border: isSel ? `1px solid ${t.green}` : "1px solid transparent" }}>
                  <span className="font-medium" style={{ color: t.textPrimary, fontSize: "11px" }}>{day}</span>
                  {net !== undefined && net !== 0 && <span style={{ color: net > 0 ? t.green : t.red, fontFamily: "monospace", fontWeight: 600, fontSize: "8px" }}>{net > 0 ? "+" : ""}{Math.abs(net) >= 1000 ? Math.round(net) : formatExact(net)}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ====================== GRAPH ====================== */
function GraphPanel({ transactions, selectedDate }) {
  const t = useTheme();
  const [range, setRange] = useState("1M");
  const [oneDMode, setOneDMode] = useState("daily");
  const selDate = parseISODate(selectedDate);
  const data = useMemo(() => {
    if (range === "1D") {
      const year = selDate.getFullYear(), month = selDate.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      let cumulative = 0; const rows = [];
      for (let d = 1; d <= days; d++) {
        const iso = toISODate(new Date(year, month, d));
        const dayTx = transactions.filter((tx) => tx.date === iso);
        const income = dayTx.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0);
        const expense = dayTx.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0);
        cumulative += income - expense;
        rows.push({ label: String(d), income, expense, net: cumulative });
      }
      return rows;
    }
    if (range === "1W") {
      const year = selDate.getFullYear(), month = selDate.getMonth();
      const weeks = buildWeeksRange(new Date(year, month, 1), new Date(year, month + 1, 0));
      return weeks.map((w) => {
        const wTx = transactions.filter((tx) => { const d = parseISODate(tx.date); return d >= w.start && d <= w.end; });
        return { label: weekRangeLabel(w.start, w.end).split(",")[0], income: wTx.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0), expense: wTx.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0) };
      });
    }
    if (range === "1M") {
      const year = selDate.getFullYear();
      return MONTH_LABELS.map((m, i) => {
        const mTx = transactions.filter((tx) => { const d = parseISODate(tx.date); return d.getFullYear() === year && d.getMonth() === i; });
        return { label: m, income: mTx.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0), expense: mTx.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0) };
      });
    }
    if (transactions.length === 0) return [{ label: String(new Date().getFullYear()), income: 0, expense: 0 }];
    const years = transactions.map((tx) => parseISODate(tx.date).getFullYear());
    const minY = Math.min(...years), maxY = Math.max(...years, new Date().getFullYear());
    const rows = [];
    for (let y = minY; y <= maxY; y++) {
      const yTx = transactions.filter((tx) => parseISODate(tx.date).getFullYear() === y);
      rows.push({ label: String(y), income: yTx.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0), expense: yTx.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0) });
    }
    return rows;
  }, [range, transactions, selDate]);
  return (
    <Card className="p-3.5 mb-3">
      <SectionTitle icon="📊" title="Cash Flow Graph" />
      <div className="flex gap-1.5 mb-3">
        {["1D", "1W", "1M", "1Y"].map((r) => (
          <button key={r} onClick={() => setRange(r)} className="flex-1 text-xs font-bold py-1.5 rounded-lg" style={{ background: range === r ? t.blueSoft : t.bgInput, color: range === r ? t.blue : t.textSecondary, border: `1px solid ${range === r ? t.blue : t.border}` }}>{r}</button>
        ))}
      </div>
      {range === "1D" && <div className="mb-2"><SegmentedControl options={[{ label: "Daily", value: "daily" }, { label: "Monthly", value: "monthly" }]} value={oneDMode} onChange={setOneDMode} accent={t.blue} /></div>}
      {range === "1D" && oneDMode === "monthly" ? <MiniLineChart data={data} /> : <MiniBarChart data={data} />}
    </Card>
  );
}

/* ====================== CATEGORIES (reorder via up/down buttons) ====================== */
function CategoryFormModal({ open, onClose, onSave, initial }) {
  const t = useTheme();
  const [name, setName] = useState(""); const [color, setColor] = useState(COLOR_PRESETS[0]); const [icon, setIcon] = useState(EMOJI_OPTIONS[0]);
  useEffect(() => { if (open) { setName(initial ? initial.name : ""); setColor(initial ? initial.color : COLOR_PRESETS[0]); setIcon(initial ? initial.icon : EMOJI_OPTIONS[0]); } }, [open, initial]);
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Category" : "New Category"}>
      <div className="flex flex-col gap-3">
        <div>
          <div className="mb-1.5" style={{ color: t.textSecondary, fontSize: "12px" }}>Name</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Groceries" className="w-full text-sm px-3 py-2.5 rounded-xl outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}` }} />
        </div>
        <EmojiPicker value={icon} onChange={setIcon} />
        <ColorPicker value={color} onChange={setColor} label="Color" />
        <PrimaryButton full disabled={!name.trim()} onClick={() => { onSave({ name: name.trim(), color, icon }); onClose(); }}>✓ Save Category</PrimaryButton>
      </div>
    </Modal>
  );
}
function CategoriesView({ categories, setCategories, transactions, setTransactions, pushToast }) {
  const t = useTheme();
  const [modalOpen, setModalOpen] = useState(false); const [editTarget, setEditTarget] = useState(null);
  const sorted = useMemo(() => [...categories].sort((a, b) => a.order - b.order), [categories]);
  function handleSave(data) {
    if (editTarget) { setCategories((prev) => prev.map((c) => (c.id === editTarget.id ? { ...c, ...data } : c))); pushToast("Category updated"); }
    else { const maxOrder = categories.length ? Math.max(...categories.map((c) => c.order)) : -1; setCategories((prev) => [...prev, { id: uid(), order: maxOrder + 1, ...data }]); pushToast("Category created"); }
    setEditTarget(null);
  }
  function move(cat, dir) {
    const idx = sorted.findIndex((c) => c.id === cat.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const next = [...sorted]; [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setCategories((prev) => prev.map((c) => ({ ...c, order: next.findIndex((x) => x.id === c.id) })));
  }
  function handleDelete(cat) {
    const linked = transactions.filter((tx) => tx.categoryId === cat.id).length;
    if (linked > 0) {
      if (!window.confirm(`${linked} transaction(s) use "${cat.name}". Delete this category? They will become Uncategorized.`)) return;
      setTransactions((prev) => prev.map((tx) => (tx.categoryId === cat.id ? { ...tx, categoryId: null } : tx)));
    }
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    pushToast("Category deleted");
  }
  return (
    <div>
      <SectionTitle icon="📁" title="Categories" right={<button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="font-semibold" style={{ color: t.green, fontSize: "12px" }}>+ Add</button>} />
      <div className="flex flex-col gap-2">
        {sorted.map((cat) => (
          <Card key={cat.id} className="p-2.5 flex items-center gap-2">
            <div className="flex flex-col">
              <button onClick={() => move(cat, -1)} style={{ color: t.textMuted, fontSize: "12px", lineHeight: "12px" }}>▲</button>
              <button onClick={() => move(cat, 1)} style={{ color: t.textMuted, fontSize: "12px", lineHeight: "12px" }}>▼</button>
            </div>
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 30, height: 30, background: `${cat.color}22`, fontSize: "14px" }}>{cat.icon}</div>
            <div className="flex-1 text-sm font-medium truncate" style={{ color: t.textPrimary }}>{cat.name}</div>
            <button onClick={() => { setEditTarget(cat); setModalOpen(true); }} className="rounded-lg px-2 py-1.5" style={{ background: t.bgInput, fontSize: "12px" }}>✎</button>
            <button onClick={() => handleDelete(cat)} className="rounded-lg px-2 py-1.5" style={{ background: t.bgInput, fontSize: "12px" }}>🗑</button>
          </Card>
        ))}
        {sorted.length === 0 && <div className="text-center py-8" style={{ color: t.textMuted, fontSize: "12px" }}>No categories yet.</div>}
      </div>
      <div className="px-1 mt-2" style={{ color: t.textMuted, fontSize: "11px" }}>Use ▲ / ▼ to reorder. Order is saved automatically.</div>
      <CategoryFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} initial={editTarget} />
    </div>
  );
}

/* ====================== EXPENSE CATEGORY ANALYTICS ====================== */
function ExpenseAnalyticsView({ categories, transactions, symbol }) {
  const t = useTheme();
  const [expandedId, setExpandedId] = useState(null);
  const sorted = useMemo(() => [...categories].sort((a, b) => a.order - b.order), [categories]);
  const allWeeks = useMemo(() => {
    const today = new Date();
    if (transactions.length === 0) return buildWeeksRange(today, today);
    const earliest = transactions.reduce((min, tx) => { const d = parseISODate(tx.date); return d < min ? d : min; }, parseISODate(transactions[0].date));
    return buildWeeksRange(earliest, today);
  }, [transactions]);
  const lastTwo = allWeeks.slice(-2);
  function sumsFor(catId, weeks) {
    let expense = 0, income = 0;
    weeks.forEach((w) => { transactions.forEach((tx) => { if (tx.categoryId !== catId) return; const d = parseISODate(tx.date); if (d >= w.start && d <= w.end) { if (tx.type === "expense") expense += tx.amount; else income += tx.amount; } }); });
    return { expense, income };
  }
  return (
    <div>
      <SectionTitle icon="📊" title="Expense Category Analytics" />
      <div className="flex flex-col gap-2">
        {sorted.map((cat) => {
          const recent = sumsFor(cat.id, lastTwo);
          const expanded = expandedId === cat.id;
          return (
            <Card key={cat.id} className="p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 32, height: 32, background: `${cat.color}22`, fontSize: "14px" }}>{cat.icon}</div>
                <div className="flex-1 text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{cat.name}</div>
              </div>
              <div className="flex gap-2 mb-2">
                <div className="flex-1 rounded-xl p-2" style={{ background: t.redSoft }}>
                  <div style={{ color: t.textMuted, fontSize: "10px" }}>Last 2 weeks · Expense</div>
                  <div className="text-sm font-bold" style={{ color: t.red, fontFamily: "monospace" }}>{formatMoney(recent.expense, symbol)}</div>
                </div>
                <div className="flex-1 rounded-xl p-2" style={{ background: t.greenSoft }}>
                  <div style={{ color: t.textMuted, fontSize: "10px" }}>Last 2 weeks · Income</div>
                  <div className="text-sm font-bold" style={{ color: t.green, fontFamily: "monospace" }}>{formatMoney(recent.income, symbol)}</div>
                </div>
              </div>
              <button onClick={() => setExpandedId(expanded ? null : cat.id)} className="font-semibold" style={{ color: t.blue, fontSize: "12px" }}>Details {expanded ? "▴" : "▾"}</button>
              {expanded && (
                <div className="mt-2 flex flex-col gap-1">
                  {allWeeks.map((w) => {
                    const s = sumsFor(cat.id, [w]);
                    return (
                      <div key={w.key} className="flex items-center justify-between py-1.5 px-1" style={{ borderTop: `1px solid ${t.border}` }}>
                        <span style={{ color: t.textSecondary, fontSize: "11px" }}>{weekRangeLabel(w.start, w.end)}</span>
                        <div className="flex gap-3">
                          <span style={{ color: t.red, fontFamily: "monospace", fontSize: "11px" }}>−{formatMoney(s.expense, symbol)}</span>
                          <span style={{ color: t.green, fontFamily: "monospace", fontSize: "11px" }}>+{formatMoney(s.income, symbol)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ====================== SHORTCUTS MANAGEMENT ====================== */
function ShortcutFormModal({ open, onClose, onSave, initial }) {
  const t = useTheme();
  const [name, setName] = useState(""); const [value, setValue] = useState(""); const [type, setType] = useState("expense");
  const [buttonColor, setButtonColor] = useState("#1A1A1A"); const [textColor, setTextColor] = useState("#FF4D6D");
  useEffect(() => { if (open) { setName(initial ? initial.name : ""); setValue(initial ? String(initial.value) : ""); setType(initial ? initial.type : "expense"); setButtonColor(initial ? initial.buttonColor : "#1A1A1A"); setTextColor(initial ? initial.textColor : "#FF4D6D"); } }, [open, initial]);
  const canSave = name.trim() && !isNaN(parseFloat(value)) && parseFloat(value) > 0;
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Shortcut" : "New Shortcut"}>
      <div className="flex flex-col gap-3">
        <div><div className="mb-1.5" style={{ color: t.textSecondary, fontSize: "12px" }}>Name</div><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coffee" className="w-full text-sm px-3 py-2.5 rounded-xl outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}` }} /></div>
        <div><div className="mb-1.5" style={{ color: t.textSecondary, fontSize: "12px" }}>Value</div><input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="0.00" className="w-full text-sm px-3 py-2.5 rounded-xl outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}`, fontFamily: "monospace" }} /></div>
        <SegmentedControl options={[{ label: "Expense", value: "expense" }, { label: "Income", value: "income" }]} value={type} onChange={setType} accent={type === "expense" ? t.red : t.green} />
        <ColorPicker value={buttonColor} onChange={setButtonColor} label="Button color" />
        <ColorPicker value={textColor} onChange={setTextColor} label="Text color" />
        <div className="rounded-xl px-3.5 py-2.5 text-xs font-semibold text-center" style={{ background: buttonColor, color: textColor, border: `1px solid ${t.border}` }}>Preview: {type === "income" ? "+" : "−"}{value || "0"} · {name || "Shortcut"}</div>
        <PrimaryButton full disabled={!canSave} onClick={() => { onSave({ name: name.trim(), value: parseFloat(value), type, buttonColor, textColor }); onClose(); }}>✓ Save Shortcut</PrimaryButton>
      </div>
    </Modal>
  );
}
function ShortcutsManageView({ shortcuts, setShortcuts, pushToast }) {
  const t = useTheme();
  const [modalOpen, setModalOpen] = useState(false); const [editTarget, setEditTarget] = useState(null);
  function handleSave(data) {
    if (editTarget) { setShortcuts((prev) => prev.map((s) => (s.id === editTarget.id ? { ...s, ...data } : s))); pushToast("Shortcut updated"); }
    else { setShortcuts((prev) => [...prev, { id: uid(), ...data }]); pushToast("Shortcut created"); }
    setEditTarget(null);
  }
  return (
    <div>
      <SectionTitle icon="✨" title="Manage Shortcuts" right={<button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="font-semibold" style={{ color: t.green, fontSize: "12px" }}>+ Add</button>} />
      <div className="flex flex-col gap-2">
        {shortcuts.map((s) => (
          <Card key={s.id} className="p-3 flex items-center gap-2">
            <div className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: s.buttonColor, color: s.textColor, border: `1px solid ${t.border}` }}>{s.type === "income" ? "+" : "−"}{formatExact(s.value)} · {s.name}</div>
            <div className="flex-1" />
            <button onClick={() => { setEditTarget(s); setModalOpen(true); }} className="rounded-lg px-2 py-1.5" style={{ background: t.bgInput, fontSize: "12px" }}>✎</button>
            <button onClick={() => { setShortcuts((prev) => prev.filter((x) => x.id !== s.id)); pushToast("Shortcut deleted"); }} className="rounded-lg px-2 py-1.5" style={{ background: t.bgInput, fontSize: "12px" }}>🗑</button>
          </Card>
        ))}
        {shortcuts.length === 0 && <div className="text-center py-8" style={{ color: t.textMuted, fontSize: "12px" }}>No shortcuts yet.</div>}
      </div>
      <ShortcutFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} initial={editTarget} />
    </div>
  );
}

/* ====================== REPORTS ====================== */
function ReportsView({ transactions, symbol }) {
  const t = useTheme();
  const [mode, setMode] = useState("weekly");
  const weeks = useMemo(() => { if (transactions.length === 0) return []; const today = new Date(); const earliest = transactions.reduce((min, tx) => { const d = parseISODate(tx.date); return d < min ? d : min; }, parseISODate(transactions[0].date)); return buildWeeksRange(earliest, today).reverse(); }, [transactions]);
  const months = useMemo(() => { if (transactions.length === 0) return []; const today = new Date(); const earliest = transactions.reduce((min, tx) => { const d = parseISODate(tx.date); return d < min ? d : min; }, parseISODate(transactions[0].date)); return buildMonthsRange(earliest, today).reverse(); }, [transactions]);
  function sumsForWeek(w) { let expense = 0, income = 0; transactions.forEach((tx) => { const d = parseISODate(tx.date); if (d >= w.start && d <= w.end) { if (tx.type === "expense") expense += tx.amount; else income += tx.amount; } }); return { expense, income }; }
  function sumsForMonth(m) { let expense = 0, income = 0; transactions.forEach((tx) => { const d = parseISODate(tx.date); if (d.getFullYear() === m.year && d.getMonth() === m.month) { if (tx.type === "expense") expense += tx.amount; else income += tx.amount; } }); return { expense, income }; }
  return (
    <div>
      <SectionTitle icon="📋" title="Reports" />
      <div className="mb-3"><SegmentedControl options={[{ label: "Weekly", value: "weekly" }, { label: "Monthly", value: "monthly" }]} value={mode} onChange={setMode} accent={t.blue} /></div>
      <Card className="p-3.5">
        <div className="flex flex-col gap-1">
          {mode === "weekly" ? (
            weeks.length === 0 ? <div className="text-center py-6" style={{ color: t.textMuted, fontSize: "12px" }}>No data yet.</div> :
            weeks.map((w) => { const s = sumsForWeek(w); return (
              <div key={w.key} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
                <span style={{ color: t.textSecondary, fontSize: "12px" }}>{weekRangeLabel(w.start, w.end)}</span>
                <div className="flex gap-3"><span className="font-semibold" style={{ color: t.red, fontFamily: "monospace", fontSize: "12px" }}>−{formatMoney(s.expense, symbol)}</span><span className="font-semibold" style={{ color: t.green, fontFamily: "monospace", fontSize: "12px" }}>+{formatMoney(s.income, symbol)}</span></div>
              </div>
            ); })
          ) : (
            months.length === 0 ? <div className="text-center py-6" style={{ color: t.textMuted, fontSize: "12px" }}>No data yet.</div> :
            months.map((m) => { const s = sumsForMonth(m); return (
              <div key={m.key} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
                <span style={{ color: t.textSecondary, fontSize: "12px" }}>{MONTH_LABELS[m.month]} {m.year}</span>
                <div className="flex gap-3"><span className="font-semibold" style={{ color: t.red, fontFamily: "monospace", fontSize: "12px" }}>−{formatMoney(s.expense, symbol)}</span><span className="font-semibold" style={{ color: t.green, fontFamily: "monospace", fontSize: "12px" }}>+{formatMoney(s.income, symbol)}</span></div>
              </div>
            ); })
          )}
        </div>
      </Card>
    </div>
  );
}

/* ====================== SEARCH ====================== */
function SearchView({ transactions, categories, selectedYear, setSelectedYear }) {
  const t = useTheme();
  const [query, setQuery] = useState("");
  const years = useMemo(() => { const set = new Set(transactions.map((tx) => parseISODate(tx.date).getFullYear())); set.add(new Date().getFullYear()); return Array.from(set).sort((a, b) => b - a); }, [transactions]);
  const results = useMemo(() => {
    const yearTx = transactions.filter((tx) => parseISODate(tx.date).getFullYear() === selectedYear);
    if (!query.trim()) return yearTx.sort((a, b) => b.date.localeCompare(a.date));
    const q = query.toLowerCase();
    return yearTx.filter((tx) => { const cat = categories.find((c) => c.id === tx.categoryId); return tx.description.toLowerCase().includes(q) || (cat && cat.name.toLowerCase().includes(q)) || String(tx.amount).includes(q); }).sort((a, b) => b.date.localeCompare(a.date));
  }, [query, transactions, categories, selectedYear]);
  return (
    <div>
      <SectionTitle icon="🔍" title="Search" right={<select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="text-xs rounded-lg px-2 py-1 outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}` }}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>} />
      <div className="mb-3"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Description, category, amount…" className="w-full text-sm px-3 py-2.5 rounded-xl outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}` }} /></div>
      <Card className="p-2">
        {results.length === 0 ? <div className="text-center py-8" style={{ color: t.textMuted, fontSize: "12px" }}>No transactions found in {selectedYear}.</div> : (
          <div className="flex flex-col">
            {results.map((tx) => { const cat = categories.find((c) => c.id === tx.categoryId); return (
              <div key={tx.id} className="flex items-center gap-2 py-2 px-1.5" style={{ borderBottom: `1px solid ${t.border}` }}>
                <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 28, height: 28, background: `${(cat ? cat.color : t.textMuted)}1F`, fontSize: "14px" }}>{cat ? cat.icon : "•"}</div>
                <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate" style={{ color: t.textPrimary }}>{tx.description}</div><div style={{ color: t.textMuted, fontSize: "11px" }}>{tx.date} · {cat ? cat.name : "Uncategorized"}</div></div>
                <div className="text-sm font-semibold shrink-0" style={{ color: tx.type === "income" ? t.green : t.red, fontFamily: "monospace" }}>{tx.type === "income" ? "+" : "−"}{formatMoney(tx.amount, "$")}</div>
              </div>
            ); })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ====================== IMPORT / EXPORT ====================== */
function ImportExportView({ initialBalance, transactions, categories, shortcuts, setTransactions, setCategories, pushToast }) {
  const t = useTheme();
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);
  function handleExport() {
    const payload = { app: "Klarity Flow", exportedAt: new Date().toISOString(), initialBalance, categories, shortcuts, transactions: transactions.map((tx) => ({ id: tx.id, date: tx.date, description: tx.description, amount: tx.amount, type: tx.type, category: (categories.find((c) => c.id === tx.categoryId) || {}).name || null, metadata: { categoryId: tx.categoryId, createdAt: tx.createdAt } })) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `klarity-flow-export-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    pushToast("Exported transactions");
  }
  function handleFileSelect(e) {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const incomingTx = Array.isArray(data.transactions) ? data.transactions : [];
        const newCount = incomingTx.filter((tx) => !transactions.some((existing) => existing.id === tx.id)).length;
        const newCats = Array.isArray(data.categories) ? data.categories.filter((c) => !categories.some((existing) => existing.name.toLowerCase() === c.name.toLowerCase())) : [];
        setPreview({ raw: data, newCount, dupCount: incomingTx.length - newCount, newCats: newCats.length, totalTx: incomingTx.length });
      } catch (err) { pushToast("Invalid file — couldn't parse JSON"); }
    };
    reader.readAsText(file);
  }
  function confirmImport() {
    if (!preview) return; const data = preview.raw;
    const catByName = {}; categories.forEach((c) => { catByName[c.name.toLowerCase()] = c; });
    const catsToAdd = [];
    (data.categories || []).forEach((c) => {
      if (!catByName[c.name.toLowerCase()]) {
        const maxOrder = (categories.length ? Math.max(...categories.map((x) => x.order)) : -1) + catsToAdd.length + 1;
        const newCat = { id: uid(), name: c.name, color: c.color || COLOR_PRESETS[0], icon: c.icon || "✨", order: maxOrder };
        catsToAdd.push(newCat); catByName[c.name.toLowerCase()] = newCat;
      }
    });
    if (catsToAdd.length) setCategories((prev) => [...prev, ...catsToAdd]);
    const existingIds = new Set(transactions.map((tx) => tx.id));
    const txToAdd = (data.transactions || []).filter((tx) => !existingIds.has(tx.id)).map((tx) => ({ id: tx.id || uid(), date: tx.date, description: tx.description, amount: tx.amount, type: tx.type, categoryId: (tx.category && catByName[String(tx.category).toLowerCase()] && catByName[String(tx.category).toLowerCase()].id) || (tx.metadata && tx.metadata.categoryId) || null, createdAt: (tx.metadata && tx.metadata.createdAt) || Date.now() }));
    if (txToAdd.length) setTransactions((prev) => [...prev, ...txToAdd]);
    pushToast(`Imported ${txToAdd.length} transaction(s)`);
    setPreview(null);
  }
  return (
    <div>
      <SectionTitle icon="⬇️" title="Import & Export" />
      <Card className="p-4 mb-3">
        <div className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>Export your data</div>
        <div className="mb-3" style={{ color: t.textMuted, fontSize: "12px" }}>Download all transactions, categories, and shortcuts as a Klarity Flow JSON file.</div>
        <PrimaryButton full onClick={handleExport} color={t.blue}>⬇ Export</PrimaryButton>
      </Card>
      <Card className="p-4">
        <div className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>Import from another Klarity Flow file</div>
        <div className="mb-3" style={{ color: t.textMuted, fontSize: "12px" }}>Duplicate transactions are skipped automatically.</div>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleFileSelect} />
        <GhostButton full onClick={() => fileRef.current && fileRef.current.click()}>⬆ Choose File</GhostButton>
        {preview && (
          <div className="mt-3 p-3 rounded-xl" style={{ background: t.bgInput }}>
            <div className="mb-2" style={{ color: t.textSecondary, fontSize: "12px" }}>{preview.totalTx} transaction(s) found · {preview.newCount} new, {preview.dupCount} duplicate(s) skipped · {preview.newCats} new categories</div>
            <div className="flex gap-2"><PrimaryButton onClick={confirmImport} color={t.green}>✓ Confirm Import</PrimaryButton><GhostButton onClick={() => setPreview(null)}>Cancel</GhostButton></div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ====================== SETTINGS ====================== */
function SettingsView({ settings, setSettings, pushToast, onResetAll }) {
  const t = useTheme();
  return (
    <div>
      <SectionTitle icon="⚙️" title="Settings" />
      <Card className="p-4 mb-3">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium" style={{ color: t.textPrimary }}>{settings.theme === "dark" ? "🌙" : "☀️"} Dark mode</span>
          <Switch checked={settings.theme === "dark"} onChange={(v) => setSettings((s) => ({ ...s, theme: v ? "dark" : "light" }))} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium" style={{ color: t.textPrimary }}>{settings.notifications ? "🔔" : "🔕"} Notifications</span>
          <Switch checked={settings.notifications} onChange={(v) => setSettings((s) => ({ ...s, notifications: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: t.textPrimary }}>Currency symbol</span>
          <input value={settings.symbol || "$"} onChange={(e) => setSettings((s) => ({ ...s, symbol: e.target.value.slice(0, 3) }))} className="w-16 text-sm px-2.5 py-1.5 rounded-lg text-center outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}`, fontFamily: "monospace" }} />
        </div>
      </Card>
      <Card className="p-4 mb-3">
        <div className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>AI Assistant Setup</div>
        <div className="mb-3" style={{ color: t.textMuted, fontSize: "12px" }}>Paste the Cloudflare Worker URL and the App Secret you set up for it. Both stay only on this device.</div>
        <div className="mb-2">
          <div className="mb-1" style={{ color: t.textSecondary, fontSize: "11px" }}>Worker URL</div>
          <input value={settings.aiBackendUrl || ""} onChange={(e) => setSettings((s) => ({ ...s, aiBackendUrl: e.target.value.trim() }))} placeholder="https://your-worker.your-name.workers.dev" className="w-full text-sm px-3 py-2 rounded-lg outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}`, fontFamily: "monospace", fontSize: "12px" }} />
        </div>
        <div>
          <div className="mb-1" style={{ color: t.textSecondary, fontSize: "11px" }}>App Secret</div>
          <input value={settings.aiSecret || ""} onChange={(e) => setSettings((s) => ({ ...s, aiSecret: e.target.value }))} placeholder="the same secret you put in the Worker" className="w-full text-sm px-3 py-2 rounded-lg outline-none" style={{ background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}`, fontFamily: "monospace", fontSize: "12px" }} />
        </div>
      </Card>
      <Card className="p-4 mb-3">
        <div className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>Receipt Scanner</div>
        <div style={{ color: t.textMuted, fontSize: "12px" }}>Not included in this phone-only version yet — it needs image upload support added to the Worker. The AI Assistant works the same way either way.</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>Reset all data</div>
        <div className="mb-3" style={{ color: t.textMuted, fontSize: "12px" }}>Permanently clears transactions, categories, and shortcuts on this device.</div>
        <GhostButton full onClick={() => { if (window.confirm("This will permanently delete all Klarity Flow data on this device. Continue?")) onResetAll(); }}>↺ Clear All Data</GhostButton>
      </Card>
    </div>
  );
}

/* ====================== MAIN APP ====================== */
function App() {
  const [loaded, setLoaded] = useState(false);
  const [initialBalance, setInitialBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [settings, setSettings] = useState({ theme: "dark", notifications: true, symbol: "$" });
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [toasts, setToasts] = useState([]);

  const theme = settings.theme === "light" ? LIGHT : DARK;
  const symbol = settings.symbol || "$";

  function pushToast(text) { const id = uid(); setToasts((t) => [...t, { id, text }]); setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500); }

  useEffect(() => {
    try {
      const data = storageGet(STORAGE_KEY);
      if (data) {
        if (typeof data.initialBalance === "number") setInitialBalance(data.initialBalance);
        if (Array.isArray(data.transactions)) setTransactions(data.transactions);
        if (Array.isArray(data.categories) && data.categories.length) setCategories(data.categories);
        if (Array.isArray(data.shortcuts) && data.shortcuts.length) setShortcuts(data.shortcuts);
        if (data.settings) setSettings((s) => ({ ...s, ...data.settings }));
      }
    } catch (e) {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const handle = setTimeout(() => { storageSet(STORAGE_KEY, { initialBalance, transactions, categories, shortcuts, settings }); }, 400);
    return () => clearTimeout(handle);
  }, [loaded, initialBalance, transactions, categories, shortcuts, settings]);

  const sortedAll = useMemo(() => [...transactions].sort((a, b) => (a.date + String(a.createdAt)).localeCompare(b.date + String(b.createdAt))), [transactions]);
  const currentBalance = useMemo(() => transactions.reduce((bal, tx) => bal + (tx.type === "income" ? tx.amount : -tx.amount), initialBalance), [transactions, initialBalance]);
  const todayNet = useMemo(() => { const today = todayISO(); return transactions.filter((tx) => tx.date === today).reduce((s, tx) => s + (tx.type === "income" ? tx.amount : -tx.amount), 0); }, [transactions]);
  function runningBalanceFor(txId) { let bal = initialBalance; for (const tx of sortedAll) { bal += tx.type === "income" ? tx.amount : -tx.amount; if (tx.id === txId) return bal; } return bal; }
  function addTransaction({ description, amount, type, categoryId, date }) {
    setTransactions((prev) => [...prev, { id: uid(), description, amount, type, categoryId, date: date || selectedDate, createdAt: Date.now() }]);
    pushToast(type === "income" ? "Income added" : "Expense added");
  }
  function deleteTransaction(id) { setTransactions((prev) => prev.filter((tx) => tx.id !== id)); pushToast("Transaction deleted"); }
  function handleShortcutTap(s) { addTransaction({ description: s.name, amount: s.value, type: s.type, categoryId: null, date: selectedDate }); }
  function handleResetAll() { setInitialBalance(0); setTransactions([]); setCategories(DEFAULT_CATEGORIES); setShortcuts(DEFAULT_SHORTCUTS); pushToast("All data cleared"); }

  return (
    <ThemeCtx.Provider value={theme}>
      <div style={{ background: theme.bgDeep, minHeight: "100vh", color: theme.textPrimary, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <TopBar onMenu={() => setSidebarOpen(true)} onSearch={() => setView("search")} />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} view={view} setView={setView} />
        <main className="px-4 pt-3 pb-10 max-w-md mx-auto">
          {view === "dashboard" && (
            <React.Fragment>
              <BalanceCard initialBalance={initialBalance} setInitialBalance={setInitialBalance} currentBalance={currentBalance} todayNet={todayNet} symbol={symbol} />
              <QuickAddForm categories={[...categories].sort((a, b) => a.order - b.order)} onAdd={addTransaction} symbol={symbol} />
              <ShortcutsRow shortcuts={shortcuts} onTap={handleShortcutTap} onManage={() => setView("shortcuts")} />
              <CalendarPanel selectedDate={selectedDate} setSelectedDate={setSelectedDate} transactions={transactions} />
              <GraphPanel transactions={transactions} selectedDate={selectedDate} />
              <TransactionList transactions={transactions} categories={categories} selectedDate={selectedDate} onDelete={deleteTransaction} runningBalanceFor={runningBalanceFor} symbol={symbol} />
            </React.Fragment>
          )}
          {view === "shortcuts" && <ShortcutsManageView shortcuts={shortcuts} setShortcuts={setShortcuts} pushToast={pushToast} />}
          {view === "categories" && <CategoriesView categories={categories} setCategories={setCategories} transactions={transactions} setTransactions={setTransactions} pushToast={pushToast} />}
          {view === "analytics" && <ExpenseAnalyticsView categories={categories} transactions={transactions} symbol={symbol} />}
          {view === "reports" && <ReportsView transactions={transactions} symbol={symbol} />}
          {view === "search" && <SearchView transactions={transactions} categories={categories} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}
          {view === "ai" && <AIAssistantView transactions={transactions} categories={categories} initialBalance={initialBalance} symbol={symbol} settings={settings} />}
          {view === "importExport" && <ImportExportView initialBalance={initialBalance} transactions={transactions} categories={categories} shortcuts={shortcuts} setTransactions={setTransactions} setCategories={setCategories} pushToast={pushToast} />}
          {view === "settings" && <SettingsView settings={settings} setSettings={setSettings} pushToast={pushToast} onResetAll={handleResetAll} />}
        </main>
        <ToastStack toasts={toasts} />
      </div>
    </ThemeCtx.Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
