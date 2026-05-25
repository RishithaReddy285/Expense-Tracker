import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { WalletCards } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    if (!form.email || !form.password || (!isLogin && !form.name)) return toast.error("Complete all required fields");
    if (!isLogin && form.password.length < 8) return toast.error("Password must be at least 8 characters");
    setLoading(true);
    try {
      await (isLogin ? login({ email: form.email, password: form.password }) : register(form));
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_28rem]">
        <section>
          <div className="inline-flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-soft dark:bg-slate-900">
            <span className="rounded-lg bg-teal-600 p-2 text-white"><WalletCards size={22} /></span>
            <span className="font-bold text-slate-950 dark:text-white">Spendwise</span>
          </div>
          <h1 className="mt-8 max-w-3xl text-4xl font-extrabold tracking-normal text-slate-950 dark:text-white sm:text-6xl">Control spending with a calm, modern finance workspace.</h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">Track expenses, budgets, exports, recurring payments, and analytics from one responsive dashboard.</p>
        </section>
        <form onSubmit={submit} className="card p-6">
          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">{isLogin ? "Login" : "Create account"}</h2>
          <div className="mt-6 space-y-3">
            {!isLogin && <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="input" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn-primary mt-5 w-full" disabled={loading}>{loading ? "Please wait..." : isLogin ? "Login" : "Register"}</button>
          <button type="button" className="mt-4 w-full text-sm font-semibold text-teal-700 dark:text-teal-300" onClick={() => navigate(isLogin ? "/register" : "/login")}>
            {isLogin ? "Need an account? Register" : "Already registered? Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
