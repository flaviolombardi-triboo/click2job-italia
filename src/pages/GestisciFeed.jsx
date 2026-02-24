import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Rss, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle, Pause,
  Loader2, FileText, Lock, Settings, ChevronDown, ChevronUp, BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";
import { toast } from "sonner";
import FieldMappingEditor from "@/components/feed/FieldMappingEditor";
import StatsCards from "@/components/feed/StatsCards";
import ImportTrendChart from "@/components/feed/ImportTrendChart";
import FeedHistoryTable from "@/components/feed/FeedHistoryTable";
import TopFeedsBar from "@/components/feed/TopFeedsBar";

export default function GestisciFeed() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFeed, setNewFeed] = useState({ name: "", url: "", notes: "" });
  const [importingFeedId, setImportingFeedId] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [expandedMapping, setExpandedMapping] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then((u) => { setUser(u); setAuthLoading(false); }).catch(() => setAuthLoading(false));
  }, []);

  const isAdmin = user?.role === "admin";

  const { data: feeds, isLoading } = useQuery({
    queryKey: ["xml-feeds"],
    queryFn: () => base44.entities.XMLFeed.list("-created_date", 100),
    initialData: [],
    enabled: isAdmin,
  });

  const { data: pendingChunks } = useQuery({
    queryKey: ["pending-chunks"],
    queryFn: () => base44.entities.FeedChunk.filter({ status: "pending" }),
    initialData: [],
    enabled: isAdmin,
    refetchInterval: 8000,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["feed-stats"],
    queryFn: async () => (await base44.functions.invoke("getFeedStats", {})).data,
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const createFeedMutation = useMutation({
    mutationFn: (data) => base44.entities.XMLFeed.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["xml-feeds"] });
      queryClient.invalidateQueries({ queryKey: ["feed-stats"] });
      setShowAddForm(false);
      setNewFeed({ name: "", url: "", notes: "" });
      toast.success("Feed aggiunto con successo");
    },
  });

  const deleteFeedMutation = useMutation({
    mutationFn: (id) => base44.entities.XMLFeed.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["xml-feeds"] });
      queryClient.invalidateQueries({ queryKey: ["feed-stats"] });
      toast.success("Feed eliminato");
    },
  });

  const importFeedMutation = useMutation({
    mutationFn: async (feed) => {
      setImportingFeedId(feed.id);
      return (await base44.functions.invoke("downloadFeed", { feed_id: feed.id })).data;
    },
    onSuccess: (data) => {
      setImportingFeedId(null);
      queryClient.invalidateQueries({ queryKey: ["xml-feeds"] });
      queryClient.invalidateQueries({ queryKey: ["pending-chunks"] });
      queryClient.invalidateQueries({ queryKey: ["feed-stats"] });
      const r = data?.results?.[0];
      if (r?.error) toast.error(`Errore: ${r.error}`);
      else toast.success(`Feed scaricato: ${r?.total_jobs_found ?? 0} annunci trovati, ${r?.chunks_created ?? 0} chunk in elaborazione...`);
    },
    onError: (error) => { setImportingFeedId(null); toast.error("Errore durante il download: " + error.message); },
  });

  const processChunksMutation = useMutation({
    mutationFn: async () => (await base44.functions.invoke("processChunks", {})).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["xml-feeds"] });
      queryClient.invalidateQueries({ queryKey: ["pending-chunks"] });
      queryClient.invalidateQueries({ queryKey: ["feed-stats"] });
      toast.success(`Processati ${data?.processed ?? 0} chunk, importati ${data?.total_imported ?? 0} annunci. Rimanenti: ${data?.remaining_chunks ?? 0}`);
    },
    onError: (error) => toast.error("Errore elaborazione chunk: " + error.message),
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

  if (authLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
        <Lock className="w-10 h-10 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-700">Area riservata</h2>
        <p className="text-gray-500 text-sm">Questa sezione è accessibile solo agli amministratori del sito.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Feed XML</h1>
          <p className="text-gray-500 text-sm mt-1">Importa e monitora offerte di lavoro da feed XML esterni.</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" /> Aggiungi Feed
        </Button>
      </div>

      {/* Pending chunks alert */}
      {pendingChunks && pendingChunks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Elaborazione automatica in corso</p>
              <p className="text-xs text-amber-700">{pendingChunks.length} chunk in attesa — processati automaticamente ogni 5 minuti</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => processChunksMutation.mutate()} disabled={processChunksMutation.isPending}>
            {processChunksMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Processa subito
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="feeds">
        <TabsList className="mb-6">
          <TabsTrigger value="feeds" className="gap-2"><Rss className="w-4 h-4" /> Feed</TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2"><BarChart2 className="w-4 h-4" /> Dashboard</TabsTrigger>
        </TabsList>

        {/* ── TAB: FEED ── */}
        <TabsContent value="feeds">
          {isLoading ? (
            <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>
          ) : feeds.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Rss className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700">Nessun feed configurato</h3>
              <p className="text-gray-500 text-sm mt-1">Aggiungi un feed XML per iniziare a importare offerte di lavoro</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feeds.map((feed) => {
                const status = statusConfig[feed.status || "active"];
                const StatusIcon = status.icon;
                const isImporting = importingFeedId === feed.id;
                const isMappingOpen = expandedMapping === feed.id;
                let hasMapping = false;
                try { hasMapping = JSON.parse(feed.field_mapping || "[]").length > 0; } catch (_) {}

                return (
                  <div key={feed.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Rss className="w-5 h-5 text-emerald-600 shrink-0" />
                            <h3 className="font-semibold text-gray-900">{feed.name}</h3>
                            <Badge className={`${status.color} border-0 text-xs`}>
                              <StatusIcon className="w-3 h-3 mr-1" />{status.label}
                            </Badge>
                            {hasMapping && (
                              <Badge className="bg-blue-50 text-blue-700 border-0 text-xs">
                                <Settings className="w-3 h-3 mr-1" />Mappatura attiva
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1 truncate">{feed.url}</p>
                          <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                            {feed.last_import_date && <span>Ultimo import: {moment(feed.last_import_date).fromNow()}</span>}
                            <span>{(feed.total_jobs_imported || 0).toLocaleString("it-IT")} annunci importati</span>
                            {feed.job_tag && feed.job_tag !== "job" && <span>Tag: <code className="font-mono text-gray-600">&lt;{feed.job_tag}&gt;</code></span>}
                          </div>
                          {feed.notes && <p className="text-xs text-gray-400 mt-1">{feed.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => setExpandedMapping(isMappingOpen ? null : feed.id)} className="text-gray-600">
                            <Settings className="w-3.5 h-3.5 mr-1.5" />
                            Mappatura
                            {isMappingOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                          </Button>
                          <Button size="sm" disabled={isImporting} onClick={() => importFeedMutation.mutate(feed)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                            {isImporting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                            {isImporting ? "Importazione..." : "Avvia Import"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteFeedMutation.mutate(feed.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isMappingOpen && (
                      <div className="border-t border-gray-100 bg-gray-50/50 p-5">
                        <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <Settings className="w-4 h-4 text-emerald-600" />
                          Regole di mappatura campi — {feed.name}
                        </h4>
                        <FieldMappingEditor
                          feed={feed}
                          onSave={() => {
                            queryClient.invalidateQueries({ queryKey: ["xml-feeds"] });
                            setExpandedMapping(null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: DASHBOARD ── */}
        <TabsContent value="dashboard">
          {statsLoading ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => <div key={i} className="h-32 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
            </div>
          ) : !statsData ? (
            <div className="text-center py-16 text-gray-400">
              <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Nessun dato disponibile</p>
            </div>
          ) : (
            <>
              <StatsCards summary={statsData.summary} />
              <ImportTrendChart trend={statsData.trend} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <TopFeedsBar topFeeds={statsData.top_feeds} />
                {/* Recent errors */}
                {statsData.recent_errors?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" /> Errori recenti
                    </h3>
                    <div className="space-y-2">
                      {statsData.recent_errors.slice(0, 6).map((e, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <span className="text-red-400 mt-0.5">•</span>
                          <div>
                            <span className="font-medium text-gray-700">{e.feed_name}</span>
                            <span className="text-xs text-gray-400 ml-2">{moment(e.date).fromNow()}</span>
                            <p className="text-xs text-red-500 mt-0.5 truncate max-w-xs">{e.error}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <FeedHistoryTable feeds={feeds} feedHistory={statsData.feed_history} />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Feed Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aggiungi Nuovo Feed XML</DialogTitle></DialogHeader>
          <form onSubmit={handleAddFeed} className="space-y-4 mt-4">
            <div>
              <Label>Nome Feed / Cliente</Label>
              <Input value={newFeed.name} onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })} placeholder="Es. Adecco, Manpower..." required />
            </div>
            <div>
              <Label>URL Feed XML</Label>
              <Input value={newFeed.url} onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })} placeholder="https://esempio.com/feed.xml" required />
            </div>
            <div>
              <Label>Note</Label>
              <Textarea value={newFeed.notes} onChange={(e) => setNewFeed({ ...newFeed, notes: e.target.value })} placeholder="Note opzionali..." rows={2} />
            </div>
            <Button type="submit" disabled={createFeedMutation.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {createFeedMutation.isPending ? "Salvataggio..." : "Salva Feed"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}