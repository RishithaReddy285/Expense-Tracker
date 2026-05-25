import { BarChart3, LogOut, Moon, Sun, WalletCards } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function Sidebar() {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950 lg:w-72">
      <div className="flex items-center gap-3 px-2">
        <div className="rounded-lg bg-teal-600 p-2 text-white"><WalletCards size={22} /></div>
        <div>
          <p className="text-lg font-bold text-slate-950 dark:text-white">Spendwise</p>
          <p className="text-xs text-slate-500">Finance dashboard</p>
        </div>
      </div>
      <nav className="mt-8 space-y-2">
        <NavLink to="/" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"}`}>
          <BarChart3 size={18} /> Dashboard
        </NavLink>
      </nav>
      <div className="mt-auto space-y-3">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
        </div>
        <button className="btn-secondary w-full" onClick={toggleTheme}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />} Theme</button>
        <button className="btn-secondary w-full" onClick={logout}><LogOut size={17} /> Logout</button>
      </div>
    </aside>
  );
}
