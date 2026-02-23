import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, MapPin, Clock, ArrowRight, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

export default function LatestJobs({ jobs, isLoading }) {
  if (isLoading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Ultime Offerte di Lavoro</h2>
        <div className="grid gap-3">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-5 w-2/3 bg-gray-100 rounded mb-3" />
              <div className="h-4 w-1/3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!jobs || jobs.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ultime Offerte di Lavoro</h2>
          <p className="text-gray-500 mt-1 text-sm">Le posizioni più recenti pubblicate</p>
        </div>
        <Link
          to={createPageUrl("RisultatiRicerca")}
          className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Vedi tutte
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid gap-3">
        {jobs.slice(0, 8).map((job) => (
          <Link
            key={job.id}
            to={createPageUrl("DettaglioOfferta") + "?id=" + job.id}
            className="group bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 p-5 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
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
                  {job.category && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      {job.category}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {job.contract_type && (
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-0 font-medium text-xs">
                    {job.contract_type.replace(/_/g, " ")}
                  </Badge>
                )}
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {moment(job.created_date).fromNow()}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="sm:hidden mt-6 text-center">
        <Link
          to={createPageUrl("RisultatiRicerca")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Vedi tutte le offerte
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}