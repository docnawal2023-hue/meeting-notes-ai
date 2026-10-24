import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ComingSoon from "./pages/ComingSoon";
import Upload from "./pages/Upload";

export default function App() {
  return (
    <Routes>
      {/* Pages anyone can open */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Pages that need login */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload/>} />
          <Route path="/meetings/:id" element={<ComingSoon title="Meeting details" />} />
          <Route path="/tasks" element={<ComingSoon title="Tasks" />} />
        </Route>
      </Route>

      {/* Anything else */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}