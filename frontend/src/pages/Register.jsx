import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "../api/axiosClient";
import DateInput from "../components/DateInput";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const payloadBirthdate = useMemo(
    () => (birthdate ? birthdate : undefined),
    [birthdate],
  );

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const body = {
      name,
      email,
      password,
    };
    if (payloadBirthdate) body.birthdate = payloadBirthdate;
    if (phone) body.phone = phone;

    try {
      const res = await api.post("/users/register", body);
      if (res.status === 201) {
        setSuccess("Cuenta creada. Te estamos llevando al inicio de sesión...");
        setTimeout(() => navigate("/"), 1500);
      }
    } catch (err) {
      setError("No pudimos crear tu cuenta. Revisá los datos o el email puede existir.");
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-login">
      <div className="absolute inset-0 bg-base-darkest/95" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rounded-[40px] border border-border/60 bg-base-card/95 p-10 shadow-soft">
          <header className="text-center">
            <h1 className="text-3xl font-display font-semibold text-text-secondary">Crear cuenta</h1>
            <p className="mt-2 text-sm text-text-muted">
              Completá tus datos para empezar a organizar tus finanzas.
            </p>
          </header>

          {error && (
            <p className="mt-6 rounded-3xl border border-red-400/60 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
              {error}
            </p>
          )}
          {success && (
            <p className="mt-6 rounded-3xl border border-emerald-400/60 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">
              {success}
            </p>
          )}

          <form onSubmit={handleRegister} className="mt-8 space-y-5 text-text-primary">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Nombre completo
              </label>
              <input
                type="text"
                className="mt-2 w-full rounded-full border border-border bg-base-muted/80 px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Correo electrónico
              </label>
              <input
                type="email"
                className="mt-2 w-full rounded-full border border-border bg-base-muted/80 px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Celular (opcional)
              </label>
              <input
                type="tel"
                className="mt-2 w-full rounded-full border border-border bg-base-muted/80 px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Fecha de nacimiento (opcional)
                </label>
                <DateInput
                  className="mt-2"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  inputClassName="bg-base-muted/80"
                />
              </div>

            <div className="relative">
              <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Contraseña
              </label>
              <input
                type={showPassword ? "text" : "password"}
                className="mt-2 w-full rounded-full border border-border bg-base-muted/80 px-4 py-3 pr-14 text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-[46px] text-text-muted transition hover:text-brand"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Confirmar contraseña
              </label>
              <input
                type={showConfirm ? "text" : "password"}
                className="mt-2 w-full rounded-full border border-border bg-base-muted/80 px-4 py-3 pr-14 text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="absolute right-3 top-[46px] text-text-muted transition hover:text-brand"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-base-dark shadow-card transition hover:bg-brand-hover"
            >
              Crear cuenta
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-text-muted">
            Al registrarte aceptás nuestros términos y el cuidado responsable de tu información.
          </p>
          <p className="mt-3 text-center text-xs text-text-muted">
            ¿Ya tenés cuenta?{" "}
            <a href="/" className="font-semibold text-brand hover:text-brand-hover">
              Iniciá sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
