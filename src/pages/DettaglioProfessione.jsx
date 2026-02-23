import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Euro, GraduationCap, Briefcase, ArrowRight, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function DettaglioProfessione() {
  const urlParams = new URLSearchParams(window.location.search);
  const profId = urlParams.get("id");

  const { data: profession, isLoading } = useQuery({
    queryKey: ["profession-detail", profId],
    queryFn: () => base44.entities.Profession.filter({ id: profId }),
    enabled: !!profId,
  });

  const profData = profession?.[0];

  // Related jobs
  const { data: relatedJobs } = useQuery({
    queryKey: ["related-jobs-prof", profData?.name],
    queryFn: () => base44.entities.JobOffer.list("-created_date", 5),
    enabled: !!profData,
    initialData: [],
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-10 w-2/3 mb-4" />
        <Skeleton className="h-6 w-1/3 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profData) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700">Professione non trovata</h2>
        <Link to={createPageUrl("ElencoProfessioni")}>
          <Button className="mt-6">Torna all'Elenco</Button>
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
        <Link to={createPageUrl("ElencoProfessioni")} className="hover:text-emerald-600">Elenco Professioni</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-700">{profData.name}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <Badge className="bg-emerald-50 text-emerald-700 border-0 mb-4">{profData.sector}</Badge>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{profData.name}</h1>

            {profData.description && (
              <p className="text-gray-600 leading-relaxed mb-8 whitespace-pre-line">{profData.description}</p>
            )}

            {/* Info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {profData.avg_salary_monthly && (
                <div className="bg-emerald-50 rounded-xl p-5 text-center">
                  <Euro className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-800">{profData.avg_salary_monthly.toLocaleString()} €</p>
                  <p className="text-xs text-emerald-600 mt-1">Stipendio netto/mese</p>
                </div>
              )}
              {profData.avg_salary_yearly && (
                <div className="bg-gray-50 rounded-xl p-5 text-center">
                  <Euro className="w-5 h-5 text-gray-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{profData.avg_salary_yearly.toLocaleString()} €</p>
                  <p className="text-xs text-gray-500 mt-1">RAL lorda/anno</p>
                </div>
              )}
              {profData.education_required && (
                <div className="bg-blue-50 rounded-xl p-5 text-center">
                  <GraduationCap className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-blue-800">{profData.education_required}</p>
                  <p className="text-xs text-blue-600 mt-1">Formazione richiesta</p>
                </div>
              )}
            </div>

            {/* Skills */}
            {profData.skills && profData.skills.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Competenze Chiave</h2>
                <div className="flex flex-wrap gap-2">
                  {profData.skills.map((skill, i) => (
                    <Badge key={i} variant="outline" className="px-3 py-1">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Related professions */}
            {profData.related_professions && profData.related_professions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Professioni Correlate</h2>
                <div className="flex flex-wrap gap-2">
                  {profData.related_professions.map((rp, i) => (
                    <Link
                      key={i}
                      to={createPageUrl("RisultatiRicerca") + "?q=" + encodeURIComponent(rp)}
                      className="text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {rp}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <Link to={createPageUrl("RisultatiRicerca") + "?q=" + encodeURIComponent(profData.name)}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Cerca offerte per {profData.name}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar: Related Jobs */}
        <aside className="lg:w-80 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-4">Offerte di Lavoro Recenti</h3>
            <div className="space-y-3">
              {relatedJobs.slice(0, 5).map((j) => (
                <Link
                  key={j.id}
                  to={createPageUrl("DettaglioOfferta") + "?id=" + j.id}
                  className="block group p-3 rounded-xl hover:bg-gray-50 transition-all"
                >
                  <h4 className="text-sm font-medium text-gray-800 group-hover:text-emerald-700 line-clamp-1">{j.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{j.company} {j.location && `• ${j.location}`}</p>
                </Link>
              ))}
              {relatedJobs.length === 0 && (
                <p className="text-sm text-gray-400">Nessuna offerta al momento</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}