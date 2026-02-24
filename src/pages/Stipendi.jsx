import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TrendingUp, TrendingDown, Minus, Search, ChevronRight, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const NATIONAL_AVG = 1550;
const NATIONAL_AVG_YEARLY = 28500;

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

  const grouped = filtered.reduce((acc, p) => {
    const sector = p.sector || "Altro";
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(p);
    return acc;
  }, {});

  const topProfessions = [...professions]
    .filter((p) => p.avg_salary_monthly)
    .sort((a, b) => (b.avg_salary_monthly || 0) - (a.avg_salary_monthly || 0))
    .slice(0, 10);

  const bottomProfessions = [...professions]
    .filter((p) => p.avg_salary_monthly)
    .sort((a, b) => (a.avg_salary_monthly || 0) - (b.avg_salary_monthly || 0))
    .slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* SEO Hero editoriale */}
      <header className="mb-10">
        <p className="text-sm font-medium text-emerald-600 uppercase tracking-widest mb-2">Guida agli stipendi · Italia 2024</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          Quanto si guadagna in Italia?
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
          Lo stipendio medio netto in Italia si aggira intorno a <strong className="text-gray-900">{NATIONAL_AVG.toLocaleString()} € al mese</strong> (circa {NATIONAL_AVG_YEARLY.toLocaleString()} € lordi annui), ma la realtà è molto più articolata: il settore, la città, il livello di esperienza e il tipo di contratto possono fare una differenza enorme.
        </p>
        <p className="text-gray-500 mt-3 text-sm">
          In questa pagina trovi le retribuzioni medie per oltre {professions.length > 0 ? professions.length : "100"} professioni, divise per settore, con il confronto rispetto alla media nazionale.
        </p>
      </header>

      {/* Box media nazionale */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-10 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-700">{NATIONAL_AVG.toLocaleString()} €</p>
          <p className="text-xs text-gray-500 mt-1">netti/mese (media)</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-700">{NATIONAL_AVG_YEARLY.toLocaleString()} €</p>
          <p className="text-xs text-gray-500 mt-1">lordi/anno (media)</p>
        </div>
        <div className="col-span-2 sm:col-span-1 flex items-center gap-2 bg-white rounded-xl p-3 text-xs text-gray-500">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          Dati elaborati da fonti ISTAT, Eurostat e annunci di lavoro pubblicati su Click2Job.
        </div>
      </div>

      {/* Sezione editoriale: contesto */}
      <section className="mb-12 prose prose-gray max-w-none">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Il divario Nord-Sud e per settore</h2>
        <p className="text-gray-600 leading-relaxed">
          In Italia esistono forti differenze geografiche: al Nord (soprattutto a <strong>Milano</strong> e dintorni) gli stipendi possono essere superiori del 20–30% rispetto alla media, mentre al Sud si scende spesso sotto i 1.200 € netti mensili. Anche il settore conta moltissimo: chi lavora in <strong>finanza, tecnologia o farmaceutica</strong> guadagna in media il doppio rispetto a chi opera nella <strong>ristorazione o nel commercio al dettaglio</strong>.
        </p>
        <p className="text-gray-600 leading-relaxed mt-3">
          Un altro fattore decisivo è il tipo di contratto: i lavoratori con contratto a <strong>tempo indeterminato</strong> guadagnano mediamente il 15–25% in più rispetto a chi ha un contratto a tempo determinato o in somministrazione.
        </p>
      </section>

      {/* Professions più pagate */}
      {topProfessions.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Le professioni più pagate in Italia</h2>
          <p className="text-gray-500 text-sm mb-5">Queste sono le figure professionali con la retribuzione media mensile netta più alta, in base agli annunci pubblicati e alle fonti ufficiali.</p>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {topProfessions.map((p, i) => {
              const dev = p.salary_deviation_pct ?? Math.round(((p.avg_salary_monthly - NATIONAL_AVG) / NATIONAL_AVG) * 100);
              const isPositive = dev > 0;
              return (
                <Link
                  key={p.id}
                  to={createPageUrl("DettaglioProfessione") + "?id=" + p.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-sm font-bold text-gray-300 w-5 shrink-0">{i + 1}</span>
                  <span className="flex-1 text-gray-800 font-medium group-hover:text-emerald-700 transition-colors">{p.name}</span>
                  <span className="text-sm font-semibold text-gray-700 shrink-0">{p.avg_salary_monthly?.toLocaleString()} €/mese</span>
                  <div className="flex items-center gap-1 w-16 justify-end shrink-0">
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                    <span className={`text-xs font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                      {isPositive ? "+" : ""}{dev}%
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Sezione editoriale: come aumentare lo stipendio */}
      <section className="mb-12 bg-gray-50 rounded-2xl p-6 md:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Come aumentare il proprio stipendio?</h2>
        <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
          <p>🎓 <strong>Formazione continua:</strong> i lavoratori con certificazioni aggiornate o laurea magistrale guadagnano in media il 30% in più rispetto a chi ha solo il diploma.</p>
          <p>🏙️ <strong>Scegli la città giusta:</strong> Milano, Bologna e Torino offrono stipendi più alti rispetto alla media nazionale, soprattutto in tech, finanza e logistica.</p>
          <p>💼 <strong>Negozia il contratto:</strong> molti lavoratori italiani non negoziano mai lo stipendio. Anche un aumento del 5–10% in fase di assunzione vale migliaia di euro nel tempo.</p>
          <p>🔄 <strong>Cambia azienda:</strong> statisticamente, cambiare datore di lavoro porta un aumento medio del 15–20%, molto più del tipico adeguamento annuale.</p>
        </div>
      </section>

      {/* Ricerca */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cerca il tuo settore o professione</h2>
        <p className="text-gray-500 text-sm mb-4">Esplora le retribuzioni medie per centinaia di figure professionali.</p>
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Es. Sviluppatore, Infermiere, Marketing..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-gray-500 py-8 text-center">Nessuna professione trovata.</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([sector, profs]) => (
              <div key={sector}>
                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {sector}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {profs.map((p) => (
                    <Link
                      key={p.id}
                      to={createPageUrl("DettaglioProfessione") + "?id=" + p.id}
                      className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-sm group"
                    >
                      <span className="text-gray-700 font-medium group-hover:text-emerald-700 transition-colors">{p.name}</span>
                      {p.avg_salary_monthly && (
                        <span className="text-gray-600 font-semibold shrink-0 ml-2">
                          {p.avg_salary_monthly.toLocaleString()} €/mese
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer SEO note */}
      <footer className="border-t border-gray-100 pt-8 text-xs text-gray-400 leading-relaxed">
        <p>
          I dati sugli stipendi riportati su questa pagina sono elaborati a partire da fonti pubbliche (ISTAT, Eurostat, Ministero del Lavoro) e dagli annunci di lavoro pubblicati su Click2Job. Le retribuzioni indicate sono medie indicative e possono variare in base all'esperienza, alla zona geografica, alla dimensione aziendale e al contratto collettivo applicato. Ultimo aggiornamento: 2024.
        </p>
      </footer>
    </div>
  );
}