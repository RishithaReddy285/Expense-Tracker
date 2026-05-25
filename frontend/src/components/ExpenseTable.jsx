import { Edit3, Trash2 } from "lucide-react";
import { currency } from "../utils/constants";
import Skeleton from "./ui/Skeleton";

export default function ExpenseTable({ expenses, loading, onEdit, onDelete }) {
  if (loading) return <div className="card p-5"><Skeleton className="h-64" /></div>;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/70">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{expense.title}</td>
                <td className="px-4 py-3">{expense.category}</td>
                <td className="px-4 py-3">{expense.date}</td>
                <td className="px-4 py-3">{expense.payment_method}</td>
                <td className="px-4 py-3 text-right font-bold">{currency.format(expense.amount)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button className="btn-secondary px-2" onClick={() => onEdit(expense)} title="Edit"><Edit3 size={16} /></button>
                    <button className="btn-secondary px-2 text-rose-600" onClick={() => onDelete(expense.id)} title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!expenses.length && <tr><td className="px-4 py-10 text-center text-slate-500" colSpan="6">No expenses found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
