import { useCallback, useEffect, useState } from "react";
import api from "../api/axiosClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const existingScript = document.getElementById("google-oauth");
    if (existingScript) {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleSuccess,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("googleSignInDiv"),
          { theme: "outline", size: "large", shape: "pill", text: "continue_with" },
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = "google-oauth";
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleSuccess,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("googleSignInDiv"),
          { theme: "outline", size: "large", shape: "pill", text: "continue_with" },
        );
      }
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [handleGoogleSuccess]);

  const handleLogin = async (e) => {
    e.preventDefault();
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
        <div className="w-full max-w-sm rounded-4xl border border-border/60 bg-base-card/95 p-10 shadow-soft">
          <header className="text-center text-text-primary">
            <p className="text-xs uppercase tracking-[0.35em] text-text-muted">
              Welcome back
            </p>
            <h1 className="mt-3 text-3xl font-display font-semibold text-text-secondary">
              Welcome
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              Username or Email to continue with FinWise
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
                Username or Email
              </label>
              <input
                type="email"
                className="mt-2 w-full rounded-3xl border border-border bg-base-muted/80 px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Password
              </label>
              <input
                type="password"
                className="mt-2 w-full rounded-3xl border border-border bg-base-muted/80 px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <a
                href="#"
                className="mt-2 inline-block text-xs font-medium text-brand hover:text-brand-hover"
              >
                Forgot Password?
              </a>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                className="w-full rounded-3xl bg-brand px-5 py-3 text-sm font-semibold text-base-dark shadow-card transition hover:bg-brand-hover"
              >
                Log In
              </button>
              <a
                href="/register"
                className="block w-full rounded-3xl border border-brand px-5 py-3 text-center text-sm font-semibold text-brand transition hover:bg-brand/10"
              >
                Sign Up
              </a>
              <div className="relative flex items-center justify-center">
                <span className="absolute inset-x-0 h-px bg-border" />
                <span className="relative bg-base-card/95 px-3 text-[11px] uppercase tracking-wide text-text-muted">
                  o continuá con
                </span>
              </div>
              <div id="googleSignInDiv" className="flex justify-center" />
            </div>
          </form>

          <footer className="mt-8 text-center text-xs text-text-muted">
            By logging in, you agree to our{" "}
            <span className="font-medium text-text-secondary">Terms & Policy</span>.
          </footer>
        </div>
      </div>
    </div>
  );
}
