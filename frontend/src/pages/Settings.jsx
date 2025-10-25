import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-primary text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft size={18} /> Volver
        </button>
        <h1 className="text-2xl font-bold">Configuración</h1>
      </div>

      <div className="space-y-4">
        <a
          href="/categories"
          className="block bg-secondary rounded-lg p-4 hover:bg-gray-700 transition"
        >
          📂 Administrar categorías
        </a>
        <a
          href="/entities"
          className="block bg-secondary rounded-lg p-4 hover:bg-gray-700 transition"
        >
          👥 Entidades compartidas
        </a>
        <a
          href="#"
          className="block bg-secondary rounded-lg p-4 hover:bg-gray-700 transition"
        >
          👤 Perfil de usuario (próximamente)
        </a>
        <a
          href="#"
          className="block bg-secondary rounded-lg p-4 hover:bg-gray-700 transition"
        >
          ⚙️ Preferencias (próximamente)
        </a>
      </div>
    </div>
  );
}
