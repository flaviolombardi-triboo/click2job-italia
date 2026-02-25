import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, MapPin, Clock, Briefcase, ExternalLink, ArrowLeft, Calendar, Euro, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function DettaglioOfferta() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const jobId = urlParams.get("id");

  const { data: job, isLoading } = useQuery({
    queryKey: ["job-detail", jobId],
    queryFn: () => base44.entities.JobOffer.filter({ id: jobId }),
    enabled: !!jobId,
  });

  const jobData = job?.[0];

  // Get related jobs
  const { data: relatedJobs } = useQuery({
    queryKey: ["related-jobs", jobData?.category],
    queryFn: () => base44.entities.JobOffer.list("-created_date", 5),
    enabled: !!jobData,
    initialData: [],
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-2/3 mb-4" />
        <Skeleton className="h-5 w-1/3 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700">Offerta non trovata</h2>
        <p className="text-gray-500 mt-2">L'offerta potrebbe essere scaduta o non disponibile.</p>
        <Link to={createPageUrl("Home")}>
          <Button className="mt-6">Torna alla Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-500 mb-6">
        <Link to={createPageUrl("Home")} className="hover:text-emerald-600">Home</Link>
        <span className="mx-2">›</span>
        <Link to={createPageUrl("RisultatiRicerca")} className="hover:text-emerald-600">Offerte di Lavoro</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-700">{jobData.title}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="flex flex-wrap gap-2 mb-4">
              {jobData.contract_type && (
                <Badge className="bg-emerald-50 text-emerald-700 border-0">
                  {CONTRACT_LABELS[jobData.contract_type] || jobData.contract_type}
                </Badge>
              )}
              {jobData.work_schedule && (
                <Badge variant="outline">
                  {jobData.work_schedule === "full_time" ? "Full-time" : "Part-time"}
                </Badge>
              )}
              {jobData.is_featured && (
                <Badge className="bg-amber-50 text-amber-700 border-0">In Evidenza</Badge>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{jobData.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-6">
              {jobData.company && (
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">{jobData.company}</span>
                </span>
              )}
              {jobData.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  {jobData.location}
                </span>
              )}
              <span className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                Pubblicata {moment(jobData.created_date).fromNow()}
              </span>
            </div>

            {(jobData.salary_min || jobData.salary_max) && (
              <div className="flex items-center gap-2 p-4 bg-emerald-50 rounded-xl mb-6">
                <Euro className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-800">
                  {jobData.salary_min && jobData.salary_max
                    ? `€${jobData.salary_min.toLocaleString()} - €${jobData.salary_max.toLocaleString()} /anno`
                    : jobData.salary_min
                    ? `Da €${jobData.salary_min.toLocaleString()} /anno`
                    : `Fino a €${jobData.salary_max.toLocaleString()} /anno`}
                </span>
              </div>
            )}

            {/* Description */}
            {jobData.description && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Descrizione
                </h2>
                <div className="space-y-3">
                  {jobData.description.split(/\n\n+/).map((block, i) => {
                    const trimmed = block.trim();
                    if (!trimmed) return null;
                    // Bullet list: righe che iniziano con -, *, •
                    const lines = trimmed.split('\n');
                    const isBulletBlock = lines.length > 1 && lines.every(l => /^[-*•]\s/.test(l.trim()) || l.trim() === '');
                    if (isBulletBlock) {
                      return (
                        <ul key={i} className="list-disc list-inside space-y-1 text-gray-600 pl-2">
                          {lines.filter(l => l.trim()).map((l, j) => (
                            <li key={j} className="leading-relaxed">{l.replace(/^[-*•]\s*/, '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={i} className="text-gray-600 leading-relaxed whitespace-pre-line">{trimmed}</p>;
                  })}
                </div>
              </div>
            )}

            {/* Requirements */}
            {jobData.requirements && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Requisiti</h2>
                <div className="space-y-3">
                  {jobData.requirements.split(/\n\n+/).map((block, i) => {
                    const trimmed = block.trim();
                    if (!trimmed) return null;
                    const lines = trimmed.split('\n');
                    const isBulletBlock = lines.length > 1 && lines.every(l => /^[-*•]\s/.test(l.trim()) || l.trim() === '');
                    if (isBulletBlock) {
                      return (
                        <ul key={i} className="list-disc list-inside space-y-1 text-gray-600 pl-2">
                          {lines.filter(l => l.trim()).map((l, j) => (
                            <li key={j} className="leading-relaxed">{l.replace(/^[-*•]\s*/, '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={i} className="text-gray-600 leading-relaxed whitespace-pre-line">{trimmed}</p>;
                  })}
                </div>
              </div>
            )}

            {/* Benefits */}
            {jobData.benefits && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Benefit</h2>
                <div className="space-y-3">
                  {jobData.benefits.split(/\n\n+/).map((block, i) => {
                    const trimmed = block.trim();
                    if (!trimmed) return null;
                    const lines = trimmed.split('\n');
                    const isBulletBlock = lines.length > 1 && lines.every(l => /^[-*•]\s/.test(l.trim()) || l.trim() === '');
                    if (isBulletBlock) {
                      return (
                        <ul key={i} className="list-disc list-inside space-y-1 text-gray-600 pl-2">
                          {lines.filter(l => l.trim()).map((l, j) => (
                            <li key={j} className="leading-relaxed">{l.replace(/^[-*•]\s*/, '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={i} className="text-gray-600 leading-relaxed whitespace-pre-line">{trimmed}</p>;
                  })}
                </div>
              </div>
            )}

            {/* CTA */}
            {jobData.apply_url && (
              <a href={jobData.apply_url} target="_blank" rel="noopener noreferrer">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-6 h-auto rounded-xl text-base w-full sm:w-auto">
                  Candidati Ora
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:w-80 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-4">Offerte Simili</h3>
            <div className="space-y-3">
              {relatedJobs
                .filter((j) => j.id !== jobData.id)
                .slice(0, 4)
                .map((j) => (
                  <Link
                    key={j.id}
                    to={createPageUrl("DettaglioOfferta") + "?id=" + j.id}
                    className="block group p-3 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    <h4 className="text-sm font-medium text-gray-800 group-hover:text-emerald-700 line-clamp-1">
                      {j.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{j.company}</p>
                    {j.location && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {j.location}
                      </p>
                    )}
                  </Link>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}