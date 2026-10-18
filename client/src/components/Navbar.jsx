import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100"
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-blue-700 mr-4">MeetingNotes AI</span>
          <NavLink to="/dashboard" className={linkClass}>Meetings</NavLink>
          <NavLink to="/upload" className={linkClass}>New Meeting</NavLink>
          <NavLink to="/tasks" className={linkClass}>Tasks</NavLink>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 hidden sm:inline">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}