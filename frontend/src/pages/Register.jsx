import { useState } from "react";
import api from "../api/axiosClient";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/users/register", { name, email, password });
      if (res.status === 201) {
        setSuccess("Registro exitoso. Redirigiendo al login...");
        setTimeout(() => navigate("/"), 1500);
      }
    } catch (err) {
      setError("Error al registrar el usuario. Verificá los datos o el email ya existente.");
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-6">
      <div className="bg-secondary rounded-2xl p-8 w-full max-w-sm shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Crear cuenta</h1>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        {success && <p className="text-green-400 text-sm mb-4">{success}</p>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">Nombre</label>
            <input
              type="text"
              className="mt-1 w-full rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm">Contraseña</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md bg-primary border border-gray-600 p-2 text-white focus:border-accent-from focus:ring-0"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-md text-white font-semibold bg-gradient-accent hover:opacity-90 transition"
          >
            Registrarse
          </button>
        </form>

        <p className="text-gray-400 text-sm mt-6 text-center">
          ¿Ya tenés cuenta?{" "}
          <a href="/" className="text-blue-400 hover:underline">
            Iniciá sesión
          </a>
        </p>
      </div>
    </div>
  );
}
