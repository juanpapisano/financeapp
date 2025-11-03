import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api/axiosClient";

const initialFormState = {
  amount: "",
  description: "",
  categoryId: "",
  entityId: "",
  date: new Date(),
  isSettled: true,
  paidByUserId: "",
};

export default function QuickTransactionForm({
  onSuccess,
  onCancel,
  variant = "card",
}) {
  const [mode, setMode] = useState("expense");
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [categories, setCategories] = useState([]);
  const [entities, setEntities] = useState([]);
  const currentUserId = useMemo(() => {
    const stored = localStorage.getItem("userId");
    const parsed = stored ? Number(stored) : NaN;
    return Number.isNaN(parsed) ? null : parsed;
  }, []);
  const selectedEntity = useMemo(
    () => entities.find((entity) => String(entity.id) === String(form.entityId)),
    [entities, form.entityId],
  );
  const entityMembers = selectedEntity?.members ?? [];

  useEffect(() => {
    let active = true;
    async function loadCategories() {
      try {
        const res = await api.get("/categories");
        if (!active) return;
        setCategories(res.data || []);
      } catch (err) {
        console.error("Error fetching categories", err);
        if (active) setError("No se pudieron cargar las categorías.");
      }
    }
    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== "expense" || entities.length > 0) return;
    let active = true;
    async function loadEntities() {
      try {
        const res = await api.get("/entities");
        if (!active) return;
        setEntities(res.data || []);
      } catch (err) {
        console.error("Error fetching entities", err);
      }
    }
    loadEntities();
    return () => {
      active = false;
    };
  }, [entities.length, mode]);

  useEffect(() => {
    if (!form.entityId) {
      if (form.paidByUserId) {
        setForm((prev) => ({ ...prev, paidByUserId: "" }));
      }
      return;
    }
    if (!selectedEntity) return;
    if (entityMembers.length === 0) {
      if (form.paidByUserId) {
        setForm((prev) => ({ ...prev, paidByUserId: "" }));
      }
      return;
    }
    if (
      form.paidByUserId &&
      entityMembers.some(
        (member) => String(member.user.id) === String(form.paidByUserId),
      )
    ) {
      return;
    }
    const defaultMember =
      entityMembers.find((member) => member.user.id === currentUserId) ??
      entityMembers[0];
    setForm((prev) => ({
      ...prev,
      paidByUserId: defaultMember ? String(defaultMember.user.id) : "",
    }));
  }, [
    entityMembers,
    form.entityId,
    form.paidByUserId,
    selectedEntity,
    currentUserId,
  ]);

  useEffect(() => {
    setForm((prev) => ({
      ...initialFormState,
      date: prev.date ?? new Date(),
    }));
    setError("");
    setFeedback("");
  }, [mode]);

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        mode === "income" ? category.type === "INCOME" : category.type === "EXPENSE",
      ),
    [categories, mode],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "entityId") {
      setForm((prev) => ({
        ...prev,
        entityId: value,
        paidByUserId: "",
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFeedback("");
    if (mode === "expense") {
      if (form.entityId && entityMembers.length === 0) {
        setError("La entidad seleccionada no tiene miembros disponibles.");
        setLoading(false);
        return;
      }
      if (form.entityId && !form.paidByUserId) {
        setError("Seleccioná quién realizó el pago.");
        setLoading(false);
        return;
      }
    }
    try {
      const payload = {
        amount: Number(form.amount),
        description: form.description || undefined,
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        date: form.date?.toISOString(),
      };

      if (!payload.amount || Number.isNaN(payload.amount)) {
        setError("Ingresá un monto válido.");
        setLoading(false);
        return;
      }
      if (!payload.date) {
        setError("Seleccioná una fecha.");
        setLoading(false);
        return;
      }

      if (mode === "expense") {
        const expensePayload = {
          ...payload,
          entityId: form.entityId ? Number(form.entityId) : undefined,
          isSettled: Boolean(form.isSettled),
          paidByUserId:
            form.entityId && form.paidByUserId
              ? Number(form.paidByUserId)
              : undefined,
        };
        const response = await api.post("/expenses", expensePayload);
        if (response.data?.sharedExpense) {
          setFeedback(
            `Gasto compartido registrado en ${response.data.sharedExpense.entity.name}.`,
          );
        } else {
          setFeedback("Gasto registrado correctamente.");
        }
      } else {
        await api.post("/incomes", payload);
        setFeedback("Ingreso registrado correctamente.");
      }

      setForm({
        ...initialFormState,
        date: new Date(),
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error creating transaction", err);
      setError("No se pudo guardar. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const containerClasses =
    variant === "modal"
      ? "space-y-4 rounded-3xl border border-border/60 bg-base-card p-5 shadow-lg"
      : "space-y-4 rounded-4xl border border-border/60 bg-base-card/95 p-5 shadow-soft backdrop-blur";

  return (
    <section className={containerClasses}>
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Registrar movimiento
          </p>
          <h2 className="text-lg font-semibold text-text-secondary">
            Alta rápida de {mode === "expense" ? "gasto" : "ingreso"}
          </h2>
        </div>
        <div className="flex gap-2 rounded-3xl bg-base-dark p-1">
          {[
            { label: "Gasto", value: "expense" },
            { label: "Ingreso", value: "income" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              className={`rounded-3xl px-4 py-2 text-xs font-semibold transition ${
                mode === option.value
                  ? "bg-brand text-base-dark shadow-card"
                  : "text-text-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "expense" && (
          <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-base-dark px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-secondary">Pagado</p>
              <p className="text-xs text-text-muted">
                Indicá si el gasto ya fue abonado al registrarlo.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isSettled}
              onClick={() =>
                setForm((prev) => ({ ...prev, isSettled: !prev.isSettled }))
              }
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                form.isSettled ? "bg-brand" : "bg-border/60"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-base-card transition ${
                  form.isSettled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="Monto"
              min="0"
              step="0.01"
              required
              className="flex-1 rounded-2xl border border-border/60 bg-base-dark px-4 py-3 text-sm text-text-secondary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-0"
            />
            <div className="flex-1 rounded-2xl border border-border/60 bg-base-dark px-4 py-2">
              <DatePicker
                selected={form.date}
                onChange={(date) =>
                  setForm((prev) => ({
                    ...prev,
                    date: date ?? prev.date ?? new Date(),
                  }))
                }
                dateFormat="yyyy-MM-dd"
                className="w-full bg-transparent text-sm text-text-secondary focus:outline-none"
                calendarStartDay={1}
              />
            </div>
          </div>

          <textarea
            name="description"
            rows={2}
            placeholder="Descripción (opcional)"
            value={form.description}
            onChange={handleChange}
            className="rounded-2xl border border-border/60 bg-base-dark px-4 py-3 text-sm text-text-secondary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-0"
          />

          <select
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            className="rounded-2xl border border-border/60 bg-base-dark px-4 py-3 text-sm text-text-secondary focus:border-brand focus:outline-none focus:ring-0"
          >
            <option value="">Seleccioná una categoría</option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {mode === "expense" && (
            <select
              name="entityId"
              value={form.entityId}
              onChange={handleChange}
              className="rounded-2xl border border-border/60 bg-base-dark px-4 py-3 text-sm text-text-secondary focus:border-brand focus:outline-none focus:ring-0"
            >
              <option value="">Sin entidad compartida</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          )}
          {mode === "expense" && form.entityId && (
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wide text-text-muted">
                ¿Quién pagó?
              </label>
              <select
                value={form.paidByUserId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    paidByUserId: event.target.value,
                  }))
                }
                required
                className="rounded-2xl border border-border/60 bg-base-dark px-4 py-3 text-sm text-text-secondary focus:border-brand focus:outline-none focus:ring-0"
              >
                <option value="">Seleccioná una persona</option>
                {entityMembers.map((member) => (
                  <option key={member.id} value={member.user.id}>
                    {member.user.name} · {Number(member.share).toFixed(0)}%
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {feedback && <p className="text-xs text-brand">{feedback}</p>}

        <div className="flex flex-col gap-2 md:flex-row md:justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-3xl border border-border/60 bg-base-dark px-6 py-3 text-sm font-semibold text-text-secondary transition hover:border-brand md:w-auto"
              disabled={loading}
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-3xl bg-brand px-6 py-3 text-sm font-semibold text-base-dark transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
          >
            {loading
              ? "Guardando…"
              : mode === "expense"
              ? "Registrar gasto"
              : "Registrar ingreso"}
          </button>
        </div>
      </form>
    </section>
  );
}
