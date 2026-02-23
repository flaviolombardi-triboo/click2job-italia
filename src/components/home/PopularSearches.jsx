import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight } from "lucide-react";

const POPULAR_JOBS = [
  "Programmatore", "Operaio", "Autista", "Ingegnere", "Cuoco",
  "Elettricista", "Segretaria", "Contabile", "Cameriera", "Infermiere",
  "Marketing", "Call Center", "Part Time", "Stage", "Idraulico",
  "Magazziniere", "Insegnante", "Educatore", "Grafico", "Receptionist",
  "Project Manager", "Badante", "Agente", "Amministrazione", "Risorse Umane",
  "Promoter", "Banca", "Assicurazioni", "Lavoro da Casa", "Categorie Protette",
  "Montatore", "Assemblaggio", "Confezionamento", "Inserimento Dati", "Hostess",
  "Perito", "Notturno", "Mattina", "Stagionale", "Laureati"
];

export default function PopularSearches() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Offerte di lavoro più cercate</h2>
          <p className="text-gray-500 mt-1 text-sm">Esplora le posizioni più richieste in Italia</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {POPULAR_JOBS.map((job) => (
          <Link
            key={job}
            to={createPageUrl("RisultatiRicerca") + "?q=" + encodeURIComponent(job)}
            className="group flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all text-sm text-gray-700 hover:text-emerald-700"
          >
            <span className="truncate">{job}</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-emerald-600" />
          </Link>
        ))}
      </div>
    </section>
  );
}