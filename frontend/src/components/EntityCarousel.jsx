import { useEffect, useMemo, useState } from "react";
import {
  Layers,
  Users,
  ChevronLeft,
  ChevronRight,
  Leaf,
  ArrowUpCircle,
} from "lucide-react";

export default function EntityCarousel({ items = [], loading, error, formatMoney }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);

  const hasItems = items.length > 0;

  const current = useMemo(() => items[activeIndex] ?? null, [items, activeIndex]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  if (loading) {
    return (
      <CarouselShell>
        <p className="text-sm text-text-muted">Cargando entidades...</p>
      </CarouselShell>
    );
  }

  if (error) {
    return (
      <CarouselShell>
        <p className="text-sm text-red-400">{error}</p>
      </CarouselShell>
    );
  }

  if (!hasItems) {
    return (
      <CarouselShell>
        <div className="flex items-center gap-3">
          <Layers size={24} className="text-brand" />
          <div>
            <p className="text-sm font-semibold text-text-secondary">Sin entidades</p>
            <p className="text-xs text-text-muted">
              Creá una entidad para comenzar a dividir gastos.
            </p>
          </div>
        </div>
      </CarouselShell>
    );
  }

  const totalEntities = items.length;
  const debts = current?.debts?.slice(0, 3) ?? [];
  const extraDebtors = Math.max((current?.debts?.length || 0) - debts.length, 0);
  const pendingTotal = current?.pendingTotal || 0;

  return (
    <CarouselShell>
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/25 text-brand">
              <Layers size={24} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">
                Entidad {activeIndex + 1} de {totalEntities}
              </p>
              <h3 className="text-xl font-semibold text-text-secondary">{current?.name}</h3>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
                <Badge icon={Users}>{current?.membersCount ?? 0} miembros</Badge>
                <Badge icon={Leaf}>Mes actual</Badge>
              </div>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">Gasto acumulado</p>
              <p className="text-2xl font-display font-semibold text-text-secondary">
                ${formatMoney(current?.monthlyTotal || 0)}
              </p>
              <p className="text-xs text-text-muted">Monto registrado durante este mes</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-base-dark/70 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">
                Pendiente de cobro
              </p>
              <p className="text-sm font-semibold text-brand">
                ${formatMoney(pendingTotal)}
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-border/50 bg-base-dark/75 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
            <span>Balance entre miembros</span>
            <span className="flex items-center gap-1 text-[11px]">
              <ArrowUpCircle size={14} /> Deudas pendientes
            </span>
          </div>

          {debts.length === 0 ? (
            <p className="mt-4 text-sm font-medium text-brand">Todos al día · sin deudas 🧾</p>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              {debts.map((debt) => (
                <div
                  key={debt.userId}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-base-card/60 px-4 py-3"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-text-secondary">{debt.name}</span>
                    <span className="text-xs text-text-muted">Debe reembolsar a la entidad</span>
                  </div>
            <span className="text-sm font-semibold text-sky-light">
              -${formatMoney(debt.amount)}
            </span>
                </div>
              ))}
              {extraDebtors > 0 && (
                <p className="text-xs text-text-muted">
                  y {extraDebtors} miembro{extraDebtors > 1 ? "s" : ""} más con saldo pendiente.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {totalEntities > 1 && (
        <footer className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CarouselButton icon={ChevronLeft} onClick={handlePrev} label="Entidad anterior" />
            <CarouselButton icon={ChevronRight} onClick={handleNext} label="Entidad siguiente" />
          </div>
          <div className="flex items-center gap-1">
            {items.map((_, idx) => (
              <span
                key={`entity-dot-${idx}`}
                className={`h-1.5 w-4 rounded-full transition ${
                  idx === activeIndex ? "bg-brand" : "bg-base-dark"
                }`}
              />
            ))}
          </div>
        </footer>
      )}
    </CarouselShell>
  );
}

function CarouselShell({ children }) {
  return (
    <div className="relative overflow-hidden rounded-[36px] border border-border/60 bg-base-card/90 p-6 text-text-secondary shadow-soft">
      {children}
    </div>
  );
}

function Badge({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-base-dark/80 px-3 py-1">
      <Icon size={12} />
      {children}
    </span>
  );
}

function CarouselButton({ icon: Icon, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border/60 bg-base-card p-2 text-text-secondary transition hover:border-brand"
      aria-label={label}
    >
      <Icon size={18} />
    </button>
  );
}
