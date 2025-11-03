import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "../api/axiosClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleGoogleSuccess = useCallback(
    async (response) => {
      try {
        if (!response?.credential) {
          setError("No pudimos validar tu cuenta de Google.");
          return;
        }
        const res = await api.post("/users/google", { credential: response.credential });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("userName", res.data.user.name);
        localStorage.setItem("userEmail", res.data.user.email);
        localStorage.setItem("userId", res.data.user.id);
        navigate("/dashboard");
      } catch (err) {
        setError("No pudimos iniciar sesión con Google. Intentá nuevamente.");
      }
    },
    [navigate],
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/dashboard", { replace: true });
  }, [navigate]);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) return;

    const existingScript = document.getElementById("google-oauth");
    const initialize = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleSuccess,
      });
      window.google.accounts.id.renderButton(document.getElementById("googleSignInDiv"), {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
      });
    };

    if (existingScript) {
      initialize();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = "google-oauth";
    script.onload = initialize;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [handleGoogleSuccess, googleClientId]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const res = await api.post("/users/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userName", res.data.user.name);
      localStorage.setItem("userEmail", res.data.user.email);
      localStorage.setItem("userId", res.data.user.id);
      navigate("/dashboard");
    } catch (err) {
      setError("Credenciales incorrectas o usuario no encontrado");
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-login">
      <div className="absolute inset-0 bg-base-darkest/95" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rounded-[40px] border border-border/60 bg-base-card/95 p-10 shadow-soft">
          <header className="text-center">
            <h1 className="text-3xl font-display font-semibold text-text-secondary">¡Bienvenido!</h1>
            <p className="mt-2 text-sm text-text-muted">
              Ingresá con tu correo para continuar con tu organización financiera.
            </p>
          </header>

          {error && (
            <p className="mt-6 rounded-3xl border border-red-400/60 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
              {error}
            </p>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-5 text-text-primary">
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

            <button
              type="submit"
              className="w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-base-dark shadow-card transition hover:bg-brand-hover"
            >
              Iniciar sesión
            </button>
          </form>

          {googleClientId && (
            <div className="mt-6 space-y-3">
              <div className="relative flex items-center justify-center">
                <span className="absolute inset-x-0 h-px bg-border" />
                <span className="relative bg-base-card/95 px-3 text-[11px] uppercase tracking-wide text-text-muted">
                  o continuá con
                </span>
              </div>
              <div id="googleSignInDiv" className="flex justify-center" />
            </div>
          )}

          <p className="mt-8 text-center text-xs text-text-muted">
            ¿No tenés cuenta todavía?{" "}
            <a href="/register" className="font-semibold text-brand hover:text-brand-hover">
              Créala acá
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
