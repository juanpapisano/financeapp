import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosClient";
import DateInput from "../components/DateInput";
import EmptyState from "../components/EmptyState";
import NavBar from "../components/NavBar";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { ChevronLeft, ChevronRight, ArrowLeft, Search } from "lucide-react";

const TAB_OPTIONS = [
  { key: "DAILY", label: "Diario" },
  { key: "WEEKLY", label: "Semanal" },
  { key: "MONTHLY", label: "Mensual" },
  { key: "YEARLY", label: "Anual" },
  { key: "SEARCH", label: "Buscar" },
  { key: "CALENDAR", label: "Calendario" },
];

const WEEKDAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

const capitalize = (value = "") =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

function formatMoney(value = 0) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getISOWeekInfo(date) {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((temp - yearStart) / 86400000 + 1) / 7);
  return { week, year: temp.getUTCFullYear() };
}

function getStartOfISOWeek(year, week) {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayNum = simple.getUTCDay() || 7;
  if (dayNum <= 4) {
    simple.setUTCDate(simple.getUTCDate() - (dayNum - 1));
  } else {
    simple.setUTCDate(simple.getUTCDate() + (8 - dayNum));
  }
  return new Date(simple);
}

function getPeriodKey(date, period) {
  if (period === "DAILY") {
    return toDateKey(date);
  }
  if (period === "WEEKLY") {
    const { week, year } = getISOWeekInfo(date);
    return `${year}-W${String(week).padStart(2, "0")}`;
  }
  if (period === "MONTHLY") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  if (period === "YEARLY") {
    return `${date.getFullYear()}`;
  }
  return "";
}

function generatePeriodKeyList(period, now) {
  const list = [];
  if (period === "DAILY") {
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      const key = toDateKey(date);
      const label = date.toLocaleDateString("es-AR", {
        month: "short",
        day: "2-digit",
      });
      list.push({ key, label: capitalize(label) });
    }
  } else if (period === "WEEKLY") {
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - (5 - i) * 7);
      const { week, year } = getISOWeekInfo(date);
      const key = `${year}-W${String(week).padStart(2, "0")}`;
      const start = getStartOfISOWeek(year, week);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const labelStart = start.toLocaleDateString("es-AR", {
        month: "short",
        day: "2-digit",
      });
      const labelEnd = end.toLocaleDateString("es-AR", {
        month: "short",
        day: "2-digit",
      });
      list.push({ key, label: `${capitalize(labelStart)} - ${capitalize(labelEnd)}` });
    }
  } else if (period === "MONTHLY") {
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("es-AR", {
        month: "short",
        year: "numeric",
      });
      list.push({ key, label: capitalize(label) });
    }
  } else if (period === "YEARLY") {
    for (let i = 4; i >= 0; i -= 1) {
      const year = now.getFullYear() - (4 - i);
      list.push({ key: `${year}`, label: `${year}` });
    }
  }
  return list;
}

function createAggregateMap(transactions, period) {
  const map = new Map();
  transactions.forEach((tx) => {
    const key = getPeriodKey(tx.dateObj, period);
    if (!map.has(key)) {
      map.set(key, { income: 0, expense: 0 });
    }
    const entry = map.get(key);
    if (tx.type === "income") {
      entry.income += tx.amount;
    } else {
      entry.expense += tx.amount;
    }
  });
  return map;
}

function buildPeriodData(period, transactions) {
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(period)) {
    return { data: [], incomeTotal: 0, expenseTotal: 0, balance: 0 };
  }
  const now = new Date();
  const periodKeys = generatePeriodKeyList(period, now);
  const aggregateMap = createAggregateMap(transactions, period);

  const data = periodKeys.map(({ key, label }) => {
    const entry = aggregateMap.get(key) || { income: 0, expense: 0 };
    return {
      label,
      income: Number(entry.income.toFixed(2)),
      expense: Number(entry.expense.toFixed(2)),
    };
  });

  const incomeTotal = data.reduce((sum, item) => sum + item.income, 0);
  const expenseTotal = data.reduce((sum, item) => sum + item.expense, 0);

  return {
    data,
    incomeTotal,
    expenseTotal,
    balance: incomeTotal - expenseTotal,
  };
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function generateCalendarDays(selectedMonth, transactions) {
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekday = (firstDay.getDay() + 6) % 7; // Monday-first
  const days = [];

  const dailyAggregate = createAggregateMap(transactions, "DAILY");

  for (let i = 0; i < firstWeekday; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const key = getPeriodKey(date, "DAILY");
    const entry = dailyAggregate.get(key) || { income: 0, expense: 0 };
    days.push({ date, income: entry.income, expense: entry.expense });
  }

  return days;
}

