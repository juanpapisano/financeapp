import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Wallet } from "lucide-react";
import api from "../api/axiosClient";
import EmptyState from "../components/EmptyState";

export default function Incomes() {
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    amount: "",
    description: "",
    categoryId: "",
    date: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchIncomes = async () => {
    try {
      const res = await api.get("/incomes");
      setIncomes(res.data.items || []);
    } catch (err) {
      console.error(err);
      setError("Error al obtener ingresos");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      const incomeCats = res.data.filter((c) => c.type === "INCOME");
      setCategories(incomeCats);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = {
        amount: Number(form.amount),
        description: form.description,
        categoryId: Number(form.categoryId),
        date: form.date?.toISOString(),
      };
      await api.post("/incomes", body);
      setForm({
        amount: "",
        description: "",
        categoryId: "",
        date: new Date(),
      });
      await fetchIncomes();
    } catch (err) {
      console.error(err);
      setError("Error al crear ingreso");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este ingreso?")) return;
    try {
      await api.delete(`/incomes/${id}`);
      await fetchIncomes();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar ingreso");
    }
  };

  useEffect(() => {
    fetchIncomes();
    fetchCategories();
  }, []);

  return (
    <div className="min-h-screen bg-primary text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Ingresos</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-secondary rounded-xl p-6 shadow-md space-y-4 mb-8"
      >
        <h2 className="text-lg font-semibold mb-2">Agregar ingreso</h2>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            required
            className="rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
          >
            <option value="">Seleccionar categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto px-6 py-2 rounded-md font-semibold bg-gradient-accent hover:opacity-90 transition"
        >
          {loading ? "Guardando..." : "Agregar ingreso"}
        </button>
      </form>

      <h2 className="text-lg font-semibold mb-2">Listado</h2>
      {incomes.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No cargaste ingresos"
          description="Sumá tu primer ingreso con el formulario de arriba."
          className="border-dashed border-border/70 bg-primary/30"
        />
      ) : (
        <div className="bg-secondary rounded-xl p-4 shadow-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-600">
                <th className="text-left py-2">Monto</th>
                <th className="text-left py-2">Fecha</th>
                <th className="text-left py-2">Descripción</th>
                <th className="text-left py-2">Categoría</th>
                <th className="text-right py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {incomes.map((inc) => (
                <tr key={inc.id} className="border-b border-gray-700">
                  <td className="py-2">${inc.amount}</td>
                  <td>{inc.date ? new Date(inc.date).toLocaleDateString() : "-"}</td>
                  <td>{inc.description || "-"}</td>
                  <td>{inc.category?.name || "-"}</td>
                  <td className="text-right">
                    <button
                      onClick={() => handleDelete(inc.id)}
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
