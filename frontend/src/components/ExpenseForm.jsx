import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save, Sparkles, Upload, X } from "lucide-react";
import api from "../api/client";
import { categories, paymentMethods, recurrences } from "../utils/constants";

const initial = { title: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10), payment_method: "UPI", notes: "", recurrence: "None" };

export default function ExpenseForm({ selected, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    setForm(selected ? { ...selected, amount: String(selected.amount), notes: selected.notes || "" } : initial);
    setError("");
    setAnalysis(null);
  }, [selected]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (!form.title.trim() || Number(form.amount) <= 0) {
      setError("Title and a valid amount are required.");
      return;
    }
    onSubmit({ ...form, amount: Number(form.amount) });
    setForm(initial);
    setAnalysis(null);
  }

  async function analyzeReceipt(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setAnalyzing(true);
    try {
      const { data } = await api.post("/expenses/analyze-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAnalysis(data);
      setForm((current) => ({
        ...current,
        title: data.title || current.title,
        amount: data.amount ? String(data.amount) : current.amount,
        category: data.category || current.category,
        date: data.date || current.date,
        payment_method: data.payment_method || current.payment_method,
        notes: [data.notes, data.time ? `Detected time: ${data.time}` : null].filter(Boolean).join("\n") || current.notes,
      }));
      toast.success("Receipt analyzed");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Upload analysis failed");
    } finally {
      setAnalyzing(false);
      event.target.value = "";
    }
  }

  function sourceLabel(source) {
    if (source === "receipt") return "from receipt";
    if (source === "image metadata") return "from image";
    if (source === "upload time") return "from upload";
    return "";
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">{selected ? "Edit expense" : "Add expense"}</h2>
        {selected && <button type="button" className="btn-secondary" onClick={onCancel}><X size={16} /> Cancel</button>}
      </div>
      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
      <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
        <label className="btn-secondary w-full cursor-pointer">
          {analyzing ? <Sparkles size={17} className="animate-pulse" /> : <Upload size={17} />}
          {analyzing ? "Analyzing..." : "Upload receipt"}
          <input className="hidden" type="file" accept="image/*" onChange={analyzeReceipt} disabled={analyzing} />
        </label>
        {analysis && (
          <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="rounded-lg bg-white px-3 py-2 dark:bg-slate-900">
              <span className="font-semibold text-slate-950 dark:text-white">Date:</span> {analysis.date || "Not found"}
              {analysis.date_source && <span className="ml-1 text-xs text-slate-400">{sourceLabel(analysis.date_source)}</span>}
            </div>
            <div className="rounded-lg bg-white px-3 py-2 dark:bg-slate-900">
              <span className="font-semibold text-slate-950 dark:text-white">Time:</span> {analysis.time || "Not found"}
              {analysis.time_source && <span className="ml-1 text-xs text-slate-400">{sourceLabel(analysis.time_source)}</span>}
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Title" value={form.title} onChange={(e) => update("title", e.target.value)} />
        <input className="input" type="number" min="0" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => update("amount", e.target.value)} />
        <select className="input" value={form.category} onChange={(e) => update("category", e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        <input className="input" type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
        <select className="input" value={form.payment_method} onChange={(e) => update("payment_method", e.target.value)}>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="input" value={form.recurrence} onChange={(e) => update("recurrence", e.target.value)}>{recurrences.map((item) => <option key={item}>{item}</option>)}</select>
        <textarea className="input sm:col-span-2" rows="3" placeholder="Notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
      </div>
      <button className="btn-primary mt-4 w-full sm:w-auto"><Save size={17} /> {selected ? "Update expense" : "Save expense"}</button>
    </form>
  );
}
