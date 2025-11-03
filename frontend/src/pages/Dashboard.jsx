import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, LogOut, Bell, Wallet, ShoppingBag, Car, HomeIcon, Layers, Plus } from "lucide-react";
import api from "../api/axiosClient";
import NavBar from "../components/NavBar";
import EntityCarousel from "../components/EntityCarousel";
import QuickTransactionForm from "../components/QuickTransactionForm";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedRange, setSelectedRange] = useState("Monthly");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [entitySummaries, setEntitySummaries] = useState([]);
  const [entitiesLoading, setEntitiesLoading] = useState(true);
  const [entitiesError, setEntitiesError] = useState("");
  const navigate = useNavigate();

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.get("/summary");
      setSummary(res.data);
    } catch (error) {
      console.error("Error fetching summary", error);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const [expensesRes, incomesRes] = await Promise.all([
        api.get("/expenses?pageSize=5"),
        api.get("/incomes?pageSize=5"),
      ]);
      const expenses =
        expensesRes.data.items?.map((item) => ({
          id: `expense-${item.id}`,
          type: "expense",
          amount: Number(item.amount) * -1,
          description: item.description || item.category?.name || "Expense",
          date: item.date,
          category: item.category?.name || "Expense",
        })) || [];
      const incomes =
        incomesRes.data.items?.map((item) => ({
          id: `income-${item.id}`,
          type: "income",
          amount: Number(item.amount),
          description: item.description || item.category?.name || "Income",
          date: item.date,
          category: item.category?.name || "Income",
        })) || [];
      const merged = [...expenses, ...incomes].sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(merged.slice(0, 5));
    } catch (error) {
      console.error("Error fetching transactions", error);
    }
  }, []);

  const loadEntitySummaries = useCallback(async () => {
    setEntitiesLoading(true);
    setEntitiesError("");
    try {
      const entitiesRes = await api.get("/entities");
      const entitiesData = entitiesRes.data || [];
      if (entitiesData.length === 0) {
        setEntitySummaries([]);
        setEntitiesLoading(false);
        return;
      }

      const expensesResponses = await Promise.all(
        entitiesData.map((entity) => api.get(`/entities/${entity.id}/expenses`)),
      );

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const summaries = entitiesData.map((entity, index) => {
        const expenses = expensesResponses[index].data || [];
        const monthlyExpenses = expenses.filter((expense) => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
        });

        const monthlyTotal = monthlyExpenses.reduce(
          (sum, expense) => sum + Number(expense.amount || 0),
          0,
        );

        const debtMap = new Map();
        monthlyExpenses.forEach((expense) => {
          (expense.personalExpenses || []).forEach((personal) => {
            if (!personal.isPayer && !personal.isSettled) {
              const key = personal.user.id;
              const current = debtMap.get(key);
              const amount = Number(personal.amount || 0);
              debtMap.set(key, {
                userId: personal.user.id,
                name: personal.user.name,
                amount: (current?.amount || 0) + amount,
              });
            }
          });
        });

        const debtEntries = Array.from(debtMap.values());
        const debts = debtEntries
          .filter((item) => item.amount > 0)
          .sort((a, b) => b.amount - a.amount);
        const pendingTotal = debts.reduce((sum, item) => sum + item.amount, 0);

        return {
          id: entity.id,
          name: entity.name,
          membersCount: entity.members?.length || 0,
          createdAt: entity.createdAt,
          monthlyTotal,
          debts,
          pendingTotal,
        };
      });

      setEntitySummaries(summaries);
    } catch (error) {
      console.error("Error fetching entities summary", error);
      setEntitiesError("No se pudo cargar la información de las entidades.");
      setEntitySummaries([]);
    } finally {
      setEntitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    loadEntitySummaries();
  }, [loadEntitySummaries]);

  const handleQuickAddSuccess = useCallback(() => {
    loadSummary();
    loadTransactions();
    loadEntitySummaries();
    setShowQuickAdd(false);
  }, [loadSummary, loadTransactions, loadEntitySummaries]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    sessionStorage.clear();
    navigate("/", { replace: true });
    window.location.reload();
  };

  const userName = localStorage.getItem("token")
    ? localStorage.getItem("userName")
    : "Invitado";

  const formatMoney = (value = 0) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const formatDate = (iso) => {
    if (!iso) return "";
    const date = new Date(iso);
    return new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };
  const formatShortDate = (iso) => {
    if (!iso) return "";
    const date = new Date(iso);
    return new Intl.DateTimeFormat("es-AR", {
      month: "short",
      day: "2-digit",
    }).format(date);
  };

  const expenseBreakdown = useMemo(() => {
    if (!summary?.expenseByCategory) return [];
    return summary.expenseByCategory.slice(0, 5);
  }, [summary]);

  const balance = formatMoney(summary?.balance);
  const totalIncome = formatMoney(summary?.totalIncome);
  const totalExpense = formatMoney(summary?.totalExpense);
  const monthlyGoal = formatMoney((summary?.totalIncome || 0) * 0.3);

  const categoryIconMap = {
    income: Wallet,
    salary: Wallet,
    groceries: ShoppingBag,
    pantry: ShoppingBag,
    rent: HomeIcon,
    transport: Car,
    fuel: Car,
  };

  const categoryColorMap = {
    income: "bg-brand/25 text-brand",
    salary: "bg-brand/25 text-brand",
    groceries: "bg-sky-light/20 text-sky-light",
    pantry: "bg-sky-light/20 text-sky-light",
    rent: "bg-brand/35 text-brand",
    transport: "bg-sky-light/20 text-sky-light",
    fuel: "bg-sky-light/20 text-sky-light",
    default: "bg-base-dark text-text-secondary",
  };

  const getCategoryStyles = (category = "") => {
    const key = category.toLowerCase();
    return categoryColorMap[key] || categoryColorMap.default;
  };

  const CategoryIcon = ({ category }) => {
    const key = (category || "").toLowerCase();
    const IconComp = categoryIconMap[key] || Wallet;
    const classes = getCategoryStyles(category);
    return (
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${classes}`}>
        <IconComp size={18} />
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-base-darkest text-text-primary">
      <div className="absolute inset-0 bg-gradient-hero opacity-40" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-12">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Hi, Welcome Back</p>
            <h1 className="mt-2 text-2xl font-display font-semibold text-text-secondary">
              {userName}
            </h1>
            <p className="text-xs text-text-muted">Good Morning</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQuickAdd(true)}
              className="rounded-full border border-border/60 bg-base-card px-3 py-2 text-text-secondary transition hover:border-brand"
              title="Agregar movimiento"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="rounded-full border border-border/60 bg-base-card px-3 py-2 text-text-secondary transition hover:border-brand"
              title="Settings"
            >
              <Settings size={18} />
            </button>
            <button className="rounded-full border border-border/60 bg-base-card px-3 py-2 text-text-secondary transition hover:border-brand">
              <Bell size={18} />
            </button>
          </div>
          {menuOpen && (
            <div className="absolute right-5 top-16 w-48 rounded-3xl border border-border/60 bg-base-card/95 p-3 shadow-soft">
              <button
                onClick={() => {
                  navigate("/categories");
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-base-dark"
              >
                <Layers size={16} /> Categories
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-brand transition hover:bg-base-dark"
              >
                <LogOut size={16} /> Log out
              </button>
            </div>
          )}
        </header>

        <section className="rounded-4xl border border-border/60 bg-base-card p-6 text-text-secondary shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Total Balance
              </p>
              <p className="mt-1 text-3xl font-display font-semibold text-text-secondary">
                ${balance}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Total Expense
              </p>
              <p className="mt-1 text-xl font-display font-semibold text-sky-light">
                -${totalExpense}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-base-dark">
              <div
                className="h-full rounded-full bg-brand"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(((summary?.totalExpense || 0) / ((summary?.totalIncome || 0) || 1)) * 100),
                  )}%`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
              <span>30%</span>
              <span className="rounded-full bg-base-dark px-2 py-1 font-medium text-text-secondary">
                ${monthlyGoal}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-sm border border-text-muted">
                ✓
              </span>
              30% Of Your Expenses, Looks Good.
            </p>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <EntityCarousel
            items={entitySummaries}
            loading={entitiesLoading}
            error={entitiesError}
            formatMoney={formatMoney}
          />

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Overview</p>
            <div className="flex gap-2 text-xs">
              {["Daily", "Weekly", "Monthly"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSelectedRange(label)}
                  className={`rounded-full px-4 py-2 transition ${
                    selectedRange === label
                      ? "bg-brand text-base-dark shadow-card"
                      : "bg-base-dark text-text-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-4xl border border-border/60 bg-base-card/90 p-5 shadow-soft">
            <div className="flex items-center gap-3 rounded-3xl bg-brand/15 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-brand/30 text-brand">
                💼
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted">
                  Income & Left Month
                </p>
                <p className="text-base font-semibold text-text-secondary">
                  ${totalIncome}
                </p>
                <p className="text-xs text-text-muted">Balance {balance}</p>
              </div>
            </div>

            <div className="space-y-3">
              {expenseBreakdown.length === 0 && (
                <p className="text-sm text-text-muted">No hay gastos registrados.</p>
              )}
              {expenseBreakdown.map((item, index) => (
                <div
                  key={`${item.category || 'category'}-${index}`}
                  className="flex items-center justify-between rounded-3xl border border-border/50 bg-base-dark/80 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={item.category} />
                    <div>
                      <p className="text-sm font-semibold text-text-secondary">
                        {item.category || "Sin categoría"}
                      </p>
                      <p className="text-xs text-text-muted">Expense</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-sky-light">
                    -${formatMoney(item.total)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-4xl border border-border/60 bg-base-card/90 p-5 shadow-soft">
            <div className="flex items-center justify-between text-text-secondary">
              <p className="text-sm font-medium">Transactions</p>
            </div>
            <div className="space-y-2">
              {transactions.length === 0 && (
                <p className="text-sm text-text-muted">No hay movimientos recientes.</p>
              )}
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-3xl border border-border/40 bg-base-dark/80 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={tx.category || tx.type} />
                    <div>
                      <p className="text-sm font-semibold text-text-secondary">
                        {tx.description}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatDate(tx.date)} · {formatShortDate(tx.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        tx.amount < 0 ? "text-sky-light" : "text-brand"
                      }`}
                    >
                      {tx.amount < 0 ? "-" : "+"}${formatMoney(Math.abs(tx.amount))}
                    </p>
                    <p className="text-xs text-text-muted">{tx.category || "-"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-darkest/80 backdrop-blur">
          <div className="w-full max-w-md px-5">
            <QuickTransactionForm
              onSuccess={handleQuickAddSuccess}
              onCancel={() => setShowQuickAdd(false)}
              variant="modal"
            />
          </div>
        </div>
      )}

      <NavBar />
    </div>
  );
}
