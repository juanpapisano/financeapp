import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api/axiosClient";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [entities, setEntities] = useState([]);
  const [form, setForm] = useState({
    amount: "",
    description: "",
    categoryId: "",
    entityId: "",
    date: new Date(),
    isSettled: true,
    paidByUserId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
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

  const fetchExpenses = async () => {
    try {
      const res = await api.get("/expenses");
      setExpenses(res.data.items || []);
    } catch (err) {
      console.error(err);
      setError("Error al obtener gastos");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      const expenseCats = res.data.filter((c) => c.type === "EXPENSE");
      setCategories(expenseCats);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEntities = async () => {
    try {
      const res = await api.get("/entities");
      setEntities(res.data);
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleChange = (e) => {
    const { name, value } = e.target;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");
    if (form.entityId && entityMembers.length === 0) {
      setLoading(false);
      setError("La entidad seleccionada no tiene miembros disponibles.");
      return;
    }
    if (form.entityId && !form.paidByUserId) {
      setLoading(false);
      setError("Seleccioná quién realizó el pago.");
      return;
    }
    try {
      const body = {
        amount: Number(form.amount),
        description: form.description,
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        entityId: form.entityId ? Number(form.entityId) : undefined,
        date: form.date?.toISOString(),
        isSettled: Boolean(form.isSettled),
        paidByUserId:
          form.entityId && form.paidByUserId
            ? Number(form.paidByUserId)
            : undefined,
      };

      const res = await api.post("/expenses", body);
      setForm({
        amount: "",
        description: "",
        categoryId: "",
        entityId: "",
        date: new Date(),
        isSettled: true,
        paidByUserId: "",
      });
      if (res.data?.sharedExpense) {
        const entity = res.data.sharedExpense.entity.name;
        setSuccessMessage(
          `Gasto compartido registrado en ${entity}. Ver balances en la sección de entidades.`,
        );
      } else {
        setSuccessMessage("Gasto registrado correctamente.");
      }
      await fetchExpenses();
    } catch (err) {
      console.error(err);
      setError("Error al crear gasto");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      await fetchExpenses();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar gasto");
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchEntities();
  }, []);

  return (
    <div className="min-h-screen bg-primary text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Gastos</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-secondary rounded-xl p-6 shadow-md space-y-4 mb-8"
      >
        <h2 className="text-lg font-semibold mb-2">Agregar gasto</h2>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {successMessage && <p className="text-green-400 text-sm">{successMessage}</p>}
        <div className="flex flex-col gap-2 rounded-xl border border-gray-600 bg-primary/40 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Pagado</p>
            <p className="text-xs text-gray-400">
              Activá la opción si este gasto ya fue abonado.
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
              form.isSettled ? "bg-gradient-to-r from-red-500 to-pink-500" : "bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-primary transition ${
                form.isSettled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="number"
            name="amount"
            placeholder="Monto"
            value={form.amount}
            onChange={handleChange}
            required
            className="rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
          />
          <DatePicker
            selected={form.date}
            onChange={(date) =>
              setForm((prev) => ({ ...prev, date: date ?? prev.date }))
            }
            dateFormat="yyyy-MM-dd"
            className="rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0 w-full"
            calendarStartDay={1}
            required
          />
          <input
            type="text"
            name="description"
            placeholder="Descripción"
            value={form.description}
            onChange={handleChange}
            className="rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
          />
          <select
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            className="rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
          >
            <option value="">Seleccionar categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            name="entityId"
            value={form.entityId}
            onChange={handleChange}
            className="rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
          >
            <option value="">Sin entidad</option>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
          {form.entityId && (
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs uppercase tracking-wide text-gray-400">
                ¿Quién realizó el pago?
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
                className="w-full rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
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
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto px-6 py-2 rounded-md font-semibold bg-gradient-to-r from-red-500 to-pink-500 hover:opacity-90 transition"
        >
          {loading ? "Guardando..." : "Agregar gasto"}
        </button>
      </form>

      <h2 className="text-lg font-semibold mb-2">Listado</h2>
      {expenses.length === 0 ? (
        <p className="text-gray-400">No hay gastos registrados.</p>
      ) : (
      <div className="bg-secondary rounded-xl p-4 shadow-md">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-600">
              <th className="text-left py-2">Monto</th>
              <th className="text-left py-2">Fecha</th>
              <th className="text-left py-2">Descripción</th>
              <th className="text-left py-2">Entidad</th>
              <th className="text-left py-2">Categoría</th>
              <th className="text-right py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id} className="border-b border-gray-700">
                <td className="py-2">${exp.amount}</td>
                <td>{exp.date ? new Date(exp.date).toLocaleDateString() : "-"}</td>
                <td>{exp.description || "-"}</td>
                <td>
                  {exp.entityExpense ? (
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {exp.entityExpense.entity.name}
                      </span>
                      {exp.isPayer && exp.sharePercentage == null ? (
                        <span className="text-xs text-blue-400">
                          Pagaste el total para este gasto compartido
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {exp.sharePercentage != null
                            ? `${Number(exp.sharePercentage).toFixed(2)}%`
                            : "0%"}{" "}
                          ·{" "}
                          {exp.isPayer ? "Tu participación" : "Debes al pagador"}
                        </span>
                      )}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{exp.category?.name || "-"}</td>
                <td className="text-right">
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="text-red-400 hover:text-red-300"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
