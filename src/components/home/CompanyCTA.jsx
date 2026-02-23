import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Users, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CompanyCTA() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 md:p-14">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[120px] opacity-20" />
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium mb-4">
              <Building2 className="w-3.5 h-3.5" />
              Per le Aziende
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Stai cercando personale?
            </h2>
            <p className="text-gray-400 max-w-lg leading-relaxed">
              Pubblica le tue offerte di lavoro su Click2Job in pochi minuti e ricevi CV da candidati qualificati. 
              Raggiungi migliaia di candidati interessati alla tua offerta.
            </p>
            <div className="flex items-center gap-6 mt-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                Veloce e semplice
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Candidati qualificati
              </div>
            </div>
          </div>
          <Link to={createPageUrl("PubblicaOfferta")}>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-6 h-auto rounded-xl text-base shadow-xl shadow-emerald-900/40 shrink-0">
              Pubblica Offerta
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}