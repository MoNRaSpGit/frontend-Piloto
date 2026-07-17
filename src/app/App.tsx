import { Navigate, Route, Routes } from "react-router-dom";
import { PilotoHomePage } from "../features/piloto/PilotoHomePage";

function HealthPage() {
  return (
    <main style={{ fontFamily: "Inter, Segoe UI, sans-serif", padding: "2rem" }}>
      <h2>Frontend Piloto OK</h2>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<PilotoHomePage />} />
      <Route path="/health" element={<HealthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
