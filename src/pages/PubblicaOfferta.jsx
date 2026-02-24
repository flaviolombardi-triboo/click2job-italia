import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Zap, Users, Shield, CheckCircle, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ADMIN_EMAIL = "info@click2job.it";

export default function PubblicaOfferta() {
  const [form, setForm] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    company: "",
    location: "",
    title: "",
    contract_type: "",
    description: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const body = `
Nuova richiesta di pubblicazione offerta di lavoro da Click2Job.

--- DATI DI CONTATTO ---
Nome: ${form.contact_name}
Email: ${form.contact_email}
Telefono: ${form.contact_phone || "Non fornito"}

--- DETTAGLI OFFERTA ---
Azienda: ${form.company}
Posizione: ${form.title}
Sede: ${form.location || "Non specificata"}
Tipo contratto: ${form.contract_type || "Non specificato"}

Descrizione offerta:
${form.description}

Note aggiuntive:
${form.notes || "Nessuna"}
    `.trim();

    await base44.integrations.Core.SendEmail({
      to: ADMIN_EMAIL,
      subject: `[Click2Job] Richiesta pubblicazione: ${form.title} - ${form.company}`,
      body,
    });

    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "#e8f5ec" }}>
          <CheckCircle className="w-10 h-10" style={{ color: "#5aac6b" }} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Richiesta inviata!</h1>
        <p className="text-gray-500 mb-2">
          Abbiamo ricevuto la tua richiesta. Il nostro team ti contatterà entro 24 ore per completare la pubblicazione dell'offerta.
        </p>
        <p className="text-gray-400 text-sm mb-8">Controlla la tua casella email: <strong>{form.contact_email}</strong></p>
        <Button onClick={() => { setSubmitted(false); setForm({ contact_name: "", contact_email: "", contact_phone: "", company: "", location: "", title: "", contract_type: "", description: "", notes: "" }); }}
          className="text-white font-semibold" style={{ backgroundColor: "#5aac6b" }}>
          Invia un'altra richiesta
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 mb-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[120px] opacity-20" style={{ backgroundColor: "#5aac6b" }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 border" style={{ backgroundColor: "rgba(90,172,107,0.1)", borderColor: "rgba(90,172,107,0.25)", color: "#7dd491" }}>
            <Building2 className="w-3.5 h-3.5" />
            Per le Aziende
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold">Posta un'offerta di lavoro</h1>
          <p className="text-gray-400 mt-3 max-w-lg">
            Vuoi trovare il candidato giusto? Compila il form: il nostro team pubblicherà la tua offerta su Click2Job e ti contatterà per i dettagli.
          </p>
          <div className="flex flex-wrap items-center gap-6 mt-6 text-sm text-gray-400">
            <span className="flex items-center gap-2"><Zap className="w-4 h-4" style={{ color: "#7dd491" }} />Risposta entro 24h</span>
            <span className="flex items-center gap-2"><Users className="w-4 h-4" style={{ color: "#7dd491" }} />Candidati qualificati</span>
            <span className="flex items-center gap-2"><Shield className="w-4 h-4" style={{ color: "#7dd491" }} />Nessun obbligo</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6">

          {/* Contatto */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" style={{ color: "#5aac6b" }} />
              I tuoi dati di contatto
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome e Cognome *</Label>
                <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Mario Rossi" required />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="mario@azienda.it" required />
              </div>
              <div className="md:col-span-2">
                <Label>Telefono</Label>
                <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+39 02 1234567" />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Offerta */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" style={{ color: "#5aac6b" }} />
              Dettagli dell'offerta
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Azienda *</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Nome azienda" required />
              </div>
              <div>
                <Label>Posizione ricercata *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Es. Programmatore Java Senior" required />
              </div>
              <div>
                <Label>Sede di lavoro</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Es. Milano" />
              </div>
              <div>
                <Label>Tipo di contratto</Label>
                <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tempo Indeterminato">Tempo Indeterminato</SelectItem>
                    <SelectItem value="Tempo Determinato">Tempo Determinato</SelectItem>
                    <SelectItem value="Apprendistato">Apprendistato</SelectItem>
                    <SelectItem value="Stage/Tirocinio">Stage/Tirocinio</SelectItem>
                    <SelectItem value="Partita IVA">Partita IVA</SelectItem>
                    <SelectItem value="Collaborazione">Collaborazione</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Descrizione dell'offerta *</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrivi il ruolo, i requisiti e cosa offrite..." rows={6} required />
              </div>
              <div className="md:col-span-2">
                <Label>Note aggiuntive</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informazioni extra, budget disponibile, tempistiche..." rows={3} />
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Inviando questa richiesta, il nostro team ti contatterà entro 24 ore per concordare i dettagli e la pubblicazione dell'offerta.
          </p>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-6 h-auto text-base font-semibold text-white"
            style={{ backgroundColor: "#5aac6b" }}
          >
            {loading ? "Invio in corso..." : "Invia richiesta di pubblicazione"}
            {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
          </Button>
        </form>
      </div>
    </div>
  );
}