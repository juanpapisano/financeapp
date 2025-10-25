import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export default function LineChartCard({ data }) {
  const chartData = data
    ? [
        { name: "Income", value: data.totalIncome },
        { name: "Expense", value: data.totalExpense },
      ]
    : [];

  return (
    <div className="mt-4 rounded-3xl border border-border bg-surface p-6 shadow-soft">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <XAxis dataKey="name" stroke="#6B7D7D" tickLine={false} axisLine={false} />
          <YAxis stroke="#6B7D7D" tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "white",
              borderRadius: "16px",
              border: "1px solid #E4EFE8",
              boxShadow: "0 18px 42px -24px rgba(0, 104, 255, 0.25)",
              color: "#052224",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#00D09E"
            strokeWidth={3}
            dot={{ r: 5, strokeWidth: 2, stroke: "#FFFFFF" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
