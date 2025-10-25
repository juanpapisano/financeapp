import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  // Si no hay token, redirige
  if (!token) return <Navigate to="/" replace />;

  try {
    // Decodificar el token (sin dependencia externa)
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Date.now() / 1000;
    if (payload.exp && payload.exp < now) {
      // Token expirado → limpiar y redirigir
      localStorage.clear();
      return <Navigate to="/login" replace />;
    }
  } catch (err) {
    console.error("Error al validar token:", err);
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return children;
}

