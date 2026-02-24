import React from "react";
import { TrendingUp, Rss, AlertCircle, Clock, CheckCircle2, Package } from "lucide-react";

const Card = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default function StatsCards({ summary }) {
  if (!summary) return null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <Card icon={TrendingUp} label="Annunci importati" value={summary.total_jobs_imported?.toLocaleString("it-IT")} color="bg-emerald-50 text-emerald-600" />
      <Card icon={Rss} label="Feed attivi" value={`${summary.active_feeds} / ${summary.total_feeds}`} color="bg-blue-50 text-blue-600" />
      <Card icon={AlertCircle} label="Feed in errore" value={summary.error_feeds} color={summary.error_feeds > 0 ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400"} />
      <Card icon={Clock} label="Chunk in attesa" value={summary.pending_chunks} sub="elaborazione automatica ogni 5 min" color="bg-amber-50 text-amber-500" />
      <Card icon={AlertCircle} label="Chunk con errori" value={summary.error_chunks} color={summary.error_chunks > 0 ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400"} />
      <Card icon={CheckCircle2} label="Feed configurati" value={summary.total_feeds} color="bg-purple-50 text-purple-600" />
    </div>
  );
}