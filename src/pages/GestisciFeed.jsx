import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Rss, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle, Pause, Loader2, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import moment from "moment";
import { toast } from "sonner";

export default function GestisciFeed() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFeed, setNewFeed] = useState({ name: "", url: "", notes: "" });
  const [importingFeedId, setImportingFeedId] = useState(null);
  const queryClient = useQueryClient();

  const { data: feeds, isLoading } = useQuery({
    queryKey: ["xml-feeds"],
    queryFn: () => base44.entities.XMLFeed.list("-created_date", 100),
    initialData: [],
  });

  const createFeedMutation = useMutation({
    mutationFn: (data) => base44.entities.XMLFeed.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["xml-feeds"] });
      setShowAddForm(false);
      setNewFeed({ name: "", url: "", notes: "" });
      toast.success("Feed aggiunto con successo");
    },
  });

  const deleteFeedMutation = useMutation({
    mutationFn: (id) => base44.entities.XMLFeed.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["xml-feeds"] });
      toast.success("Feed eliminato");
    },
  });

  const importFeedMutation = useMutation({
    mutationFn: async (feed) => {
      setImportingFeedId(feed.id);
      const response = await base44.functions.invoke("importFeeds", { feed_id: feed.id });
      return response.data;
    },
    onSuccess: (data) => {
      setImportingFeedId(null);
      queryClient.invalidateQueries({ queryKey: ["xml-feeds"] });
      queryClient.invalidateQueries({ queryKey: ["latest-jobs"] });
      const r = data?.results?.[0];
      if (r?.error) {
        toast.error(`Errore: ${r.error}`);
      } else {
        toast.success(`Importati ${r?.imported ?? data?.total_imported ?? 0} annunci (${r?.skipped ?? 0} già presenti)`);
      }
    },
    onError: (error) => {
      setImportingFeedId(null);
      toast.error("Errore durante l'importazione: " + error.message);
    },
  });

  const handleAddFeed = (e) => {
    e.preventDefault();
    createFeedMutation.mutate({ ...newFeed, status: "active" });
  };

  const statusConfig = {
    active: { icon: CheckCircle, color: "bg-emerald-50 text-emerald-700", label: "Attivo" },
    paused: { icon: Pause, color: "bg-yellow-50 text-yellow-700", label: "In Pausa" },
    error: { icon: AlertCircle, color: "bg-red-50 text-red-700", label: "Errore" },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Feed XML</h1>
          <p className="text-gray-500 text-sm mt-1">
            Importa offerte di lavoro da feed XML esterni in modo automatico o manuale.
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi Feed
        </Button>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 mb-8">
        <h2 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Come funziona
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <div>
              <p className="font-medium text-emerald-900">Aggiungi un feed</p>
              <p className="text-emerald-700 text-xs mt-0.5">Inserisci il nome e l'URL del feed XML (supporta anche file .gz compressi)</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <div>
              <p className="font-medium text-emerald-900">Clicca "Avvia Import"</p>
              <p className="text-emerald-700 text-xs mt-0.5">L'AI analizza il formato XML e importa tutti gli annunci automaticamente</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <div>
              <p className="font-medium text-emerald-900">Aggiornamento ogni 4 ore</p>
              <p className="text-emerald-700 text-xs mt-0.5">Il sistema importa automaticamente i nuovi annunci, senza duplicati</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Feed Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Nuovo Feed XML</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddFeed} className="space-y-4 mt-4">
            <div>
              <Label>Nome Feed / Cliente</Label>
              <Input
                value={newFeed.name}
                onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
                placeholder="Es. Adecco, Manpower..."
                required
              />
            </div>
            <div>
              <Label>URL Feed XML</Label>
              <Input
                value={newFeed.url}
                onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
                placeholder="https://esempio.com/feed.xml"
                required
              />
            </div>
            <div>
              <Label>Note</Label>
              <Textarea
                value={newFeed.notes}
                onChange={(e) => setNewFeed({ ...newFeed, notes: e.target.value })}
                placeholder="Note opzionali..."
                rows={2}
              />
            </div>
            <Button type="submit" disabled={createFeedMutation.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {createFeedMutation.isPending ? "Salvataggio..." : "Salva Feed"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Feeds List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : feeds.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Rss className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Nessun feed configurato</h3>
          <p className="text-gray-500 text-sm mt-1">Aggiungi un feed XML per iniziare a importare offerte di lavoro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feeds.map((feed) => {
            const status = statusConfig[feed.status || "active"];
            const StatusIcon = status.icon;
            const isImporting = importingFeedId === feed.id;
            return (
              <div
                key={feed.id}
                className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <Rss className="w-5 h-5 text-emerald-600 shrink-0" />
                      <h3 className="font-semibold text-gray-900">{feed.name}</h3>
                      <Badge className={`${status.color} border-0 text-xs`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 truncate">{feed.url}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                      {feed.last_import_date && (
                        <span>Ultimo import: {moment(feed.last_import_date).fromNow()}</span>
                      )}
                      <span>{feed.total_jobs_imported || 0} annunci importati</span>
                    </div>
                    {feed.notes && (
                      <p className="text-xs text-gray-400 mt-1">{feed.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      disabled={isImporting}
                      onClick={() => importFeedMutation.mutate(feed)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      {isImporting ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-1.5" />
                      )}
                      {isImporting ? "Importazione in corso..." : "Avvia Import"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFeedMutation.mutate(feed.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info box */}
      <div className="mt-10 bg-blue-50 rounded-2xl p-6 border border-blue-100">
        <h3 className="font-semibold text-blue-900 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Come funziona
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-blue-800">
          <li>1. Aggiungi l'URL del feed XML del tuo cliente</li>
          <li>2. Clicca "Importa" per analizzare il feed e creare automaticamente gli annunci</li>
          <li>3. Le offerte verranno pubblicate e saranno subito visibili ai candidati</li>
          <li>4. Puoi re-importare in qualsiasi momento per aggiornare gli annunci</li>
        </ul>
      </div>
    </div>
  );
}