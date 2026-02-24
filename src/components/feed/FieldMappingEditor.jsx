import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, Play, RefreshCw, ChevronDown, ChevronUp, Loader2, Info
} from "lucide-react";
import { toast } from "sonner";

const TARGET_FIELDS = [
  { value: "title", label: "Titolo annuncio" },
  { value: "company", label: "Azienda" },
  { value: "location", label: "Città/Luogo" },
  { value: "region", label: "Regione" },
  { value: "category", label: "Categoria" },
  { value: "description", label: "Descrizione" },
  { value: "requirements", label: "Requisiti" },
  { value: "apply_url", label: "URL candidatura" },
  { value: "contract_type", label: "Tipo contratto" },
  { value: "work_schedule", label: "Orario lavoro" },
  { value: "salary_min", label: "Stipendio min" },
  { value: "salary_max", label: "Stipendio max" },
  { value: "external_id", label: "ID esterno" },
];

function RuleRow({ rule, index, feedFields, onChange, onRemove }) {
  const [showTransform, setShowTransform] = useState(false);

  const updateRule = (patch) => onChange(index, { ...rule, ...patch });

  const addReplace = () => {
    const replaces = [...(rule.replace || []), { from: "", to: "" }];
    updateRule({ replace: replaces });
  };

  const updateReplace = (i, patch) => {
    const replaces = (rule.replace || []).map((r, ri) => ri === i ? { ...r, ...patch } : r);
    updateRule({ replace: replaces });
  };

  const removeReplace = (i) => {
    const replaces = (rule.replace || []).filter((_, ri) => ri !== i);
    updateRule({ replace: replaces });
  };

  // Source can be multiple fields (array)
  const sourceValue = Array.isArray(rule.source) ? rule.source.join(", ") : (rule.source || "");
  const handleSourceChange = (val) => {
    const parts = val.split(",").map(s => s.trim()).filter(Boolean);
    updateRule({ source: parts.length === 1 ? parts[0] : parts });
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Target */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-xs text-gray-500 mb-1 block">Campo destinazione</Label>
          <Select value={rule.target || ""} onValueChange={(v) => updateRule({ target: v })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Scegli campo..." />
            </SelectTrigger>
            <SelectContent>
              {TARGET_FIELDS.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source */}
        <div className="flex-1 min-w-[160px]">
          <Label className="text-xs text-gray-500 mb-1 block">
            Campo sorgente XML{" "}
            <span className="text-gray-400">(separa con virgola per unire più campi)</span>
          </Label>
          {feedFields && feedFields.length > 0 ? (
            <Select value={typeof rule.source === "string" ? rule.source : ""} onValueChange={(v) => updateRule({ source: v })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Scegli campo..." />
              </SelectTrigger>
              <SelectContent>
                {feedFields.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="h-8 text-sm"
              value={sourceValue}
              onChange={(e) => handleSourceChange(e.target.value)}
              placeholder="es. jobtitle, oppure city, state"
            />
          )}
        </div>

        {/* Static value override */}
        <div className="flex-1 min-w-[120px]">
          <Label className="text-xs text-gray-500 mb-1 block">Valore fisso (opz.)</Label>
          <Input
            className="h-8 text-sm"
            value={rule.static || ""}
            onChange={(e) => updateRule({ static: e.target.value || undefined })}
            placeholder="Es. tempo_indeterminato"
          />
        </div>

        {/* Expand transforms */}
        <div className="flex items-end gap-2 pb-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-gray-500"
            onClick={() => setShowTransform(!showTransform)}
          >
            {showTransform ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            Trasformazioni
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => onRemove(index)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Transformations */}
      {showTransform && (
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Separatore unione</Label>
              <Input className="h-8 text-sm" value={rule.join ?? ""} onChange={(e) => updateRule({ join: e.target.value })} placeholder='Es. " - "' />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Prefisso</Label>
              <Input className="h-8 text-sm" value={rule.prefix || ""} onChange={(e) => updateRule({ prefix: e.target.value || undefined })} placeholder="Es. Offerta: " />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Suffisso</Label>
              <Input className="h-8 text-sm" value={rule.suffix || ""} onChange={(e) => updateRule({ suffix: e.target.value || undefined })} placeholder="Es.  (Italia)" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Tronca a N caratteri</Label>
              <Input className="h-8 text-sm" type="number" value={rule.truncate || ""} onChange={(e) => updateRule({ truncate: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="Es. 500" />
            </div>
          </div>

          {/* Replace rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-gray-500">Sostituzioni (cerca → rimpiazza)</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-emerald-600" onClick={addReplace}>
                <Plus className="w-3 h-3 mr-1" /> Aggiungi
              </Button>
            </div>
            {(rule.replace || []).map((rep, ri) => (
              <div key={ri} className="flex items-center gap-2 mb-2">
                <Input className="h-7 text-xs" value={rep.from} onChange={(e) => updateReplace(ri, { from: e.target.value })} placeholder="Cerca..." />
                <span className="text-gray-400 text-xs">→</span>
                <Input className="h-7 text-xs" value={rep.to} onChange={(e) => updateReplace(ri, { to: e.target.value })} placeholder="Rimpiazza con..." />
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => removeReplace(ri)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FieldMappingEditor({ feed, onSave }) {
  const [rules, setRules] = useState(() => {
    try { return JSON.parse(feed.field_mapping || "[]"); } catch { return []; }
  });
  const [jobTag, setJobTag] = useState(feed.job_tag || "job");
  const [feedFields, setFeedFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [sampleJobs, setSampleJobs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showSample, setShowSample] = useState(false);

  const inspectFeed = async () => {
    setLoadingFields(true);
    setSampleJobs([]);
    try {
      const res = await base44.functions.invoke("inspectFeedFields", { feed_id: feed.id });
      const data = res.data;
      if (data.error) throw new Error(data.error);
      setFeedFields(data.field_names || []);
      setSampleJobs(data.sample_jobs || []);
      setJobTag(data.job_tag || "job");
      toast.success(`Trovati ${data.field_names?.length || 0} campi nel feed`);
      setShowSample(true);
    } catch (e) {
      toast.error("Errore ispezione feed: " + e.message);
    } finally {
      setLoadingFields(false);
    }
  };

  const addRule = () => setRules([...rules, { target: "", source: "", replace: [] }]);

  const updateRule = (i, rule) => setRules(rules.map((r, ri) => ri === i ? rule : r));

  const removeRule = (i) => setRules(rules.filter((_, ri) => ri !== i));

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanRules = rules
        .filter(r => r.target && (r.source || r.static !== undefined))
        .map(r => {
          const clean = { target: r.target };
          if (r.static !== undefined && r.static !== "") clean.static = r.static;
          else {
            clean.source = r.source;
            if (r.join !== undefined && r.join !== "") clean.join = r.join;
            if (r.prefix) clean.prefix = r.prefix;
            if (r.suffix) clean.suffix = r.suffix;
            if (r.truncate) clean.truncate = r.truncate;
            if (r.replace && r.replace.length > 0) clean.replace = r.replace.filter(rep => rep.from);
          }
          return clean;
        });

      await base44.entities.XMLFeed.update(feed.id, {
        field_mapping: JSON.stringify(cleanRules),
        job_tag: jobTag,
      });
      toast.success("Mappatura salvata");
      if (onSave) onSave();
    } catch (e) {
      toast.error("Errore salvataggio: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Job tag & inspect */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Tag XML dell'annuncio</Label>
          <Input
            className="h-8 text-sm w-32"
            value={jobTag}
            onChange={(e) => setJobTag(e.target.value)}
            placeholder="job"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={inspectFeed} disabled={loadingFields}>
          {loadingFields ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Play className="w-3 h-3 mr-1.5" />}
          Ispeziona Feed
        </Button>
        {feedFields.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {feedFields.map(f => (
              <Badge key={f} variant="outline" className="text-xs font-mono">{f}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Sample data */}
      {showSample && sampleJobs.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <Info className="w-3 h-3" /> Campione dati (primo annuncio del feed)
            </p>
            <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowSample(false)}>Nascondi</Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(sampleJobs[0] || {}).map(([k, v]) => (
              <div key={k} className="bg-white rounded-lg p-2 border border-gray-100">
                <p className="text-xs font-mono font-semibold text-emerald-700">{k}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules */}
      <div className="space-y-3">
        {rules.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
            Nessuna regola di mappatura. Usa "Ispeziona Feed" per scoprire i campi disponibili, poi aggiungi le regole.
          </div>
        )}
        {rules.map((rule, i) => (
          <RuleRow
            key={i}
            rule={rule}
            index={i}
            feedFields={feedFields}
            onChange={updateRule}
            onRemove={removeRule}
          />
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={addRule}>
          <Plus className="w-4 h-4 mr-1.5" /> Aggiungi Regola
        </Button>
        <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1.5" />}
          Salva Mappatura
        </Button>
      </div>
    </div>
  );
}