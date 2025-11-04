import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Layers,
  Sparkles,
  Users,
  Wallet,
  ShoppingBag,
  HomeIcon,
  Car,
  Utensils,
  X,
} from "lucide-react";
import api from "../api/axiosClient";
import EmptyState from "../components/EmptyState";
import NavBar from "../components/NavBar";

const SHARE_TOTAL = 100;

const PERIOD_OPTIONS = [
  { key: "DAILY", label: "Diario" },
  { key: "WEEKLY", label: "Semanal" },
  { key: "MONTHLY", label: "Mensual" },
];

const CATEGORY_ICON_MAP = {
  groceries: ShoppingBag,
  pantry: ShoppingBag,
  food: Utensils,
  rent: HomeIcon,
  housing: HomeIcon,
  transport: Car,
  fuel: Car,
  income: Wallet,
  default: Layers,
};

const CATEGORY_COLOR_MAP = {
  groceries: "bg-sky-light/20 text-sky-light",
  pantry: "bg-sky-light/20 text-sky-light",
  food: "bg-sky-light/20 text-sky-light",
  rent: "bg-brand/25 text-brand",
  housing: "bg-brand/25 text-brand",
  transport: "bg-sky-light/25 text-sky-light",
  fuel: "bg-sky-light/25 text-sky-light",
  income: "bg-brand/25 text-brand",
  default: "bg-base-dark text-text-secondary",
};

function formatMoney(value = 0) {
  return Number(value || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateParts(dateString) {
  const date = new Date(dateString);
  return {
    time: date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    label: date.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
  };
}

function getCategoryBadge(category = "") {
  const key = category.toLowerCase();
  const Icon = CATEGORY_ICON_MAP[key] || CATEGORY_ICON_MAP.default;
  const classes = CATEGORY_COLOR_MAP[key] || CATEGORY_COLOR_MAP.default;
  return { Icon, classes };
}

function aggregateEntityTotals(expenses = []) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week = new Date(today);
  week.setDate(today.getDate() - 6);
  const month = new Date(now.getFullYear(), now.getMonth(), 1);

  const totals = { daily: 0, weekly: 0, monthly: 0 };
  expenses.forEach((expense) => {
    const value = Number(expense.amount || 0);
    const date = new Date(expense.date);
    if (date >= today) totals.daily += value;
    if (date >= week) totals.weekly += value;
    if (date >= month) totals.monthly += value;
  });
  return totals;
}

function filterByPeriod(expenses = [], period = "MONTHLY") {
  const now = new Date();
  let start;
  if (period === "DAILY") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "WEEKLY") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return expenses.filter((expense) => new Date(expense.date) >= start);
}

function validateEntityForm(form, currentUserEmail, setError) {
  if (!form.name.trim()) {
    setError("La entidad necesita un nombre");
    return false;
  }

  const members = form.members.filter((member) => member.email.trim());
  if (members.length < 2) {
    setError("Agregá al menos dos integrantes para compartir gastos");
    return false;
  }

  const seen = new Set();
  let totalShare = 0;
  for (const member of members) {
    const email = member.email.trim().toLowerCase();
    if (!email) {
      setError("Ingresá el email de cada integrante");
      return false;
    }
    if (seen.has(email)) {
      setError("No se permiten emails duplicados en la entidad");
      return false;
    }
    seen.add(email);

    const shareValue = Number(member.share);
    if (Number.isNaN(shareValue) || shareValue < 0) {
      setError("Ingresá porcentajes válidos (0 a 100)");
      return false;
    }
    totalShare += shareValue;
  }

  if (Math.abs(totalShare - SHARE_TOTAL) > 0.01) {
    setError("La suma de los porcentajes debe ser 100");
    return false;
  }

  if (
    !members.some((member) => member.email.trim().toLowerCase() === currentUserEmail)
  ) {
    setError("Incluí tu propio email para asignarte un porcentaje");
    return false;
  }

  return true;
}

