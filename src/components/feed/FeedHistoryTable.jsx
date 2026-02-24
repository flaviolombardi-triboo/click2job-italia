import React, { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

const statusConfig = {
  success: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 text-emerald-700", label: "Successo" },
  partial: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 text-amber-700", label: "Parziale" },
  error: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 text-red-700", label: "Errore" },
};

function HistoryRow({ log }) {
  const s = statusConfig[log.status] || statusConfig.success;
  const Icon = s.icon;
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td className="py-2.5 px-3 text-xs text-gray-500 whitespace-nowrap">{moment(log.date).format("DD/MM/YY HH:mm")}</td>
      <td className="py-2.5 px-3">
        <Badge className={`${s.bg} border-0 text-xs gap-1`}>
          <Icon className="w-3 h-3" />{s.label}
        </Badge>
      </td>
      <td className="py-2.5 px-3 text-sm font-semibold text-emerald-700">{(log.jobs_imported || 0).toLocaleString("it-IT")}</td>
      <td className="py-2.5 px-3 text-xs text-gray-400">{log.jobs_skipped || 0}</td>
      <td className="py-2.5 px-3 text-xs text-gray-400">{log.chunks_processed || 0}</td>
      <td className="py-2.5 px-3 text-xs text-gray-400">{log.duration_seconds ? `${log.duration_seconds}s` : "—"}</td>
      {log.error_message && (
        <td className="py-2.5 px-3 text-xs text-red-500 truncate max-w-[200px]" title={log.error_message}>{log.error_message}</td>
      )}
    </tr>
  );
}

export default function FeedHistoryTable({ feeds, feedHistory }) {
  const [expandedFeed, setExpandedFeed] = useState(null);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Storico per feed</h3>
        <p className="text-xs text-gray-400 mt-0.5">Clicca su un feed per espandere lo storico importazioni</p>
      </div>
      {feeds.map((feed) => {
        const isOpen = expandedFeed === feed.id;
        const history = feedHistory?.[feed.id] || [];
        return (
          <div key={feed.id} className="border-b border-gray-50 last:border-0">
            <button
              onClick={() => setExpandedFeed(isOpen ? null : feed.id)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-800 text-sm">{feed.name}</span>
                <Badge className={`${feed.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'} border-0 text-xs`}>
                  {feed.status === 'error' ? 'Errore' : 'Attivo'}
                </Badge>
                {history.length > 0 && (
                  <span className="text-xs text-gray-400">{history.length} import</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-700">{(feed.total_jobs_imported || 0).toLocaleString("it-IT")} annunci totali</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-gray-100 bg-gray-50/30">
                {history.length === 0 ? (
                  <p className="text-xs text-gray-400 px-5 py-4">Nessuno storico disponibile ancora. Lo storico viene registrato ad ogni elaborazione di chunk.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {["Data", "Stato", "Importati", "Saltati", "Chunk", "Durata"].map(h => (
                            <th key={h} className="py-2 px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((log, i) => <HistoryRow key={i} log={log} />)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}