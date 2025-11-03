import { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  X,
  Wallet,
  ShoppingBag,
  Home,
  Car,
  PiggyBank,
  Utensils,
  BusFront,
  Pill,
  Gift,
  Clapperboard,
  LineChart,
  BadgeDollarSign,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosClient";
import EmptyState from "../components/EmptyState";

const ICON_MAP = {
  income: Wallet,
  expense: ShoppingBag,
  housing: Home,
  transport: Car,
  savings: PiggyBank,
  utensils: Utensils,
  food: Utensils,
  bus: BusFront,
  pill: Pill,
  medicine: Pill,
  "shopping-basket": ShoppingBag,
  groceries: ShoppingBag,
  gift: Gift,
  "clapperboard": Clapperboard,
  rent: Home,
  "piggy-bank": PiggyBank,
  "badge-dollar-sign": BadgeDollarSign,
  "line-chart": LineChart,
};

const ICON_COLORS = {
  income: "bg-brand/20 text-brand",
  expense: "bg-sky-light/20 text-sky-light",
  housing: "bg-brand/25 text-brand",
  transport: "bg-sky-light/25 text-sky-light",
  savings: "bg-brand/30 text-brand",
  default: "bg-base-dark text-text-secondary",
};

const ICON_OPTIONS = [
  { value: "wallet", label: "Billetera", icon: Wallet },
  { value: "shopping-bag", label: "Compras", icon: ShoppingBag },
  { value: "home", label: "Hogar", icon: Home },
  { value: "car", label: "Transporte", icon: Car },
  { value: "piggy-bank", label: "Ahorros", icon: PiggyBank },
  { value: "utensils", label: "Comida", icon: Utensils },
  { value: "bus", label: "Colectivo", icon: BusFront },
  { value: "pill", label: "Salud", icon: Pill },
  { value: "gift", label: "Regalos", icon: Gift },
  { value: "clapperboard", label: "Entretenimiento", icon: Clapperboard },
  { value: "badge-dollar-sign", label: "Sueldo", icon: BadgeDollarSign },
  { value: "line-chart", label: "Inversiones", icon: LineChart },
];

const FILTER_OPTIONS = [
  { value: "ALL", label: "Todas" },
  { value: "INCOME", label: "Ingresos" },
  { value: "EXPENSE", label: "Gastos" },
];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ id: null, name: "", type: "INCOME", icon: "wallet" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [menuCategory, setMenuCategory] = useState(null);
  const pressTimerRef = useRef(null);
  const navigate = useNavigate();

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch (err) {
      console.error(err);
      setError("Error al obtener categorías");
    }
  };

  useEffect(() => {
    fetchCategories();
    api.get("/summary").then((res) => setSummary(res.data)).catch(console.error);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () =>
    setForm({ id: null, name: "", type: "INCOME", icon: "wallet" });

  const closeForm = () => {
    setShowForm(false);
    resetForm();
    setMenuCategory(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { name: form.name, type: form.type, icon: form.icon };
      if (form.id) {
        await api.put(`/categories/${form.id}`, payload);
      } else {
        await api.post("/categories", payload);
      }
      await fetchCategories();
      closeForm();
    } catch (err) {
      console.error(err);
      setError("Error al crear categoría");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (category) => {
    if (!category.userId) {
      alert("Las categorías por defecto no se pueden eliminar.");
      setMenuCategory(null);
      return;
    }
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await api.delete(`/categories/${category.id}`);
      await fetchCategories();
      setMenuCategory(null);
    } catch (err) {
      console.error(err);
      alert("Error al eliminar categoría");
    }
  };

  const filteredCategories = useMemo(() => {
    if (filter === "ALL") return categories;
    return categories.filter((cat) => cat.type === filter);
  }, [categories, filter]);

  const totals = useMemo(() => {
    const summary = { total: categories.length, income: 0, expense: 0 };
    categories.forEach((cat) => {
      if (cat.type === "INCOME") summary.income += 1;
      if (cat.type === "EXPENSE") summary.expense += 1;
    });
    return summary;
  }, [categories]);

  const getIcon = (category) => {
    const iconKey = (category.icon || "").toLowerCase();
    if (ICON_MAP[iconKey]) return ICON_MAP[iconKey];

    const key = (category?.name || "").toLowerCase();
    if (key.includes("rent") || key.includes("home")) return ICON_MAP.housing;
    if (key.includes("transport") || key.includes("fuel") || key.includes("car")) return ICON_MAP.transport;
    if (key.includes("saving") || key.includes("goal")) return ICON_MAP.savings;
    if (category.type === "INCOME") return ICON_MAP.income;
    if (category.type === "EXPENSE") return ICON_MAP.expense;
    return ICON_MAP.income;
  };

  const getIconClasses = (category) => {
    const iconKey = (category.icon || "").toLowerCase();
    if (ICON_COLORS[iconKey]) return ICON_COLORS[iconKey];

    const key = (category?.name || "").toLowerCase();
    if (key.includes("rent") || key.includes("home")) return ICON_COLORS.housing;
    if (key.includes("transport") || key.includes("fuel") || key.includes("car")) return ICON_COLORS.transport;
    if (key.includes("saving") || key.includes("goal")) return ICON_COLORS.savings;
    if (category.type === "INCOME") return ICON_COLORS.income;
    if (category.type === "EXPENSE") return ICON_COLORS.expense;
    return ICON_COLORS.default;
  };

  const formatMoney = (value = 0) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const balance = formatMoney(summary?.balance);
  const totalIncome = formatMoney(summary?.totalIncome);
  const totalExpense = formatMoney(summary?.totalExpense);

  const startPressTimer = (category) => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      setMenuCategory(category);
      pressTimerRef.current = null;
    }, 500);
  };

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  useEffect(() => () => clearPressTimer(), []);

  return (
    <div className="relative min-h-screen bg-base-darkest text-text-primary">
      <div className="absolute inset-0 bg-gradient-hero opacity-40" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-24 pt-12">
        <header className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-base-card px-3 py-2 text-text-secondary transition hover:border-brand"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-semibold text-text-secondary">Categorías</h1>
          <button
            onClick={() => {
              setMenuCategory(null);
              resetForm();
              setShowForm((prev) => !prev);
            }}
            className="rounded-full border border-border/60 bg-brand px-3 py-2 text-base-dark shadow-card transition hover:bg-brand/90"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
          </button>
        </header>

        <section className="rounded-4xl border border-border/60 bg-base-card p-6 text-text-secondary shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Balance total
              </p>
              <p className="mt-1 text-2xl font-display font-semibold">${balance}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Gasto total
              </p>
              <p className="mt-1 text-lg font-semibold text-sky-light">-${totalExpense}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-text-secondary">
            <div className="rounded-3xl border border-brand/40 bg-brand/15 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-text-muted">Ingresos</p>
              <p className="mt-1 text-lg font-semibold text-brand">${totalIncome}</p>
            </div>
            <div className="rounded-3xl border border-border/40 bg-base-dark px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-text-muted">Categorías</p>
              <p className="mt-1 text-lg font-semibold">{totals.total}</p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-text-secondary">Listado de categorías</h2>
            <div className="flex gap-2 text-xs">
              {FILTER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMenuCategory(null);
                    setFilter(value);
                  }}
                  className={`rounded-full px-4 py-2 transition ${
                    filter === value
                      ? "bg-brand text-base-dark shadow-card"
                      : "bg-base-dark text-text-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {filteredCategories.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="Sin categorías personalizadas"
                description="Creá categorías para organizar tus ingresos y gastos."
                className="border-dashed border-border/60 bg-base-card/70 col-span-full"
              />
            ) : (
              filteredCategories.map((cat) => {
                const IconComp = getIcon(cat);
                const iconClasses = getIconClasses(cat);
                return (
                  <div
                    key={cat.id}
                    className="relative flex flex-col items-center gap-3 rounded-[32px] border border-border/60 bg-base-card/90 px-5 py-6 text-center shadow-soft"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-3xl ${iconClasses}`}>
                      <IconComp size={22} />
                    </div>
                    <div className="flex w-full max-w-[120px] flex-col items-center">
                      <p className="truncate text-sm font-semibold leading-tight text-text-secondary">
                        {cat.name}
                      </p>
                    </div>
                    <div
                      onMouseDown={() => startPressTimer(cat)}
                      onMouseUp={clearPressTimer}
                      onMouseLeave={clearPressTimer}
                      onTouchStart={() => startPressTimer(cat)}
                      onTouchEnd={clearPressTimer}
                      onTouchCancel={clearPressTimer}
                      className="absolute inset-0 rounded-[32px]"
                    />

                    {menuCategory?.id === cat.id && (
                      <div className="absolute right-3 top-3 z-20 flex flex-col gap-2 rounded-3xl border border-border/60 bg-base-dark/95 px-4 py-3 text-left text-sm shadow-soft">
                        <button
                          type="button"
                          onClick={() => {
                            if (!cat.userId) {
                              alert("Las categorías por defecto no se pueden editar.");
                              setMenuCategory(null);
                              return;
                            }
                            setForm({
                              id: cat.id,
                              name: cat.name,
                              type: cat.type,
                              icon: cat.icon || "wallet",
                            });
                            setShowForm(true);
                          }}
                          className="flex items-center gap-2 text-text-secondary hover:text-brand"
                        >
                          Edit category
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className={`flex items-center gap-2 ${
                            cat.userId ? "text-red-300 hover:text-red-400" : "text-text-muted cursor-not-allowed"
                          }`}
                        >
                          Delete category
                        </button>
                        <button
                          type="button"
                          onClick={() => setMenuCategory(null)}
                          className="text-xs text-text-muted hover:text-text-secondary"
                        >
                          Cerrar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {showForm && (
          <section
            className="fixed inset-0 z-40 flex items-center justify-center bg-base-darkest/70 px-6 py-10 backdrop-blur"
            onClick={closeForm}
          >
            <div
              className="relative w-full max-w-md rounded-4xl border border-border/60 bg-base-card p-6 shadow-card"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeForm}
                className="absolute right-4 top-4 rounded-full border border-border/60 bg-base-dark p-2 text-text-secondary hover:text-text-primary"
              >
                <X size={16} />
              </button>
              <h3 className="text-sm font-semibold text-text-secondary">
                {form.id ? "Editar categoría" : "Crear categoría"}
              </h3>
              {error && (
                <p className="mt-2 rounded-3xl border border-red-400/60 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </p>
              )}
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Nombre
                  </label>
                  <input
                  type="text"
                  name="name"
                  placeholder="Nombre de la categoría"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-3xl border border-border bg-base-dark px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
              </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Tipo
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-3xl border border-border bg-base-dark px-4 py-3 text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                  >
                    <option value="INCOME">Ingreso</option>
                    <option value="EXPENSE">Gasto</option>
                  </select>
                </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Ícono
                </label>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {ICON_OPTIONS.map(({ value, label, icon: OptionIcon }) => {
                    const active = form.icon === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, icon: value }))}
                        className={`flex flex-col items-center rounded-3xl border px-3 py-3 text-xs transition ${
                          active
                            ? "border-brand bg-brand/20 text-brand"
                            : "border-border bg-base-dark text-text-muted hover:border-brand/60"
                        }`}
                      >
                        <OptionIcon size={18} />
                        <span className="mt-2 truncate text-[11px] font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-brand px-5 py-3 text-sm font-semibold text-base-dark shadow-card transition hover:bg-brand/90"
              >
                {loading ? "Guardando..." : form.id ? "Actualizar categoría" : "Guardar categoría"}
              </button>
            </form>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
