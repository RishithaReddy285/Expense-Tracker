import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const palette = ["#0f766e", "#f59e0b", "#e11d48", "#2563eb", "#7c3aed", "#16a34a", "#ea580c", "#0891b2", "#be123c", "#475569"];

export default function AnalyticsChart({ summary }) {
  const data = Object.entries(summary?.by_category || {}).map(([name, value]) => ({ name, value }));
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="card p-5">
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">Category spend</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">Distribution</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={95} label>
                {data.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
