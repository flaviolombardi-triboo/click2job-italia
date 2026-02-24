import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{format(parseISO(label), "d MMMM", { locale: it })}</p>
      <p className="text-emerald-600">{payload[0]?.value?.toLocaleString("it-IT")} annunci importati</p>
    </div>
  );
};

export default function ImportTrendChart({ trend }) {
  if (!trend || trend.length === 0) return null;
  const hasData = trend.some(d => d.jobs_imported > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-8">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Andamento importazioni (ultimi 30 giorni)</h3>
      {!hasData ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Nessun dato ancora disponibile</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5aac6b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#5aac6b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickFormatter={(d) => format(parseISO(d), "d/M")}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={35} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="jobs_imported" stroke="#5aac6b" strokeWidth={2} fill="url(#colorJobs)" dot={false} activeDot={{ r: 4, fill: "#5aac6b" }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}