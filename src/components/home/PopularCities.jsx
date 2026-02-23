import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin } from "lucide-react";

const CITIES = [
  { name: "Milano", count: 1295 },
  { name: "Roma", count: 850 },
  { name: "Torino", count: 420 },
  { name: "Bologna", count: 380 },
  { name: "Napoli", count: 320 },
  { name: "Firenze", count: 290 },
  { name: "Genova", count: 250 },
  { name: "Padova", count: 230 },
  { name: "Verona", count: 210 },
  { name: "Brescia", count: 190 },
  { name: "Bergamo", count: 180 },
  { name: "Bari", count: 170 },
  { name: "Catania", count: 150 },
  { name: "Palermo", count: 140 },
  { name: "Venezia", count: 130 },
  { name: "Parma", count: 120 },
  { name: "Modena", count: 115 },
  { name: "Perugia", count: 100 },
  { name: "Ravenna", count: 90 },
  { name: "Rimini", count: 85 },
];

export default function PopularCities() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Annunci di lavoro per città</h2>
        <p className="text-gray-500 mt-1 text-sm">Cerca le offerte nella tua città</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {CITIES.map((city) => (
          <Link
            key={city.name}
            to={createPageUrl("RisultatiRicerca") + "?loc=" + encodeURIComponent(city.name)}
            className="group flex items-center justify-between px-4 py-3.5 rounded-xl bg-white border border-gray-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-700 transition-colors">{city.name}</span>
            </div>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
              {city.count.toLocaleString()}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}