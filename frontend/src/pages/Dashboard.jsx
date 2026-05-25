import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Download, Filter, IndianRupee, PiggyBank, Search, TrendingUp } from "lucide-react";
import api from "../api/client";
import AnalyticsChart from "../components/AnalyticsChart";
import ExpenseForm from "../components/ExpenseForm";
import ExpenseTable from "../components/ExpenseTable";
import DashboardLayout from "../components/layout/DashboardLayout";
import StatCard from "../components/ui/StatCard";
import { categories, currency } from "../utils/constants";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, updateProfile } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", category: "", sort: "date", order: "desc", page: 1 });
  const [total, setTotal] = useState(0);
  const [budget, setBudget] = useState(user?.monthly_budget || 0);
  const month = new Date().toISOString().slice(0, 7);

  async function load() {
    setLoading(true);
    try {
      const params = { ...filters, page_size: 8 };
      const [expenseRes, summaryRes] = await Promise.all([api.get("/expenses", { params }), api.get("/expenses/summary/monthly", { params: { month } })]);
      setExpenses(expenseRes.data.items);
      setTotal(expenseRes.data.total);
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not load expenses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filters]);

  async function saveExpense(payload) {
    try {
      if (selected) await api.put(`/expenses/${selected.id}`, payload);
      else await api.post("/expenses", payload);
      toast.success(selected ? "Expense updated" : "Expense added");
      setSelected(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Save failed");
    }
  }

  async function deleteExpense(id) {
    if (!confirm("Delete this expense?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success("Expense deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
  }

  async function exportFile(type) {
    const { data } = await api.get(`/expenses/export/${type}`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses.${type}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const pageCount = Math.max(1, Math.ceil(total / 8));
  const highestCategory = useMemo(() => {
    const entries = Object.entries(summary?.by_category || {});
    return entries.sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
  }, [summary]);

  return (
    <DashboardLayout>
      <header className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Monthly overview</p>
          <h1 className="text-3xl font-extrabold tracking-normal text-slate-950 dark:text-white">Expense Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => exportFile("csv")}><Download size={17} /> CSV</button>
          <button className="btn-secondary" onClick={() => exportFile("pdf")}><Download size={17} /> PDF</button>
        </div>
      </header>

      {summary?.alert && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">{summary.alert}</div>}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="This month" value={currency.format(summary?.total || 0)} icon={IndianRupee} />
        <StatCard label="Budget used" value={`${summary?.budget_used_percent || 0}%`} icon={PiggyBank} tone="amber" />
        <StatCard label="Top category" value={highestCategory} icon={TrendingUp} tone="rose" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          <AnalyticsChart summary={summary} />
          <div className="card p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_12rem_10rem_10rem]">
              <label className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
                <input className="input pl-9" placeholder="Search title or notes" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} />
              </label>
              <select className="input" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}>
                <option value="">All categories</option>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select className="input" value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="title">Title</option>
                <option value="category">Category</option>
              </select>
              <button className="btn-secondary" onClick={() => setFilters({ ...filters, order: filters.order === "desc" ? "asc" : "desc" })}><Filter size={17} /> {filters.order}</button>
            </div>
          </div>
          <ExpenseTable expenses={expenses} loading={loading} onEdit={setSelected} onDelete={deleteExpense} />
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {filters.page} of {pageCount}</p>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={filters.page === 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</button>
              <button className="btn-secondary" disabled={filters.page === pageCount} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button>
            </div>
          </div>
        </div>
        <aside className="space-y-4">
          <ExpenseForm selected={selected} onCancel={() => setSelected(null)} onSubmit={saveExpense} />
          <div className="card p-5">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Budget</h2>
            <div className="mt-4 flex gap-2">
              <input className="input" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
              <button className="btn-primary" onClick={() => updateProfile({ monthly_budget: Number(budget) }).then(load)}>Save</button>
            </div>
          </div>
        </aside>
      </section>
    </DashboardLayout>
  );
}
