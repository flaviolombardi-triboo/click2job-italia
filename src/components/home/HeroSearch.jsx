import React, { useState } from "react";
import { Search, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function HeroSearch() {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (location) params.set("loc", location);
    window.location.href = createPageUrl("RisultatiRicerca") + (params.toString() ? "?" + params.toString() : "");
  };

  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #4fa862 0%, #5aac6b 60%, #3d9152 100%)" }}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-emerald-300 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c6b730db78c556829abda/a4c3e9cc7_C2J-colore-orizz.png"
              alt="Click2Job"
              className="h-14 w-auto brightness-0 invert"
            />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Trova le offerte di lavoro
            <br />
            <span style={{ color: "#d4f0da" }}>pubblicate in tutta Italia</span>
          </h1>
          <p className="mt-5 text-lg md:text-xl text-emerald-100/90 max-w-2xl mx-auto font-light">
            Migliaia di offerte di lavoro in tutta Italia, aggiornate ogni giorno
          </p>
        </div>

        {/* Search Card */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl shadow-emerald-900/20 p-3">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Professione, settore, azienda..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-gray-50 text-sm md:text-base"
                />
              </div>
              <div className="relative flex-1">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Città, provincia o regione"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-gray-50 text-sm md:text-base"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="text-white font-semibold px-8 py-4 h-auto rounded-xl text-base shadow-lg"
              style={{ backgroundColor: "#3d9152" }}
              >
                <Search className="w-5 h-5 mr-2" />
                Cerca
              </Button>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex justify-center gap-8 md:gap-16 mt-10 text-emerald-100/80">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">10.000+</p>
            <p className="text-sm mt-1">Offerte attive</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">500+</p>
            <p className="text-sm mt-1">Aziende</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">20+</p>
            <p className="text-sm mt-1">Città</p>
          </div>
        </div>
      </div>
    </section>
  );
}