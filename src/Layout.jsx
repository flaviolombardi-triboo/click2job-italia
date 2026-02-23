import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, MapPin, Menu, X, Briefcase, TrendingUp, BookOpen, Building2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { label: "Offerte di Lavoro", page: "Home", icon: Briefcase },
  { label: "Stipendi", page: "Stipendi", icon: TrendingUp },
  { label: "Elenco Professioni", page: "ElencoProfessioni", icon: BookOpen },
  { label: "Cerca per Città", page: "CercaPerCitta", icon: MapPin },
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const isHome = currentPageName === "Home";

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (location) params.set("loc", location);
    window.location.href = createPageUrl("RisultatiRicerca") + (params.toString() ? "?" + params.toString() : "");
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-xl bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl("Home")} className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                <span className="text-gray-900">Click</span>
                <span className="text-emerald-600">2</span>
                <span className="text-gray-900">Job</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPageName === item.page
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="hidden lg:flex items-center gap-3">
              <Link to={createPageUrl("PubblicaOfferta")}>
                <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Building2 className="w-4 h-4 mr-2" />
                  Area Aziende
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    currentPageName === item.page
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              <Link
                to={createPageUrl("PubblicaOfferta")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Building2 className="w-4 h-4" />
                Area Aziende
              </Link>
            </div>
          </div>
        )}

        {/* Search Bar (non-home pages) */}
        {!isHome && currentPageName !== "PubblicaOfferta" && currentPageName !== "GestisciFeed" && (
          <div className="border-t border-gray-100 bg-gradient-to-r from-emerald-600 to-emerald-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Professione, settore..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Città, provincia o regione"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-8"
                >
                  Cerca
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Click2Job</span>
              </div>
              <p className="text-sm leading-relaxed">
                Il motore di ricerca lavoro in Italia. Trova migliaia di offerte di lavoro aggiornate ogni giorno.
              </p>
            </div>

            {/* Per i candidati */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Per i Candidati</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to={createPageUrl("Home")} className="hover:text-white transition-colors">Offerte di Lavoro</Link></li>
                <li><Link to={createPageUrl("Stipendi")} className="hover:text-white transition-colors">Stipendi</Link></li>
                <li><Link to={createPageUrl("ElencoProfessioni")} className="hover:text-white transition-colors">Elenco Professioni</Link></li>
                <li><Link to={createPageUrl("CercaPerCitta")} className="hover:text-white transition-colors">Lavoro per Città</Link></li>
              </ul>
            </div>

            {/* Per le aziende */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Per le Aziende</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to={createPageUrl("PubblicaOfferta")} className="hover:text-white transition-colors">Pubblica Offerte</Link></li>
                <li><Link to={createPageUrl("PubblicaOfferta")} className="hover:text-white transition-colors">Piani e Prezzi</Link></li>
              </ul>
            </div>

            {/* Città popolari */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Città Popolari</h4>
              <ul className="space-y-2.5 text-sm">
                {["Milano", "Roma", "Torino", "Bologna", "Napoli", "Firenze"].map((city) => (
                  <li key={city}>
                    <Link
                      to={createPageUrl("RisultatiRicerca") + "?loc=" + city}
                      className="hover:text-white transition-colors"
                    >
                      Lavoro a {city}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs">© {new Date().getFullYear()} Click2Job. Tutti i diritti riservati.</p>
            <div className="flex gap-6 text-xs">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
              <a href="#" className="hover:text-white transition-colors">Termini di Servizio</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}