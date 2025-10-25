import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosClient";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

const TAB_OPTIONS = [
  { key: "DAILY", label: "Daily" },
  { key: "WEEKLY", label: "Weekly" },
  { key: "MONTHLY", label: "Monthly" },
  { key: "YEARLY", label: "Yearly" },
  { key: "SEARCH", label: "Search" },
  { key: "CALENDAR", label: "Calendar" },
];

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
      const label = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      list.push({ key, label });
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
      const label = `${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${end.toLocaleDateString("en-US", { day: "numeric" })}`;
      list.push({ key, label });
    }
  } else if (period === "MONTHLY") {
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      list.push({ key, label });
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
    description: item.description || item.category?.name || "Income",
    category: item.category?.name || "Income",
    date: item.date,
    dateObj: new Date(item.date),
  }));

  const expenses = expenseItems.map((item) => ({
    id: `expense-${item.id}`,
    type: "expense",
    amount: Math.abs(Number(item.amount)),
    description: item.description || item.category?.name || "Expense",
    category: item.category?.name || "Expense",
    date: item.date,
    dateObj: new Date(item.date),
  }));

  return [...income, ...expenses].sort((a, b) => b.dateObj - a.dateObj);
}

function formatDateTime(date) {
  return date.toLocaleString(undefined, {
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

  const searchTotals = useMemo(() => {
    const income = searchResults
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expense = searchResults
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { income, expense };
  }, [searchResults]);

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
        Loading analysis...
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
          <h1 className="text-xl font-semibold text-text-secondary">Analysis</h1>
          <span className="h-8 w-8" />
        </div>

        <header className="rounded-4xl border border-border/60 bg-base-card p-6 text-text-secondary shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-text-muted">
                Overview
              </p>
              <h2 className="mt-2 text-3xl font-display font-semibold">
                ${formatMoney(summary.balance)}
              </h2>
              <p className="text-xs text-text-muted">
                30% Of Your Expenses. Looks good.
              </p>
            </div>
            <div className="rounded-3xl bg-brand/15 px-4 py-2 text-right text-sm">
              <p className="text-text-muted">Income</p>
              <p className="font-semibold text-brand">
                ${formatMoney(summary.totalIncome)}
              </p>
            </div>
            <div className="rounded-3xl bg-sky-light/15 px-4 py-2 text-right text-sm">
              <p className="text-text-muted">Expense</p>
              <p className="font-semibold text-sky-light">
                ${formatMoney(summary.totalExpense)}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-6 flex gap-2">
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? "bg-brand text-base-dark shadow-card"
                  : "bg-base-card text-text-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {showChart && (
          <>
            <div className="mt-6 rounded-4xl border border-border/60 bg-base-card p-6 shadow-card">
              <div className="flex items-center justify-between text-sm text-text-muted">
                <p>Income & Expense</p>
                <p>Last period snapshot</p>
              </div>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartInfo.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0b2c2c" />
                    <XAxis dataKey="label" stroke="#8FA9A9" />
                    <YAxis stroke="#8FA9A9" />
                    <Tooltip
                      contentStyle={{
                        background: "#0E3E3E",
                        borderRadius: "16px",
                        border: "1px solid #144444",
                        color: "#F1FFF3",
                      }}
                      formatter={(value) => `$${formatMoney(value)}`}
                    />
                    <Bar dataKey="income" fill="#00D09E" radius={[12, 12, 0, 0]} />
                    <Bar dataKey="expense" fill="#6DB6FE" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-3xl border border-brand/40 bg-brand/15 px-4 py-4">
                <p className="text-text-muted">Income</p>
                <p className="mt-1 text-lg font-semibold text-brand">
                  ${formatMoney(chartInfo.incomeTotal)}
                </p>
              </div>
              <div className="rounded-3xl border border-sky-light/40 bg-sky-light/15 px-4 py-4">
                <p className="text-text-muted">Expense</p>
                <p className="mt-1 text-lg font-semibold text-sky-light">
                  ${formatMoney(chartInfo.expenseTotal)}
                </p>
              </div>
              <div className="col-span-2 rounded-3xl border border-border/60 bg-base-card px-4 py-4">
                <p className="text-text-muted">Balance</p>
                <p className="mt-1 text-lg font-semibold text-text-secondary">
                  ${formatMoney(chartInfo.balance)}
                </p>
              </div>
            </div>
          </>
        )}

        {activeTab === "SEARCH" && (
          <section className="mt-6 space-y-5 rounded-4xl border border-border/60 bg-base-card p-6 shadow-card">
            <h2 className="text-sm font-semibold text-text-secondary">Search</h2>
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-4">
              <input
                type="text"
                name="query"
                value={searchForm.query}
                onChange={handleSearchChange}
                placeholder="Description or category"
                className="rounded-3xl border border-border bg-base-dark px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  name="type"
                  value={searchForm.type}
                  onChange={handleSearchChange}
                  className="rounded-3xl border border-border bg-base-dark px-4 py-3 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                  <option value="ALL">All types</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
                <select
                  name="category"
                  value={searchForm.category}
                  onChange={handleSearchChange}
                  className="rounded-3xl border border-border bg-base-dark px-4 py-3 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                  <option value="">All categories</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-text-muted">
                <div className="space-y-2">
                  <label className="uppercase tracking-wide">From</label>
                  <input
                    type="date"
                    name="from"
                    value={searchForm.from}
                    onChange={handleSearchChange}
                    className="w-full rounded-3xl border border-border bg-base-dark px-4 py-3 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="uppercase tracking-wide">To</label>
                  <input
                    type="date"
                    name="to"
                    value={searchForm.to}
                    onChange={handleSearchChange}
                    className="w-full rounded-3xl border border-border bg-base-dark px-4 py-3 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="rounded-3xl bg-brand px-5 py-3 text-sm font-semibold text-base-dark shadow-card transition hover:bg-brand/90"
              >
                Search
              </button>
            </form>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-3xl border border-brand/40 bg-brand/15 px-4 py-4">
                <p className="text-text-muted">Income</p>
                <p className="mt-1 text-lg font-semibold text-brand">
                  ${formatMoney(searchTotals.income)}
                </p>
              </div>
              <div className="rounded-3xl border border-sky-light/40 bg-sky-light/15 px-4 py-4">
                <p className="text-text-muted">Expense</p>
                <p className="mt-1 text-lg font-semibold text-sky-light">
                  ${formatMoney(searchTotals.expense)}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {searchResults.length === 0 ? (
                <p className="rounded-3xl border border-border/60 bg-base-dark px-4 py-4 text-center text-text-muted">
                  No results for the selected filters.
                </p>
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
                {selectedMonth.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
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
              {calendarDays.map((day, index) =>
                day ? (
                  <div
                    key={`${day.date}-${index}`}
                    className="rounded-3xl border border-border/40 bg-base-dark px-2 py-3 text-center text-xs text-text-secondary"
                  >
                    <p className="text-sm font-semibold text-text-secondary">
                      {day.date.getDate()}
                    </p>
                    <p className="mt-1 text-[11px] text-brand">
                      +${formatMoney(day.income)}
                    </p>
                    <p className="text-[11px] text-sky-light">
                      -${formatMoney(day.expense)}
                    </p>
                  </div>
                ) : (
                  <div key={`empty-${index}`} />
                ),
              )}
            </div>
            <div className="rounded-3xl border border-border/60 bg-base-dark px-4 py-4 text-sm">
              <p className="text-text-muted">
                Monthly balance
              </p>
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
    </div>
  );
}
