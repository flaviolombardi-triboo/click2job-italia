import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, BookOpen, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function ElencoProfessioni() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: professions, isLoading } = useQuery({
    queryKey: ["professions-list"],
    queryFn: () => base44.entities.Profession.list("sector", 500),
    initialData: [],
  });

  const filtered = professions.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sector?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by sector
  const grouped = filtered.reduce((acc, p) => {
    const sector = p.sector || "Altro";
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(p);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-8 md:p-12 mb-10 text-white">
        <h1 className="text-3xl md:text-4xl font-extrabold">Elenco Professioni</h1>
        <p className="text-emerald-100/80 mt-3 max-w-lg">
          Definizione e descrizione dei lavori più richiesti in Italia. Scopri cosa fa ogni professionista, i requisiti e lo stipendio medio.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Cerca professione o settore..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nessuna professione trovata. I dati verranno popolati presto.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(grouped).map(([sector, profs]) => (
            <div key={sector} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-emerald-700 mb-2">{sector}</h3>
              <div className="grid grid-cols-2 gap-1.5 mt-4">
                {profs.map((p) => (
                  <Link
                    key={p.id}
                    to={createPageUrl("DettaglioProfessione") + "?id=" + p.id}
                    className="text-sm text-gray-600 hover:text-emerald-700 py-1 transition-colors flex items-center gap-1 group"
                  >
                    <span className="truncate">{p.name}</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}