import React, { useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Upload, CheckCircle2, X, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type ImportSummary = Record<string, number | string | null | undefined>;

type ImportChanges = {
  new_tas?: string[];
  updated_tas?: string[];
  new_professors?: string[];
  new_courses?: string[];
  updated_courses?: string[];
  notes?: string[];
};

type ImportResult = {
  ok: boolean;
  summary?: ImportSummary;
  changes?: ImportChanges;
};

function prettyKey(k: string) {
  return k
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3 flex items-center justify-between">
      <div className="text-sm text-neutral-600">{label}</div>
      <div className="text-sm font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function ListPanel({
  title,
  items,
  accent = "blue",
  search,
  onSearch,
}: {
  title: string;
  items: string[];
  accent?: "blue" | "green" | "amber" | "red";
  search: string;
  onSearch: (v: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => x.toLowerCase().includes(q));
  }, [items, search]);

  const accentStyles =
    accent === "green"
      ? "border-green-200 bg-green-50 text-green-700"
      : accent === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : accent === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className="rounded-2xl border bg-white overflow-hidden flex flex-col h-80">
      <div className="px-4 py-3 border-b bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-neutral-900">{title}</div>
          <span className={`text-xs font-medium px-2 py-1 rounded-md border ${accentStyles}`}>
            {items.length}
          </span>
        </div>

        <div className="mt-3 relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <div className="p-4 flex-1 min-h-0 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-sm text-neutral-500">No items.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filtered.map((x) => (
              <Badge key={x} variant="outline" className="bg-white">
                {x}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ExcelImportCard() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

  const [open, setOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // searches per panel
  const [qCourses, setQCourses] = useState("");
  const [qProfs, setQProfs] = useState("");
  const [qTAs, setQTAs] = useState("");
  const [qUpdated, setQUpdated] = useState("");

  const onPick = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Please select a .xlsx file");
      e.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/import/excel", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Import failed");

      toast.success("Import completed");

      setImportResult(data);
      setOpen(true);

      // reset searches each time
      setQCourses("");
      setQProfs("");
      setQTAs("");
      setQUpdated("");

      console.log("Import result:", data);
    } catch (err: any) {
      toast.error(err?.message || "Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const summaryEntries = useMemo(() => {
    const s = importResult?.summary || {};
    return Object.entries(s).filter(([, v]) => v !== null && v !== undefined && v !== "");
  }, [importResult]);

  const changes = importResult?.changes || {};
  const newCourses = changes.new_courses || [];
  const newProfs = changes.new_professors || [];
  const newTAs = changes.new_tas || [];
  const updatedTAs = changes.updated_tas || [];
  const updatedCourses = changes.updated_courses || [];
  const notes = changes.notes || [];

  const hasDetailedChanges =
    newCourses.length ||
    newProfs.length ||
    newTAs.length ||
    updatedTAs.length ||
    updatedCourses.length ||
    notes.length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Import Excel</CardTitle>
          <CardDescription>
            Upload TA Needs Planning + COMP TA List to create courses, professors, TAs, and preferences.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex items-center justify-between gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={onFileChange}
          />

          <Button onClick={onPick} disabled={importing} className="gap-2">
            <Upload className="w-4 h-4" />
            {importing ? "Importing..." : "Import .xlsx"}
          </Button>

          <div className="text-xs text-neutral-500 hidden sm:block">
            Splits faculty like <span className="font-medium">"X1, X2"</span> into two professors.
          </div>
        </CardContent>
      </Card>

      {/* Modern responsive modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[200px] max-w-3xl max-h-[70vh] flex flex-col p-0 overflow-hidden gap-0">
          {/* Header */}
          <div className="shrink-0 px-5 py-4 border-b bg-white">
            <DialogHeader>
              <DialogTitle className="pl-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Import Completed</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-2 hover:bg-neutral-100 transition"
                  aria-label="Close"
                >
                </button>
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 bg-neutral-50 overflow-hidden">
            <Tabs defaultValue={hasDetailedChanges ? "changes" : "overview"} className="h-90 flex flex-col">
              <div className="shrink-0 px-3 center pt-3 flex justify-center">
                <TabsList className="bg-white border">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="changes" disabled={!hasDetailedChanges}>
                    New & Updated
                  </TabsTrigger>
                  <TabsTrigger value="notes" disabled={notes.length === 0}>
                    Notes
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* OVERVIEW */}
              <TabsContent value="overview" className="flex min-h-0 px-3 pb-5 pt-3 overflow-hidden">
                <div className="h-full overflow-y-auto pr-1 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {summaryEntries.length === 0 ? (
                      <div className="text-sm text-neutral-600">No summary provided by backend.</div>
                    ) : (
                      summaryEntries.map(([k, v]) => (
                        <StatCard key={k} label={prettyKey(k)} value={String(v)} />
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
              
              {/* CHANGES */}
              <TabsContent value="changes" className="flex-1 min-h-0 px-5 pb-5 pt-3 overflow-y-auto">
                <div className="h-full overflow-y-auto pr-1">
                  <div className="space-y-1">
                    {(newCourses?.length ?? 0) > 0 && (
                      <ListPanel
                        title="New Courses"
                        items={newCourses}
                        accent="green"
                        search={qCourses}
                        onSearch={setQCourses}
                      />
                    )}

                    {(newProfs?.length ?? 0) > 0 && (
                      <ListPanel
                        title="New Professors"
                        items={newProfs}
                        accent="blue"
                        search={qProfs}
                        onSearch={setQProfs}
                      />
                    )}

                    {(newTAs?.length ?? 0) > 0 && (
                      <ListPanel
                        title="New TAs"
                        items={newTAs}
                        accent="amber"
                        search={qTAs}
                        onSearch={setQTAs}
                      />
                    )}

                    
                    {/* Updated items */}
                    <div className="rounded-2xl border bg-white overflow-hidden flex flex-col">
                      <div className="px-4 py-3 border-b">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="text-sm font-semibold text-neutral-900">Updated Records</div>
                          <div className="flex gap-2">
                            <span className="text-xs px-2 py-1 rounded-md border border-neutral-200 bg-amber-100 text-neutral-700">
                              TAs: {updatedTAs.length}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-md border border-neutral-200 bg-amber-100 text-neutral-700">
                              Courses: {updatedCourses.length}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-3 relative flex">
                          <input
                            value={qUpdated}
                            onChange={(e) => setQUpdated(e.target.value)}
                            placeholder="Search updated names..."
                            className="w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                      </div>
                      
                      <div className="p-4 max-h-48 overflow-y-auto">
                        {(() => {
                          const q = qUpdated.trim().toLowerCase();
                          const updatedPairs: { label: string; items: string[] }[] = [
                            { label: "Updated TAs", items: updatedTAs },
                            { label: "Updated Courses", items: updatedCourses },
                          ];
                          
                          const filtered = updatedPairs.map((g) => ({
                            ...g,
                            items: q ? g.items.filter((x) => x.toLowerCase().includes(q)) : g.items,
                          }));
                          
                          const totalShown = filtered.reduce((acc, g) => acc + g.items.length, 0);
                          
                          if (totalShown === 0) {
                            return <div className="text-sm text-neutral-500">No updated records.</div>;
                          }
                          
                          return (
                            <div className="space-y-3">
                              {filtered.map((g) => (
                                <div key={g.label} className="rounded-xl border bg-neutral-50 p-3">
                                  <div className="text-sm font-semibold text-neutral-900 mb-2">
                                    {g.label} <span className="text-xs font-normal text-neutral-600">({g.items.length})</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {g.items.map((x) => (
                                      <Badge key={x} variant="outline" className="bg-white">
                                        {x}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* NOTES */}
              <TabsContent value="notes" className="flex-1 min-h-0 px-5 pb-5 pt-3 overflow-hidden">
                <div className="h-full rounded-2xl border bg-white p-4 overflow-y-auto">
                  {notes.length === 0 ? (
                    <div className="text-sm text-neutral-500">No notes.</div>
                  ) : (
                    <ul className="space-y-2">
                      {notes.map((n, i) => (
                        <li key={i} className="text-sm text-neutral-700 flex gap-2">
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}