function normalizeTransactions(incomeItems = [], expenseItems = []) {
  const income = incomeItems.map((item) => ({
    id: `income-${item.id}`,
    type: "income",
    amount: Number(item.amount),
    description: item.description || item.category?.name || "Ingreso",
    category: item.category?.name || "Ingreso",
    date: item.date,
    dateObj: new Date(item.date),
  }));

  const expenses = expenseItems.map((item) => ({
    id: `expense-${item.id}`,
    type: "expense",
    amount: Math.abs(Number(item.amount)),
    description: item.description || item.category?.name || "Gasto",
    category: item.category?.name || "Gasto",
    date: item.date,
    dateObj: new Date(item.date),
  }));

  return [...income, ...expenses].sort((a, b) => b.dateObj - a.dateObj);
}

function formatDateTime(date) {
  return date.toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Analysis() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("DAILY");
  const [searchForm, setSearchForm] = useState({
    query: "",
    type: "ALL",
    category: "",
    from: "",
    to: "",
  });
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryRes, incomesRes, expensesRes] = await Promise.all([
          api.get("/summary"),
          api.get("/incomes?pageSize=500"),
          api.get("/expenses?pageSize=500"),
        ]);
        setSummary(summaryRes.data);
        const normalized = normalizeTransactions(
          incomesRes.data.items || [],
          expensesRes.data.items || [],
        );
        setTransactions(normalized);
        setSearchResults(normalized.slice(0, 10));
      } catch (error) {
        console.error("Error loading analysis data", error);
      }
    }
    loadData();
  }, []);

  const categoryOptions = useMemo(() => {
    const set = new Set(transactions.map((tx) => tx.category));
    return Array.from(set).filter(Boolean).sort();
  }, [transactions]);

  const chartInfo = useMemo(
    () => buildPeriodData(activeTab, transactions),
    [activeTab, transactions],
  );

  const calendarDays = useMemo(
    () => generateCalendarDays(selectedMonth, transactions),
    [selectedMonth, transactions],
  );

  const today = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  }, []);

  const searchTotals = useMemo(() => {
    const income = searchResults
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expense = searchResults
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { income, expense };
  }, [searchResults]);

  const currentMonthLabel = useMemo(
    () =>
      capitalize(
        new Date().toLocaleDateString("es-AR", {
          month: "long",
        }),
      ),
    [],
  );

  const expenseShare = useMemo(() => {
    const income = Number(summary?.totalIncome || 0);
    const expense = Number(summary?.totalExpense || 0);
    if (!income) return 0;
    return Math.min(100, Math.max(0, (expense / income) * 100));
  }, [summary]);

  const expenseShareRounded = Math.round(expenseShare);
  const expenseShareTone =
    expenseShareRounded >= 80
      ? { text: "text-red-300", bar: "bg-red-400" }
      : expenseShareRounded >= 50
        ? { text: "text-sky-light", bar: "bg-sky-light" }
        : { text: "text-brand", bar: "bg-brand" };
  const expenseShareWidth = Math.min(100, Math.max(0, expenseShareRounded));

  const handleCalendarDayClick = useCallback(
    (date) => {
      const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const isoDate = toDateKey(normalized);

      const expensesForDay = transactions.filter(
        (tx) => tx.type === "expense" && isSameDay(tx.dateObj, normalized),
      );

      setSearchForm((prev) => ({
        ...prev,
        query: "",
        type: "EXPENSE",
        category: "",
        from: isoDate,
        to: isoDate,
      }));
      setSearchResults(expensesForDay);
      setActiveTab("SEARCH");
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },
    [transactions, setSearchForm, setSearchResults, setActiveTab],
  );

  const handleSearchChange = (event) => {
    const { name, value } = event.target;
    setSearchForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    let results = [...transactions];
    if (searchForm.query) {
      const query = searchForm.query.toLowerCase();
      results = results.filter(
        (tx) =>
          tx.description.toLowerCase().includes(query) ||
          tx.category.toLowerCase().includes(query),
      );
    }
    if (searchForm.type !== "ALL") {
      results = results.filter(
        (tx) => tx.type === searchForm.type.toLowerCase(),
      );
    }
    if (searchForm.category) {
      results = results.filter(
        (tx) => tx.category.toLowerCase() === searchForm.category.toLowerCase(),
      );
    }
    if (searchForm.from) {
      const fromDate = new Date(searchForm.from);
      results = results.filter((tx) => tx.dateObj >= fromDate);
    }
    if (searchForm.to) {
      const toDate = new Date(searchForm.to);
      results = results.filter((tx) => tx.dateObj <= toDate);
    }
    setSearchResults(results);
  };

  const handleMonthChange = (direction) => {
    setSelectedMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  };

  if (!summary) {
    return (
      <div className="min-h-screen bg-base-darkest text-text-muted flex items-center justify-center">
        Cargando análisis...
      </div>
    );
  }

  const showChart = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(
    activeTab,
  );

  return (
    <div className="relative min-h-screen bg-base-darkest text-text-primary">
      <div className="absolute inset-0 bg-gradient-hero opacity-40" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-24 pt-12">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-base-card px-3 py-2 text-text-secondary transition hover:border-brand"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-semibold text-text-secondary">Análisis</h1>
          <span className="h-8 w-8" />
        </div>

        <header className="rounded-4xl border border-border/60 bg-base-card p-6 text-text-secondary shadow-card">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-text-muted">
                  Resumen de {currentMonthLabel}
                </p>
                <h2 className="mt-2 text-3xl font-display font-semibold">
                  ${formatMoney(summary.balance)}
                </h2>
              </div>
              <div className="rounded-3xl border border-border/60 bg-base-dark px-4 py-3 text-xs text-text-muted">
                <p className="uppercase tracking-wide">Relación gastos / ingresos</p>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <span className={`text-lg font-semibold ${expenseShareTone.text}`}>
                    {expenseShareRounded}%
                  </span>
                  <span className="text-[11px] uppercase tracking-wide">
                    del mes actual
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-base-dark/70">
                  <span
                    className={`block h-full rounded-full ${expenseShareTone.bar}`}
                    style={{ width: `${expenseShareWidth}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-3xl border border-brand/30 bg-brand/15 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-text-muted">Ingresos</p>
                <p className="mt-2 text-lg font-semibold text-brand">
                  ${formatMoney(summary.totalIncome)}
                </p>
              </div>
              <div className="rounded-3xl border border-sky-light/30 bg-sky-light/15 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-text-muted">Gastos</p>
                <p className="mt-2 text-lg font-semibold text-sky-light">
                  ${formatMoney(summary.totalExpense)}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-text-secondary">Período de análisis</h2>
            <p className="text-xs text-text-muted">Elegí cómo querés ver el histórico</p>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeTab === tab.key
                    ? "bg-brand text-base-dark shadow-card"
                    : "bg-base-card text-text-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {showChart && (
          <>
            <div className="mt-6 rounded-4xl border border-border/60 bg-base-card p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
                <div>
                  <p className="font-semibold text-text-secondary">Ingresos vs gastos</p>
                  <p className="text-xs">Seguimiento del período seleccionado</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand" />
                    Ingresos
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-light" />
                    Gastos
                  </span>
                </div>
              </div>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartInfo.data}
                    margin={{ top: 10, right: 0, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00D09E" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="#00D09E" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6DB6FE" stopOpacity={0.62} />
                        <stop offset="100%" stopColor="#6DB6FE" stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0b2c2c" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#8FA9A9"
                      tick={{ fill: "#8FA9A9", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#8FA9A9"
                      tick={{ fill: "#8FA9A9", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#032427",
                        borderRadius: "16px",
                        border: "1px solid rgba(0, 208, 158, 0.35)",
                        color: "#F1FFF3",
                        padding: "0.75rem 1rem",
                      }}
                      formatter={(value, name) => [
                        `$${formatMoney(value)}`,
                        name === "income" ? "Ingresos" : "Gastos",
                      ]}
                      labelFormatter={(label) => `Período: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#00D09E"
                      strokeWidth={2.5}
                      fill="url(#incomeGradient)"
                      dot={{ r: 3, fill: "#00D09E", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#00D09E" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      stroke="#6DB6FE"
                      strokeWidth={2.5}
                      fill="url(#expenseGradient)"
                      dot={{ r: 3, fill: "#6DB6FE", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#6DB6FE" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1 text-sm no-scrollbar">
              <div className="min-w-[180px] shrink-0 rounded-3xl border border-brand/40 bg-brand/15 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-text-muted">Ingresos</p>
                <p className="mt-2 text-lg font-semibold text-brand">
                  ${formatMoney(chartInfo.incomeTotal)}
                </p>
              </div>
              <div className="min-w-[180px] shrink-0 rounded-3xl border border-sky-light/40 bg-sky-light/15 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-text-muted">Gastos</p>
                <p className="mt-2 text-lg font-semibold text-sky-light">
                  ${formatMoney(chartInfo.expenseTotal)}
                </p>
              </div>
              <div className="min-w-[200px] shrink-0 rounded-3xl border border-border/60 bg-base-card px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-text-muted">Balance</p>
                <p className="mt-2 text-lg font-semibold text-text-secondary">
                  ${formatMoney(chartInfo.balance)}
                </p>
              </div>
            </div>
          </>
        )}

        {activeTab === "SEARCH" && (
          <section className="mt-6 space-y-5 rounded-4xl border border-border/60 bg-base-card p-6 shadow-card">
            <h2 className="text-sm font-semibold text-text-secondary">Buscar movimientos</h2>
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-4">
              <input
                type="text"
                name="query"
                value={searchForm.query}
                onChange={handleSearchChange}
                placeholder="Descripción o categoría"
                className="rounded-3xl border border-border bg-base-dark px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  name="type"
                  value={searchForm.type}
                  onChange={handleSearchChange}
                  className="rounded-3xl border border-border bg-base-dark px-4 py-3 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                  <option value="ALL">Todos los tipos</option>
                  <option value="INCOME">Ingresos</option>
                  <option value="EXPENSE">Gastos</option>
                </select>
                <select
                  name="category"
                  value={searchForm.category}
                  onChange={handleSearchChange}
                  className="rounded-3xl border border-border bg-base-dark px-4 py-3 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                  <option value="">Todas las categorías</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-text-muted">
                <div className="space-y-2">
                  <label className="uppercase tracking-wide">Desde</label>
                  <DateInput
                    value={searchForm.from}
                    onChange={(event) => handleSearchChange(event)}
                    name="from"
                    placeholder="DD/MM/AAAA"
                    className="mt-0"
                    inputClassName="bg-base-dark"
                  />
                </div>
                <div className="space-y-2">
                  <label className="uppercase tracking-wide">Hasta</label>
                  <DateInput
                    value={searchForm.to}
                    onChange={(event) => handleSearchChange(event)}
                    name="to"
                    placeholder="DD/MM/AAAA"
                    className="mt-0"
                    inputClassName="bg-base-dark"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="rounded-3xl bg-brand px-5 py-3 text-sm font-semibold text-base-dark shadow-card transition hover:bg-brand/90"
              >
                Buscar
              </button>
            </form>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-3xl border border-brand/40 bg-brand/15 px-4 py-4">
                <p className="text-text-muted">Ingresos</p>
                <p className="mt-1 text-lg font-semibold text-brand">
                  ${formatMoney(searchTotals.income)}
                </p>
              </div>
              <div className="rounded-3xl border border-sky-light/40 bg-sky-light/15 px-4 py-4">
                <p className="text-text-muted">Gastos</p>
                <p className="mt-1 text-lg font-semibold text-sky-light">
                  ${formatMoney(searchTotals.expense)}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {searchResults.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="Sin resultados"
                  description="Probá ajustar los filtros o el texto de búsqueda."
                  className="border-dashed border-border/60 bg-base-dark/70"
                />
              ) : (
                searchResults.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-3xl border border-border/60 bg-base-card/90 px-4 py-3 shadow-soft"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text-secondary">
                        {tx.description}
                      </p>
                      <p className="text-xs text-text-muted">
                        {tx.category} · {formatDateTime(tx.dateObj)}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${
                        tx.type === "income" ? "text-brand" : "text-sky-light"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}${formatMoney(tx.amount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === "CALENDAR" && (
          <section className="mt-6 space-y-4 rounded-4xl border border-border/60 bg-base-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleMonthChange(-1)}
                className="rounded-full border border-border/60 bg-base-dark p-2 text-text-secondary transition hover:text-text-primary"
              >
                <ChevronLeft size={18} />
              </button>
              <p className="text-sm font-semibold text-text-secondary">
                {capitalize(
                  selectedMonth.toLocaleDateString("es-AR", {
                    month: "long",
                    year: "numeric",
                  }),
                )}
              </p>
              <button
                type="button"
                onClick={() => handleMonthChange(1)}
                className="rounded-full border border-border/60 bg-base-dark p-2 text-text-secondary transition hover:text-text-primary"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase text-text-muted">
              {WEEKDAY_LABELS.map((day) => (
                <span key={day} className="py-2">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 text-sm">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} />;
                }

                const dayDate = day.date;
                const isToday = isSameDay(dayDate, today);
                const isFuture = dayDate > today;
                const hasExpenses = day.expense > 0;
                const hasIncomes = day.income > 0;
                const hasTransactions = hasExpenses || hasIncomes;
                const isDisabled = isToday || isFuture || !hasTransactions;
                const dayLabel = dayDate.toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                });
                const title = isDisabled
                  ? isFuture || isToday
                    ? "Podés consultar días anteriores a hoy."
                    : `No registraste movimientos el ${dayLabel}`
                  : day.expense > 0
                    ? `Ver gastos del ${dayLabel}`
                    : `Ver ingresos del ${dayLabel}`;

                return (
                  <button
                    key={`${toDateKey(dayDate)}-${index}`}
                    type="button"
                    onClick={() => handleCalendarDayClick(dayDate)}
                    disabled={isDisabled}
                    className={`flex h-20 flex-col items-center justify-center rounded-3xl border border-border/40 bg-base-dark px-2 text-center text-xs transition ${
                      isDisabled
                        ? "cursor-not-allowed opacity-40"
                        : "cursor-pointer hover:border-brand hover:text-text-secondary"
                    }`}
                    title={title}
                  >
                    <span
                      className={`text-sm font-semibold ${
                        isDisabled ? "text-text-muted" : "text-text-secondary"
                      }`}
                    >
                      {dayDate.getDate()}
                    </span>
                    <span
                      className={`mt-2 h-2 w-2 rounded-full ${
                        hasExpenses
                          ? "bg-sky-light"
                          : hasIncomes
                            ? "bg-brand"
                            : "bg-border/50"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="rounded-3xl border border-border/60 bg-base-dark px-4 py-4 text-sm">
              <p className="text-text-muted">Balance mensual</p>
              <p className="mt-1 text-lg font-semibold text-text-secondary">
                ${formatMoney(
                  calendarDays.reduce((sum, day) => {
                    if (!day) return sum;
                    return sum + (day.income - day.expense);
                  }, 0),
                )}
              </p>
            </div>
          </section>
        )}
      </div>

      <NavBar />
    </div>
  );
}
