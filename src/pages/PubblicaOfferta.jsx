import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Zap, Users, Shield, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function PubblicaOfferta() {
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    category: "",
    contract_type: "",
    work_schedule: "full_time",
    salary_min: "",
    salary_max: "",
    description: "",
    requirements: "",
    benefits: "",
    apply_url: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.JobOffer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["latest-jobs"] });
      setSubmitted(true);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      salary_min: form.salary_min ? Number(form.salary_min) : undefined,
      salary_max: form.salary_max ? Number(form.salary_max) : undefined,
      is_active: true,
      source: "manuale",
    };
    mutation.mutate(data);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Offerta Pubblicata!</h1>
        <p className="text-gray-500 mb-8">La tua offerta di lavoro è stata pubblicata con successo e sarà visibile ai candidati.</p>
        <Button onClick={() => setSubmitted(false)} className="bg-emerald-600 hover:bg-emerald-700">
          Pubblica un'altra offerta
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 mb-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[120px] opacity-20" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium mb-4">
            <Building2 className="w-3.5 h-3.5" />
            Per le Aziende
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold">Pubblica la tua Offerta di Lavoro</h1>
          <p className="text-gray-400 mt-3 max-w-lg">
            Raggiungi migliaia di candidati qualificati in tutta Italia. Pubblica la tua offerta in pochi minuti.
          </p>
          <div className="flex flex-wrap items-center gap-6 mt-6 text-sm text-gray-400">
            <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-400" />Pubblicazione immediata</span>
            <span className="flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400" />Candidati qualificati</span>
            <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400" />Gestione semplice</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Dettagli dell'Offerta</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Titolo Posizione *</Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Es. Programmatore Java Senior" required />
            </div>
            <div>
              <Label>Azienda *</Label>
              <Input value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} placeholder="Nome azienda" required />
            </div>
            <div>
              <Label>Località</Label>
              <Input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="Es. Milano" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} placeholder="Es. Informatica" />
            </div>
            <div>
              <Label>Tipo Contratto</Label>
              <Select value={form.contract_type} onValueChange={(v) => setForm({...form, contract_type: v})}>
                <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tempo_indeterminato">Tempo Indeterminato</SelectItem>
                  <SelectItem value="tempo_determinato">Tempo Determinato</SelectItem>
                  <SelectItem value="apprendistato">Apprendistato</SelectItem>
                  <SelectItem value="stage">Stage/Tirocinio</SelectItem>
                  <SelectItem value="partita_iva">Partita IVA</SelectItem>
                  <SelectItem value="collaborazione">Collaborazione</SelectItem>
                  <SelectItem value="somministrazione">Somministrazione</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Orario</Label>
              <Select value={form.work_schedule} onValueChange={(v) => setForm({...form, work_schedule: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>RAL Minima (€/anno)</Label>
              <Input type="number" value={form.salary_min} onChange={(e) => setForm({...form, salary_min: e.target.value})} placeholder="Es. 25000" />
            </div>
            <div>
              <Label>RAL Massima (€/anno)</Label>
              <Input type="number" value={form.salary_max} onChange={(e) => setForm({...form, salary_max: e.target.value})} placeholder="Es. 35000" />
            </div>
          </div>

          <div>
            <Label>Descrizione</Label>
            <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Descrivi la posizione..." rows={5} />
          </div>
          <div>
            <Label>Requisiti</Label>
            <Textarea value={form.requirements} onChange={(e) => setForm({...form, requirements: e.target.value})} placeholder="Requisiti richiesti..." rows={3} />
          </div>
          <div>
            <Label>Benefit</Label>
            <Textarea value={form.benefits} onChange={(e) => setForm({...form, benefits: e.target.value})} placeholder="Benefit offerti..." rows={3} />
          </div>
          <div>
            <Label>URL per Candidarsi</Label>
            <Input value={form.apply_url} onChange={(e) => setForm({...form, apply_url: e.target.value})} placeholder="https://..." />
          </div>

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 w-full py-6 h-auto text-base font-semibold"
          >
            {mutation.isPending ? "Pubblicazione in corso..." : "Pubblica Offerta"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </form>
      </div>
    </div>
  );
}