export default function Entities() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUserEmail = useMemo(
    () => (localStorage.getItem("userEmail") || "").toLowerCase(),
    [],
  );

  const defaultMembers = useMemo(
    () => [
      {
        email: currentUserEmail,
        share: currentUserEmail ? "100" : "",
      },
    ],
    [currentUserEmail],
  );

  const [entities, setEntities] = useState([]);
  const [entityExpenses, setEntityExpenses] = useState({});
  const [loadingExpenses, setLoadingExpenses] = useState({});
  const [entityFilters, setEntityFilters] = useState({});
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [entityForm, setEntityForm] = useState({
    id: null,
    name: "",
    members: defaultMembers,
  });
  const [entityFormLoading, setEntityFormLoading] = useState(false);
  const [entityFormError, setEntityFormError] = useState("");

  const fetchEntities = useCallback(async () => {
    try {
      const res = await api.get("/entities");
      setEntities(res.data || []);
    } catch (error) {
      console.error("Error fetching entities", error);
    }
  }, []);

  const fetchEntityExpenses = useCallback(async (entityId) => {
    setLoadingExpenses((prev) => ({ ...prev, [entityId]: true }));
    try {
      const res = await api.get(`/entities/${entityId}/expenses`);
      setEntityExpenses((prev) => ({ ...prev, [entityId]: res.data || [] }));
    } catch (error) {
      console.error("Error fetching entity expenses", error);
    } finally {
      setLoadingExpenses((prev) => ({ ...prev, [entityId]: false }));
    }
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  useEffect(() => {
    if (entities.length > 0 && !selectedEntityId) {
      setSelectedEntityId(entities[0].id);
    }
  }, [entities, selectedEntityId]);

  useEffect(() => {
    entities.forEach((entity) => {
      if (!entityExpenses[entity.id] && !loadingExpenses[entity.id]) {
        fetchEntityExpenses(entity.id);
      }
      if (!entityFilters[entity.id]) {
        setEntityFilters((prev) => ({ ...prev, [entity.id]: "MONTHLY" }));
      }
    });
  }, [entities, entityExpenses, loadingExpenses, entityFilters, fetchEntityExpenses]);

  useEffect(() => {
    if (location.state?.focus === "CREATE") {
      handleOpenCreate();
    }
  }, [location.state]);

  const selectedEntity = useMemo(
    () => entities.find((entity) => entity.id === selectedEntityId) || null,
    [entities, selectedEntityId],
  );

  const allExpenses = useMemo(
    () => Object.values(entityExpenses).flat(),
    [entityExpenses],
  );

  const globalTotals = useMemo(() => aggregateEntityTotals(allExpenses), [allExpenses]);

  const totalMembers = useMemo(
    () => entities.reduce((sum, entity) => sum + (entity.members?.length || 0), 0),
    [entities],
  );

  const handleOpenCreate = useCallback(() => {
    setEntityForm({
      id: null,
      name: "",
      members: defaultMembers,
    });
    setModalMode("create");
    setEntityFormError("");
    setShowEntityModal(true);
  }, [defaultMembers]);

  const handleOpenEdit = useCallback(
    (entity) => {
      setEntityForm({
        id: entity.id,
        name: entity.name,
        members:
          entity.members?.map((member) => ({
            email: member.user.email,
            share: member.share.toString(),
          })) || defaultMembers,
      });
      setModalMode("edit");
      setEntityFormError("");
      setShowEntityModal(true);
    },
    [defaultMembers],
  );

  const handleCloseModal = useCallback(() => {
    setShowEntityModal(false);
    setEntityFormError("");
  }, []);

  const handleEntityFieldChange = (key, value) => {
    setEntityForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleMemberFieldChange = (index, key, value) => {
    setEntityForm((prev) => {
      const members = [...prev.members];
      members[index] = { ...members[index], [key]: value };
      return { ...prev, members };
    });
  };

  const addMemberRow = () => {
    setEntityForm((prev) => ({
      ...prev,
      members: [...prev.members, { email: "", share: "" }],
    }));
  };

  const removeMemberRow = (index) => {
    setEntityForm((prev) => ({
      ...prev,
      members: prev.members.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmitEntityForm = async (event) => {
    event.preventDefault();
    setEntityFormError("");
    if (!validateEntityForm(entityForm, currentUserEmail, setEntityFormError)) {
      return;
    }

    const payload = {
      name: entityForm.name.trim(),
      members: entityForm.members
        .filter((member) => member.email.trim())
        .map((member) => ({
          email: member.email.trim().toLowerCase(),
          share: Number(member.share),
        })),
    };

    setEntityFormLoading(true);
    try {
      if (modalMode === "create") {
        await api.post("/entities", payload);
      } else if (entityForm.id) {
        await api.put(`/entities/${entityForm.id}`, payload);
      }
      await fetchEntities();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving entity", error);
      setEntityFormError(
        error.response?.data?.message || "No se pudo guardar la entidad",
      );
    } finally {
      setEntityFormLoading(false);
    }
  };

  const renderEntityModal = () => {
    if (!showEntityModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-darkest/80 px-5 backdrop-blur">
        <div className="w-full max-w-md rounded-4xl border border-border/60 bg-base-card/95 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-secondary">
              {modalMode === "create" ? "Crear entidad" : "Editar entidad"}
            </h2>
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-full border border-border/60 bg-base-dark p-2 text-text-muted hover:text-text-secondary"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmitEntityForm} className="mt-4 space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Nombre
              </label>
              <input
                type="text"
                value={entityForm.name}
                onChange={(event) => handleEntityFieldChange("name", event.target.value)}
                className="mt-2 w-full rounded-3xl border border-border bg-base-dark px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                placeholder="Ej: Casa Palermo"
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-secondary">Integrantes</p>
                <button
                  type="button"
                  onClick={addMemberRow}
                  className="text-sm font-semibold text-brand hover:text-brand/80"
                >
                  + Agregar
                </button>
              </div>
              <div className="space-y-4">
                {entityForm.members.map((member, index) => (
                  <div
                    key={`entity-form-member-${index}`}
                    className="grid grid-cols-1 gap-3 rounded-3xl border border-border/60 bg-base-dark/70 p-4 md:grid-cols-3"
                  >
                    <div className="md:col-span-2">
                      <label className="text-[11px] uppercase tracking-wide text-text-muted">
                        Email
                      </label>
                      <input
                        type="email"
                        value={member.email}
                        onChange={(event) =>
                          handleMemberFieldChange(index, "email", event.target.value)
                        }
                        className="mt-1 w-full rounded-2xl border border-border bg-base-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                        placeholder="usuario@mail.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-text-muted">
                        Porcentaje
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={member.share}
                        onChange={(event) =>
                          handleMemberFieldChange(index, "share", event.target.value)
                        }
                        className="mt-1 w-full rounded-2xl border border-border bg-base-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                        required
                      />
                    </div>
                    {entityForm.members.length > 1 && (
                      <div className="flex items-end justify-end">
                        <button
                          type="button"
                          onClick={() => removeMemberRow(index)}
                          className="text-xs font-semibold text-red-400 hover:text-red-300"
                        >
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-muted">
                Asegurate de que los porcentajes sumen 100% para mantener los balances correctos.
              </p>
            </div>

            {entityFormError && (
              <p className="rounded-3xl border border-red-400/60 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                {entityFormError}
              </p>
            )}

            <button
              type="submit"
              disabled={entityFormLoading}
              className="w-full rounded-3xl bg-brand px-5 py-3 text-sm font-semibold text-base-dark shadow-card transition hover:bg-brand/90 disabled:opacity-60"
            >
              {entityFormLoading
                ? "Guardando..."
                : modalMode === "create"
                  ? "Crear entidad"
                  : "Guardar cambios"}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderEntityDetails = () => {
    if (!selectedEntity) {
      return (
        <section className="mt-6">
          <EmptyState
            icon={Sparkles}
            title="Elegí una entidad"
            description="Seleccioná una entidad para ver sus miembros y movimientos."
            className="border-dashed border-border/60 bg-base-card/80"
          />
        </section>
      );
    }

    const expenses = entityExpenses[selectedEntity.id] || [];
    const totals = aggregateEntityTotals(expenses);
    const selectedPeriod = entityFilters[selectedEntity.id] || "MONTHLY";
    const visibleExpenses = filterByPeriod(expenses, selectedPeriod);

    return (
      <section className="mt-6 space-y-6">
        <div className="rounded-[32px] border border-border/60 bg-gradient-card p-5 text-text-secondary shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-text-muted">
                Entidad seleccionada
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand">
                  <Building2 size={22} />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-text-secondary">
                    {selectedEntity.name}
                  </h2>
                  <p className="text-xs text-text-muted">
                    {selectedEntity.members.length} integrante
                    {selectedEntity.members.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-3xl border border-border/60 bg-base-dark px-4 py-3 text-sm">
                <p className="text-[11px] uppercase tracking-wide text-text-muted">
                  Gasto semanal
                </p>
                <p className="mt-1 text-lg font-semibold text-sky-light">
                  -${formatMoney(totals.weekly)}
                </p>
              </div>
              <div className="rounded-3xl border border-border/60 bg-base-dark px-4 py-3 text-sm">
                <p className="text-[11px] uppercase tracking-wide text-text-muted">
                  Gasto mensual
                </p>
                <p className="mt-1 text-lg font-semibold text-brand">
                  -${formatMoney(totals.monthly)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedEntity)}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-base-dark px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-brand"
              >
                Editar entidad
              </button>
            </div>
          </div>

          <div className="mt-5 flex gap-2 text-xs font-semibold">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={`${selectedEntity.id}-${option.key}`}
                type="button"
                onClick={() =>
                  setEntityFilters((prev) => ({ ...prev, [selectedEntity.id]: option.key }))
                }
                className={`rounded-full px-4 py-2 transition ${
                  selectedPeriod === option.key
                    ? "bg-brand text-base-dark shadow-card"
                    : "border border-border/60 bg-base-card text-text-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-4xl border border-border/60 bg-base-card/95 p-6 shadow-soft">
          <h3 className="text-sm font-semibold text-text-secondary">Movimientos recientes</h3>
          {loadingExpenses[selectedEntity.id] ? (
            <p className="text-sm text-text-muted">Cargando movimientos...</p>
          ) : visibleExpenses.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="Sin movimientos en este período"
              description="Registrá gastos para ver cómo se distribuyen entre los integrantes."
              className="border-dashed border-border/60 bg-base-card/80"
            />
          ) : (
            <div className="space-y-3">
              {visibleExpenses.map((expense) => {
                const categoryName = expense.category?.name || expense.category || "Gasto";
                const { Icon, classes } = getCategoryBadge(categoryName);
                const { time, label } = formatDateParts(expense.date);
                return (
                  <div
                    key={`expense-${expense.id}`}
                    className="flex items-center justify-between rounded-3xl border border-border/60 bg-base-dark/70 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${classes}`}>
                        <Icon size={18} />
                      </span>
                      <div>
                        <p className="font-semibold text-text-secondary">
                          {expense.description || categoryName}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          {time} · {label} · {categoryName}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-sky-light">
                      -${formatMoney(expense.amount || 0)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-4xl border border-border/60 bg-base-card/95 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-secondary">Integrantes</h3>
            <p className="text-xs text-text-muted">
              Total 100%
            </p>
          </div>
          <div className="space-y-3">
            {selectedEntity.members.map((member) => (
              <div
                key={`member-${member.id}`}
                className="flex items-center justify-between rounded-3xl border border-border/60 bg-base-dark/70 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-text-secondary">{member.user.name}</p>
                  <p className="text-xs text-text-muted">{member.user.email}</p>
                </div>
                <span className="text-sm font-semibold text-text-secondary">
                  {Number(member.share).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="relative min-h-screen bg-base-darkest text-text-primary">
      <div className="absolute inset-0 bg-gradient-hero opacity-40" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 pb-24 pt-12">
        <header className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full border border-border/60 bg-base-card p-2 text-text-secondary transition hover:border-brand"
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold text-text-secondary">Entidades</h1>
          <span className="h-8 w-8" />
        </header>

        <section className="relative rounded-4xl border border-border/60 bg-base-card p-6 text-text-secondary shadow-card">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-base-dark text-lg font-semibold text-text-secondary transition hover:border-brand"
            title="Crear entidad"
          >
            +
          </button>
          <div className="pr-12">
            <p className="text-xs uppercase tracking-[0.35em] text-text-muted">
              Resumen general
            </p>
            <h2 className="mt-2 text-3xl font-display font-semibold text-text-secondary">
              Entidades y gastos
            </h2>
            <p className="mt-2 text-xs text-text-muted max-w-xl">
              Controlá tus grupos compartidos, revisá los gastos y mantené los porcentajes al día en un solo lugar.
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-3 text-sm md:flex-row md:items-stretch">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:flex-1">
              <div className="rounded-3xl border border-border/60 bg-base-dark/80 px-4 py-4">
                <p className="text-[11px] uppercase tracking-wide text-text-muted">
                  Entidades activas
                </p>
                <p className="mt-1 text-xl font-semibold text-text-secondary">{entities.length}</p>
              </div>
              <div className="rounded-3xl border border-border/60 bg-base-dark/80 px-4 py-4">
                <p className="text-[11px] uppercase tracking-wide text-text-muted">
                  Integrantes totales
                </p>
                <p className="mt-1 text-xl font-semibold text-text-secondary">{totalMembers}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-border/60 bg-base-dark/80 px-4 py-4 md:w-60">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">
                Gasto mensual
              </p>
              <p className="mt-1 text-xl font-semibold text-sky-light">
                -${formatMoney(globalTotals.monthly)}
              </p>
            </div>
          </div>
        </section>

        {entities.length === 0 ? (
          <section className="mt-6">
            <EmptyState
              icon={Users}
              title="Todavía no creaste entidades"
              description="Creá tu primera entidad para dividir gastos con tu familia o equipo."
              actionLabel="Crear entidad"
              onAction={handleOpenCreate}
              className="border-dashed border-border/60 bg-base-card/80"
            />
          </section>
        ) : (
          <>
            <div className="mt-6 flex gap-2 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
              {entities.map((entity) => (
                <button
                  key={`chip-${entity.id}`}
                  type="button"
                  onClick={() => setSelectedEntityId(entity.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 transition ${
                    selectedEntityId === entity.id
                      ? "border-brand bg-brand text-base-dark shadow-card"
                      : "border-border/60 bg-base-card text-text-muted"
                  }`}
                >
                  <Building2 size={16} />
                  {entity.name}
                </button>
              ))}
            </div>
            {renderEntityDetails()}
          </>
        )}
      </div>

      {renderEntityModal()}
      <NavBar />
    </div>
  );
}
