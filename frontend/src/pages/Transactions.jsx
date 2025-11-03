import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Plus,
  Wallet,
  ShoppingBag,
  HomeIcon,
  Car,
  Layers,
  ReceiptText,
} from "lucide-react";
import api from "../api/axiosClient";
import EmptyState from "../components/EmptyState";
import QuickTransactionForm from "../components/QuickTransactionForm";

const CATEGORY_ICON_MAP = {
  income: Wallet,
  salary: Wallet,
  payment: Wallet,
  groceries: ShoppingBag,
  pantry: ShoppingBag,
  food: ShoppingBag,
  rent: HomeIcon,
  housing: HomeIcon,
  transport: Car,
  fuel: Car,
};

const CATEGORY_COLOR_MAP = {
  income: "bg-brand/25 text-brand",
  salary: "bg-brand/25 text-brand",
  payment: "bg-brand/25 text-brand",
  groceries: "bg-sky-light/25 text-sky-light",
  pantry: "bg-sky-light/25 text-sky-light",
  food: "bg-sky-light/25 text-sky-light",
  rent: "bg-brand/35 text-brand",
  housing: "bg-brand/35 text-brand",
  transport: "bg-sky-light/25 text-sky-light",
  fuel: "bg-sky-light/25 text-sky-light",
  default: "bg-base-dark text-text-secondary",
};

const formatMoney = (value = 0) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatTime = (iso) => {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const monthLabel = (iso) => {
  const date = new Date(iso);
  const formatted = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const CategoryIcon = ({ category = "" }) => {
  const key = category.toLowerCase();
  const Icon = CATEGORY_ICON_MAP[key] || Layers;
  const classes = CATEGORY_COLOR_MAP[key] || CATEGORY_COLOR_MAP.default;
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${classes}`}>
      <Icon size={18} />
    </div>
  );
};

export default function Transactions() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const navigate = useNavigate();

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.get("/summary");
      setSummary(res.data);
    } catch (error) {
      console.error("Error loading summary", error);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const [expensesRes, incomesRes] = await Promise.all([
        api.get("/expenses?pageSize=100"),
        api.get("/incomes?pageSize=100"),
      ]);

      const expenses =
        expensesRes.data.items?.map((item) => ({
          id: `expense-${item.id}`,
          type: "expense",
          amount: -Math.abs(Number(item.amount)),
          description: item.description || item.category?.name || "Gasto",
          date: item.date,
          category: item.category?.name || "Gasto",
        })) || [];

      const incomes =
        incomesRes.data.items?.map((item) => ({
          id: `income-${item.id}`,
          type: "income",
          amount: Math.abs(Number(item.amount)),
          description: item.description || item.category?.name || "Ingreso",
          date: item.date,
          category: item.category?.name || "Ingreso",
        })) || [];

      const merged = [...expenses, ...incomes].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      );

      setTransactions(merged);
    } catch (error) {
      console.error("Error loading transactions", error);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((tx) => tx.type === filter);
  }, [transactions, filter]);

  const groupedByMonth = useMemo(() => {
    const result = {};
    filteredTransactions.forEach((tx) => {
      const month = monthLabel(tx.date);
      if (!result[month]) {
        result[month] = [];
      }
      result[month].push(tx);
    });
    return Object.entries(result);
  }, [filteredTransactions]);

  const totalIncome = formatMoney(summary?.totalIncome);
  const totalExpense = formatMoney(summary?.totalExpense);
  const balance = formatMoney(summary?.balance);

  const handleQuickAddSuccess = useCallback(() => {
    loadSummary();
    loadTransactions();
    setShowQuickAdd(false);
  }, [loadSummary, loadTransactions]);

  return (
    <div className="relative min-h-screen bg-base-darkest text-text-primary">
      <div className="absolute inset-0 bg-gradient-hero opacity-40" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-12">
        <header className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full border border-border/60 bg-base-card p-2 text-text-secondary"
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold text-text-secondary">Movimientos</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQuickAdd(true)}
              className="rounded-full border border-border/60 bg-base-card p-2 text-text-secondary transition hover:border-brand"
              title="Registrar movimiento"
            >
              <Plus size={18} />
            </button>
            <button
              className="rounded-full border border-border/60 bg-base-card p-2 text-text-secondary"
              title="Notificaciones"
            >
              <Bell size={18} />
            </button>
          </div>
        </header>

        <section className="rounded-4xl border border-border/60 bg-base-card p-6 text-text-secondary shadow-card">
          <p className="text-xs uppercase tracking-[0.35em] text-text-muted">
            Balance total
          </p>
          <p className="mt-2 text-3xl font-display font-semibold">
            ${balance}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFilter("income")}
              className={`rounded-3xl border px-4 py-3 text-left transition ${
                filter === "income"
                  ? "border-brand bg-brand text-base-dark shadow-card"
                  : "border-border/60 bg-base-dark text-text-secondary"
              }`}
            >
              <p className="text-xs uppercase tracking-wide opacity-80">Ingresos</p>
              <p className="mt-1 text-lg font-semibold">
                ${totalIncome}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setFilter("expense")}
              className={`rounded-3xl border px-4 py-3 text-left transition ${
                filter === "expense"
                  ? "border-sky-light bg-sky-light text-base-dark shadow-card"
                  : "border-border/60 bg-base-dark text-text-secondary"
              }`}
            >
              <p className="text-xs uppercase tracking-wide opacity-80">Gastos</p>
              <p className="mt-1 text-lg font-semibold">
                ${totalExpense}
              </p>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setFilter("all")}
            className="mt-4 w-full rounded-3xl border border-border/60 bg-base-dark px-5 py-3 text-sm font-medium text-text-muted transition hover:bg-base-dark/70"
          >
            Ver todos los movimientos
          </button>
        </section>

        <section className="mt-6 space-y-6">
          {groupedByMonth.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="Sin movimientos en este filtro"
              description="Probá cambiar el tipo de movimiento o cargá un ingreso/gasto nuevo."
              actionLabel="Registrar movimiento"
              onAction={() => setShowQuickAdd(true)}
              className="border-dashed border-border/60 bg-base-card/70"
            />
          ) : (
            groupedByMonth.map(([month, items]) => (
              <div key={month} className="space-y-3">
                <div className="flex items-center justify-between text-sm text-text-secondary">
                  <p className="font-semibold">{month}</p>
                  <span className="text-text-muted">
                    {items.length} movimiento{items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-3xl border border-border/40 bg-base-card/90 px-4 py-3 shadow-soft"
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon category={tx.category || tx.type} />
                        <div>
                          <p className="text-sm font-semibold text-text-secondary">
                            {tx.description}
                          </p>
                          <p className="text-xs text-text-muted">
                            {formatTime(tx.date)} · {tx.category || "-"}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`text-sm font-semibold ${
                        tx.amount < 0 ? "text-sky-light" : "text-brand"
                        }`}
                      >
                        {tx.amount < 0 ? "-" : "+"}${formatMoney(Math.abs(tx.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-darkest/80 backdrop-blur">
          <div className="w-full max-w-md px-5">
            <QuickTransactionForm
              variant="modal"
              onSuccess={handleQuickAddSuccess}
              onCancel={() => setShowQuickAdd(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
