import React from "react";
import { TrendingUp } from "lucide-react";

export default function TopFeedsBar({ topFeeds }) {
  if (!topFeeds || topFeeds.length === 0) return null;
  const max = topFeeds[0]?.total || 1;
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-8">
      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-emerald-600" /> Feed più attivi
      </h3>
      <div className="space-y-3">
        {topFeeds.map((f) => (
          <div key={f.id}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">{f.name}</span>
              <span className="text-sm font-bold text-emerald-700">{f.total.toLocaleString("it-IT")}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.round((f.total / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}