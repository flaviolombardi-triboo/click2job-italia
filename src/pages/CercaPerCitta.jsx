import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";

const REGIONS = {
  "Nord Ovest": [
    { name: "Milano", region: "Lombardia" },
    { name: "Torino", region: "Piemonte" },
    { name: "Genova", region: "Liguria" },
    { name: "Bergamo", region: "Lombardia" },
    { name: "Brescia", region: "Lombardia" },
    { name: "Monza", region: "Lombardia" },
    { name: "Como", region: "Lombardia" },
    { name: "Varese", region: "Lombardia" },
    { name: "Novara", region: "Piemonte" },
    { name: "Alessandria", region: "Piemonte" },
  ],
  "Nord Est": [
    { name: "Bologna", region: "Emilia-Romagna" },
    { name: "Padova", region: "Veneto" },
    { name: "Verona", region: "Veneto" },
    { name: "Venezia", region: "Veneto" },
    { name: "Modena", region: "Emilia-Romagna" },
    { name: "Parma", region: "Emilia-Romagna" },
    { name: "Ravenna", region: "Emilia-Romagna" },
    { name: "Rimini", region: "Emilia-Romagna" },
    { name: "Trieste", region: "Friuli Venezia Giulia" },
    { name: "Trento", region: "Trentino-Alto Adige" },
    { name: "Vicenza", region: "Veneto" },
    { name: "Treviso", region: "Veneto" },
  ],
  "Centro": [
    { name: "Roma", region: "Lazio" },
    { name: "Firenze", region: "Toscana" },
    { name: "Perugia", region: "Umbria" },
    { name: "Ancona", region: "Marche" },
    { name: "Pisa", region: "Toscana" },
    { name: "Livorno", region: "Toscana" },
    { name: "Siena", region: "Toscana" },
    { name: "Latina", region: "Lazio" },
    { name: "Viterbo", region: "Lazio" },
    { name: "Pesaro", region: "Marche" },
  ],
  "Sud e Isole": [
    { name: "Napoli", region: "Campania" },
    { name: "Bari", region: "Puglia" },
    { name: "Catania", region: "Sicilia" },
    { name: "Palermo", region: "Sicilia" },
    { name: "Cagliari", region: "Sardegna" },
    { name: "Salerno", region: "Campania" },
    { name: "Taranto", region: "Puglia" },
    { name: "Lecce", region: "Puglia" },
    { name: "Messina", region: "Sicilia" },
    { name: "Reggio Calabria", region: "Calabria" },
    { name: "Cosenza", region: "Calabria" },
    { name: "Sassari", region: "Sardegna" },
  ],
};

export default function CercaPerCitta() {
  const [searchTerm, setSearchTerm] = useState("");

  const allCities = Object.values(REGIONS).flat();
  const filtered = searchTerm
    ? allCities.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.region.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-8 md:p-12 mb-10 text-white">
        <h1 className="text-3xl md:text-4xl font-extrabold">Lavoro per Città</h1>
        <p className="text-emerald-100/80 mt-3 max-w-lg">
          Cerca le offerte di lavoro nella tua città. Seleziona una località per vedere tutte le posizioni disponibili.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-10">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Cerca città o regione..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((city) => (
            <Link
              key={city.name}
              to={createPageUrl("RisultatiRicerca") + "?loc=" + encodeURIComponent(city.name)}
              className="group flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all"
            >
              <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-medium text-gray-800 group-hover:text-emerald-700 block truncate">
                  {city.name}
                </span>
                <span className="text-xs text-gray-400">{city.region}</span>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="text-gray-500 col-span-full text-center py-8">Nessuna città trovata</p>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(REGIONS).map(([area, cities]) => (
            <div key={area}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{area}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {cities.map((city) => (
                  <Link
                    key={city.name}
                    to={createPageUrl("RisultatiRicerca") + "?loc=" + encodeURIComponent(city.name)}
                    className="group flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all"
                  >
                    <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-800 group-hover:text-emerald-700 block truncate">
                        {city.name}
                      </span>
                      <span className="text-xs text-gray-400">{city.region}</span>
                    </div>
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