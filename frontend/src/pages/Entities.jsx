import { useEffect, useMemo, useRef, useState } from "react";
import { Users, ReceiptText } from "lucide-react";
import api from "../api/axiosClient";
import EmptyState from "../components/EmptyState";

const SHARE_TOTAL = 100;

function formatCurrency(value) {
  const amount = Number.parseFloat(value ?? 0);
  if (Number.isNaN(amount)) return "0.00";
  return amount.toFixed(2);
}

export default function Entities() {
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
  const [expanded, setExpanded] = useState(null);
  const [entityExpenses, setEntityExpenses] = useState({});
  const [loadingExpenses, setLoadingExpenses] = useState({});

  const [newEntity, setNewEntity] = useState({
    name: "",
    members: defaultMembers,
  });
  const [newEntityLoading, setNewEntityLoading] = useState(false);
  const [newEntityError, setNewEntityError] = useState("");

  const [memberForms, setMemberForms] = useState({});
  const [shareEdits, setShareEdits] = useState({});
  const newEntityRef = useRef(null);

  useEffect(() => {
    fetchEntities();
  }, []);

  useEffect(() => {
    const formState = {};
    const shareState = {};
    entities.forEach((entity) => {
      formState[entity.id] = { email: "", share: "" };
      entity.members.forEach((member) => {
        shareState[member.id] = member.share.toString();
      });
    });
    setMemberForms(formState);
    setShareEdits(shareState);
  }, [entities]);

  const fetchEntities = async () => {
    try {
      const res = await api.get("/entities");
      setEntities(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEntityExpenses = async (entityId) => {
    setLoadingExpenses((prev) => ({ ...prev, [entityId]: true }));
    try {
      const res = await api.get(`/entities/${entityId}/expenses`);
      setEntityExpenses((prev) => ({ ...prev, [entityId]: res.data }));
    } catch (err) {
      console.error(err);
      alert("No se pudieron cargar los gastos de la entidad");
    } finally {
      setLoadingExpenses((prev) => ({ ...prev, [entityId]: false }));
    }
  };

  const toggleExpanded = async (entityId) => {
    if (expanded === entityId) {
      setExpanded(null);
      return;
    }
    setExpanded(entityId);
    if (!entityExpenses[entityId]) {
      await fetchEntityExpenses(entityId);
    }
  };

  const handleNewEntityMemberChange = (index, key, value) => {
    setNewEntity((prev) => {
      const members = [...prev.members];
      members[index] = { ...members[index], [key]: value };
      return { ...prev, members };
    });
  };

  const addMemberRow = () => {
    setNewEntity((prev) => ({
      ...prev,
      members: [...prev.members, { email: "", share: "" }],
    }));
  };

  const removeMemberRow = (index) => {
    setNewEntity((prev) => ({
      ...prev,
      members: prev.members.filter((_, idx) => idx !== index),
    }));
  };

  const validateNewEntity = () => {
    if (!newEntity.name.trim()) {
      setNewEntityError("La entidad necesita un nombre");
      return false;
    }

    const members = newEntity.members.filter((member) => member.email.trim());
    if (members.length < 2) {
      setNewEntityError("Agregá al menos dos integrantes para compartir gastos");
      return false;
    }

    const seen = new Set();
    for (const member of members) {
      const email = member.email.trim().toLowerCase();
      if (!email) {
        setNewEntityError("Ingresá el email de cada integrante");
        return false;
      }
      if (seen.has(email)) {
        setNewEntityError("No se permiten emails duplicados en la entidad");
        return false;
      }
      seen.add(email);

      const shareValue = Number(member.share);
      if (Number.isNaN(shareValue) || shareValue < 0) {
        setNewEntityError("Ingresá porcentajes válidos (0 a 100)");
        return false;
      }
    }

    const totalShare = members.reduce(
      (sum, member) => sum + Number(member.share || 0),
      0,
    );

    if (Math.abs(totalShare - SHARE_TOTAL) > 0.01) {
      setNewEntityError("La suma de los porcentajes debe ser 100");
      return false;
    }

    if (!members.some((member) => member.email.trim().toLowerCase() === currentUserEmail)) {
      setNewEntityError("Incluí tu propio email para asignarte un porcentaje");
      return false;
    }

    return true;
  };

  const handleCreateEntity = async (event) => {
    event.preventDefault();
    setNewEntityError("");
    if (!validateNewEntity()) return;

    setNewEntityLoading(true);
    try {
      const payload = {
        name: newEntity.name.trim(),
        members: newEntity.members
          .filter((member) => member.email.trim())
          .map((member) => ({
            email: member.email.trim().toLowerCase(),
            share: Number(member.share),
          })),
      };

      await api.post("/entities", payload);
      setNewEntity({ name: "", members: defaultMembers });
      await fetchEntities();
    } catch (err) {
      console.error(err);
      setNewEntityError(err.response?.data?.message || "No se pudo crear la entidad");
    } finally {
      setNewEntityLoading(false);
    }
  };

  const handleMemberFormChange = (entityId, key, value) => {
    setMemberForms((prev) => ({
      ...prev,
      [entityId]: {
        ...prev[entityId],
        [key]: value,
      },
    }));
  };

  const handleAddExistingMember = async (entityId) => {
    const form = memberForms[entityId];
    if (!form) return;
    const email = form.email.trim().toLowerCase();
    const share = Number(form.share);
    if (!email || Number.isNaN(share)) {
      alert("Ingresá email y porcentaje válido");
      return;
    }

    try {
      await api.post(`/entities/${entityId}/members`, { email, share });
      setMemberForms((prev) => ({
        ...prev,
        [entityId]: { email: "", share: "" },
      }));
      await fetchEntities();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "No se pudo agregar al integrante");
    }
  };

  const handleShareEditChange = (memberId, value) => {
    setShareEdits((prev) => ({ ...prev, [memberId]: value }));
  };

  const handleUpdateShare = async (entityId, memberId) => {
    const rawValue = shareEdits[memberId];
    if (rawValue === undefined || rawValue === "") {
      alert("Ingresá un porcentaje válido");
      return;
    }

    const value = Number(rawValue);
    if (Number.isNaN(value)) {
      alert("Ingresá un porcentaje válido");
      return;
    }

    try {
      await api.patch(`/entities/${entityId}/members/${memberId}`, { share: value });
      await fetchEntities();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "No se pudo actualizar el porcentaje");
    }
  };

  const handleRemoveMember = async (entityId, memberId) => {
    if (!confirm("¿Eliminar integrante? Ajustaremos los porcentajes restantes automáticamente.")) {
      return;
    }
    try {
      await api.delete(`/entities/${entityId}/members/${memberId}`);
      await fetchEntities();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "No se pudo eliminar al integrante");
    }
  };

  const renderExpenseBreakdown = (expense) => {
    const payerRecord = expense.personalExpenses.find(
      (item) => item.isPayer && item.share === null,
    );
    const breakdown = expense.personalExpenses.filter((item) => item.share !== null);
    return (
      <div className="border border-gray-700 rounded-lg p-4 space-y-3" key={expense.id}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="font-semibold">
              {expense.description || "Gasto sin descripción"}
            </p>
            <p className="text-gray-400 text-sm">
              {new Date(expense.date).toLocaleDateString()} · Pagado por{" "}
              {payerRecord
                ? `${payerRecord.user.name} (${payerRecord.user.email})`
                : `${expense.addedBy.name} (${expense.addedBy.email})`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Total</p>
            <p className="text-lg font-bold text-blue-400">
              ${formatCurrency(expense.amount)}
            </p>
          </div>
        </div>
        <div className="bg-primary/40 rounded-lg p-3 space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Distribución del gasto
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {breakdown.map((item) => {
              const isPayer = item.isPayer;
              const owed = isPayer
                ? Number(expense.amount) - Number(item.amount)
                : Number(item.amount);
              const label = isPayer
                ? `Ya pagó ${formatCurrency(item.amount)} · Le deben ${formatCurrency(
                    Math.max(owed, 0),
                  )}`
                : `Debe ${formatCurrency(owed)} al pagador`;
              return (
                <div
                  key={item.id}
                  className="flex flex-col border border-gray-700 rounded-md p-3"
                >
                  <span className="font-medium">
                    {item.user.name} ({item.user.email})
                  </span>
                  <span className="text-gray-300">
                    {Number(item.share).toFixed(2)}% · ${formatCurrency(item.amount)}
                  </span>
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-primary text-white p-6 space-y-8">
      <section
        ref={newEntityRef}
        className="bg-secondary rounded-2xl p-6 shadow-md space-y-4"
      >
        <h1 className="text-2xl font-bold">Entidades compartidas</h1>
        <p className="text-gray-400">
          Creá grupos para dividir gastos. Cada integrante recibe un porcentaje del total.
        </p>

        <form onSubmit={handleCreateEntity} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Nombre de la entidad</label>
            <input
              type="text"
              value={newEntity.name}
              onChange={(event) =>
                setNewEntity((prev) => ({ ...prev, name: event.target.value }))
              }
              className="mt-1 w-full rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
              placeholder="Ej: Casa Palermo"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Integrantes</h2>
              <button
                type="button"
                onClick={addMemberRow}
                className="text-sm text-blue-400 hover:underline"
              >
                + Agregar integrante
              </button>
            </div>

            <div className="space-y-3">
              {newEntity.members.map((member, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
                >
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">
                      Email
                    </label>
                    <input
                      type="email"
                      value={member.email}
                      onChange={(event) =>
                        handleNewEntityMemberChange(index, "email", event.target.value)
                      }
                      className="mt-1 w-full rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
                      placeholder="usuario@mail.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">
                      Porcentaje (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={member.share}
                      onChange={(event) =>
                        handleNewEntityMemberChange(index, "share", event.target.value)
                      }
                      className="mt-1 w-full rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    {newEntity.members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMemberRow(index)}
                        className="text-sm text-red-400 hover:underline"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {newEntityError && <p className="text-sm text-red-400">{newEntityError}</p>}

          <button
            type="submit"
            disabled={newEntityLoading}
            className="px-6 py-2 rounded-md font-semibold bg-gradient-accent hover:opacity-90 transition"
          >
            {newEntityLoading ? "Guardando..." : "Crear entidad"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Tus entidades</h2>
        {entities.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aún no tenés entidades"
            description="Agrupá gastos compartidos creando tu primera entidad."
            actionLabel="Crear entidad"
            onAction={() => newEntityRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="border-dashed border-border/70 bg-secondary/40"
          />
        ) : (
          <div className="space-y-6">
            {entities.map((entity) => (
              <div key={entity.id} className="bg-secondary rounded-2xl p-6 shadow-md space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{entity.name}</h3>
                    <p className="text-gray-400 text-sm">
                      Integrantes: {entity.members.length} · Total 100%
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(entity.id)}
                    className="text-sm text-blue-400 hover:underline"
                  >
                    {expanded === entity.id ? "Ocultar gastos" : "Ver gastos compartidos"}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2">Nombre</th>
                        <th className="text-left py-2">Email</th>
                        <th className="text-left py-2">Porcentaje</th>
                        <th className="text-right py-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entity.members.map((member) => (
                        <tr key={member.id} className="border-b border-gray-800">
                          <td className="py-2">{member.user.name}</td>
                          <td>{member.user.email}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={shareEdits[member.id] ?? member.share}
                                onChange={(event) =>
                                  handleShareEditChange(member.id, event.target.value)
                                }
                                className="w-24 rounded-md bg-primary border border-gray-600 p-1 text-white focus:border-accent-from focus:ring-0"
                              />
                              <span className="text-gray-400 text-xs">%</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateShare(entity.id, member.id)}
                                className="text-xs text-blue-400 hover:underline"
                              >
                                Guardar
                              </button>
                            </div>
                          </td>
                          <td className="text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(entity.id, member.id)}
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

                <div className="bg-primary/30 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Invitar integrante</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="email"
                      placeholder="Email"
                      value={memberForms[entity.id]?.email || ""}
                      onChange={(event) =>
                        handleMemberFormChange(entity.id, "email", event.target.value)
                      }
                      className="rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="Porcentaje"
                      value={memberForms[entity.id]?.share || ""}
                      onChange={(event) =>
                        handleMemberFormChange(entity.id, "share", event.target.value)
                      }
                      className="rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddExistingMember(entity.id)}
                      className="rounded-md bg-gradient-to-r from-green-500 to-emerald-500 font-semibold hover:opacity-90 transition"
                    >
                      Agregar
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Ajustá los porcentajes de los integrantes actuales antes de sumar uno nuevo para
                    mantener la suma en 100%.
                  </p>
                </div>

                {expanded === entity.id && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold uppercase tracking-wide">
                      Gastos compartidos
                    </h4>
                    {loadingExpenses[entity.id] ? (
                      <p className="text-gray-400 text-sm">Cargando...</p>
                    ) : !entityExpenses[entity.id] || entityExpenses[entity.id].length === 0 ? (
                      <EmptyState
                        icon={ReceiptText}
                        title="Sin gastos compartidos"
                        description="Registrá gastos para ver cómo se distribuyen entre los integrantes."
                        className="border-dashed border-border/70 bg-primary/30"
                        tone="brand"
                      />
                    ) : (
                      <div className="space-y-3">
                        {entityExpenses[entity.id].map(renderExpenseBreakdown)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
