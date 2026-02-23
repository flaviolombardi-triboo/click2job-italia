import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TrendingUp, TrendingDown, Minus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const NATIONAL_AVG = 1550;

export default function Stipendi() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: professions, isLoading } = useQuery({
    queryKey: ["professions-salary"],
    queryFn: () => base44.entities.Profession.list("sector", 300),
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

  // Top searched salaries
  const topProfessions = [...professions]
    .filter((p) => p.avg_salary_monthly)
    .sort((a, b) => (b.avg_salary_monthly || 0) - (a.avg_salary_monthly || 0))
    .slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-8 md:p-12 mb-10 text-white">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4">Stipendi in Italia</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 max-w-xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold">{NATIONAL_AVG.toLocaleString()} €</p>
            <p className="text-emerald-200 text-sm mt-1">netti al mese</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold">28.500 €</p>
            <p className="text-emerald-200 text-sm mt-1">lordi all'anno</p>
          </div>
        </div>
        <p className="text-emerald-100/80 mt-6 text-sm max-w-lg">
          Lo stipendio medio in Italia è di 28.500 € lordi all'anno, che corrispondono a circa 1.550 € netti al mese.
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

      {/* Top salaries */}
      {!searchTerm && topProfessions.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Retribuzioni più Cercate</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {topProfessions.map((p, i) => {
              const dev = p.salary_deviation_pct || Math.round(((p.avg_salary_monthly - NATIONAL_AVG) / NATIONAL_AVG) * 100);
              const isPositive = dev > 0;
              const isNeutral = dev === 0;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-6 py-4 ${
                    i < topProfessions.length - 1 ? "border-b border-gray-50" : ""
                  } hover:bg-gray-50 transition-colors`}
                >
                  <Link
                    to={createPageUrl("DettaglioProfessione") + "?id=" + p.id}
                    className="text-emerald-700 font-medium hover:text-emerald-800 text-sm"
                  >
                    {p.name}
                  </Link>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-semibold text-gray-700">
                      {p.avg_salary_monthly?.toLocaleString()} €/mese
                    </span>
                    <div className="flex items-center gap-1.5 w-20 justify-end">
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      ) : isNeutral ? (
                        <Minus className="w-4 h-4 text-gray-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          isPositive ? "text-emerald-600" : isNeutral ? "text-gray-400" : "text-red-500"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {dev}%
                      </span>
                    </div>
                    {/* Visual bar */}
                    <div className="hidden md:block w-32 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isPositive ? "bg-emerald-500" : "bg-red-400"}`}
                        style={{ width: `${Math.min(Math.abs(dev) + 10, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* By Sector */}
      {isLoading ? (
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">Nessuna professione trovata. I dati verranno popolati presto.</p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Stipendi Medi per Settore</h2>
          <div className="space-y-8">
            {Object.entries(grouped).map(([sector, profs]) => (
              <div key={sector}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{sector}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {profs.map((p) => (
                    <Link
                      key={p.id}
                      to={createPageUrl("DettaglioProfessione") + "?id=" + p.id}
                      className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-sm"
                    >
                      <span className="text-emerald-700 font-medium">{p.name}</span>
                      {p.avg_salary_monthly && (
                        <span className="text-gray-600 font-semibold">
                          {p.avg_salary_monthly.toLocaleString()} €/mese
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}