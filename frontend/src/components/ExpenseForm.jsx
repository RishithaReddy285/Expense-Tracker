import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import { categories, paymentMethods, recurrences } from "../utils/constants";

const initial = { title: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10), payment_method: "UPI", notes: "", recurrence: "None" };

export default function ExpenseForm({ selected, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(selected ? { ...selected, amount: String(selected.amount), notes: selected.notes || "" } : initial);
    setError("");
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
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">{selected ? "Edit expense" : "Add expense"}</h2>
        {selected && <button type="button" className="btn-secondary" onClick={onCancel}><X size={16} /> Cancel</button>}
      </div>
      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
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
