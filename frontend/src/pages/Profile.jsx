import { useNavigate } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-base-darkest text-text-primary">
      <div className="absolute inset-0 bg-gradient-hero opacity-40" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-24 pt-12">
        <header className="mb-10 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-base-card px-3 py-2 text-text-secondary transition hover:border-brand"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-semibold text-text-secondary">Profile</h1>
          <div className="rounded-full border border-border/60 bg-base-card p-3 text-text-secondary">
            <User size={18} />
          </div>
        </header>

        <section className="rounded-4xl border border-border/60 bg-base-card/95 p-8 text-center shadow-card">
          <p className="text-sm uppercase tracking-[0.35em] text-text-muted">
            Coming soon
          </p>
          <h2 className="mt-3 text-2xl font-display font-semibold text-text-secondary">
            Profile settings on the way
          </h2>
          <p className="mt-4 text-sm text-text-muted">
            Muy pronto vas a poder editar tus datos personales, preferencias y seguridad
            desde esta pantalla.
          </p>
        </section>
      </div>
    </div>
  );
}
