import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, MapPin, Clock, ArrowRight, Briefcase, Filter, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import moment from "moment";

const CONTRACT_LABELS = {
  tempo_indeterminato: "Tempo Indeterminato",
  tempo_determinato: "Tempo Determinato",
  apprendistato: "Apprendistato",
  stage: "Stage/Tirocinio",
  partita_iva: "Partita IVA",
  collaborazione: "Collaborazione",
  somministrazione: "Somministrazione",
};

export default function RisultatiRicerca() {
  const urlParams = new URLSearchParams(window.location.search);
  const queryKeyword = urlParams.get("q") || "";
  const queryLocation = urlParams.get("loc") || "";

  const [contractFilter, setContractFilter] = useState("all");
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const { data: allJobs, isLoading } = useQuery({
    queryKey: ["search-jobs"],
    queryFn: () => base44.entities.JobOffer.list("-created_date", 200),
    initialData: [],
  });

  const filteredJobs = useMemo(() => {
    let results = [...allJobs];

    if (queryKeyword) {
      const kw = queryKeyword.toLowerCase();
      results = results.filter(
        (j) =>
          j.title?.toLowerCase().includes(kw) ||
          j.company?.toLowerCase().includes(kw) ||
          j.category?.toLowerCase().includes(kw) ||
          j.description?.toLowerCase().includes(kw)
      );
    }

    if (queryLocation) {
      const loc = queryLocation.toLowerCase();
      results = results.filter(
        (j) =>
          j.location?.toLowerCase().includes(loc) ||
          j.region?.toLowerCase().includes(loc)
      );
    }

    if (contractFilter !== "all") {
      results = results.filter((j) => j.contract_type === contractFilter);
    }

    if (scheduleFilter !== "all") {
      results = results.filter((j) => j.work_schedule === scheduleFilter);
    }

    if (sortBy === "recent") {
      results.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }

    return results;
  }, [allJobs, queryKeyword, queryLocation, contractFilter, scheduleFilter, sortBy]);

  const title = queryKeyword && queryLocation
    ? `Offerte di Lavoro ${queryKeyword} a ${queryLocation}`
    : queryKeyword
    ? `Offerte di Lavoro ${queryKeyword}`
    : queryLocation
    ? `Offerte di Lavoro a ${queryLocation}`
    : "Tutte le Offerte di Lavoro";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-6">
        <div className="text-sm text-gray-500 mb-2">
          <Link to={createPageUrl("Home")} className="hover:text-emerald-600">Home</Link>
          <span className="mx-2">›</span>
          <span>{title}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 mt-1">
          {isLoading ? "Caricamento..." : `${filteredJobs.length} risultati trovati`}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar filters */}
        <aside className="lg:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2 mb-4">
              <SlidersHorizontal className="w-4 h-4" />
              Filtri
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                  Tipo Contratto
                </label>
                <Select value={contractFilter} onValueChange={setContractFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    {Object.entries(CONTRACT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                  Orario
                </label>
                <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                  Ordina per
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Più recenti</SelectItem>
                    <SelectItem value="relevance">Rilevanza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          {isLoading ? (
            <div className="space-y-3">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                  <Skeleton className="h-5 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700">Nessun risultato trovato</h3>
              <p className="text-gray-500 mt-1 text-sm">Prova a modificare i filtri o la ricerca</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <Link
                  key={job.id}
                  to={createPageUrl("DettaglioOfferta") + "?id=" + job.id}
                  className="group block bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 p-5 transition-all"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                        {job.company && (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" />
                            {job.company}
                          </span>
                        )}
                        {job.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {job.location}
                          </span>
                        )}
                      </div>
                      {job.description && (
                        <p className="text-sm text-gray-500 mt-3 line-clamp-2">{job.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {job.contract_type && (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-0 text-xs whitespace-nowrap">
                          {CONTRACT_LABELS[job.contract_type] || job.contract_type}
                        </Badge>
                      )}
                      {job.salary_min && (
                        <span className="text-xs text-gray-400">
                          da €{job.salary_min.toLocaleString()}/anno
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {moment(job.created_date).fromNow()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}