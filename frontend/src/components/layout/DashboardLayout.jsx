import { BarChart3, LogOut, Moon, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[18rem_1fr]">
        <div className="hidden lg:block"><Sidebar /></div>
        <main className="min-w-0 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-5">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white p-2 shadow-soft dark:border-slate-800 dark:bg-slate-950 lg:hidden">
        <NavLink to="/" className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-teal-700 dark:text-teal-300">
          <BarChart3 size={18} /> Dashboard
        </NavLink>
        <button className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300" onClick={toggleTheme}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />} Theme
        </button>
        <button className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300" onClick={logout}>
          <LogOut size={18} /> Logout
        </button>
      </nav>
    </div>
  );
}
