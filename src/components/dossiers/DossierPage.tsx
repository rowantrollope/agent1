"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DossierChatMessage,
  DossierPayload,
  MemoryRecordLite,
  Person,
  DatePrep,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bookmark,
  Clock3,
  Heart,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Calendar,
} from "lucide-react";
import { DatePrepPanel } from "./DatePrepPanel";
import { PersonSelect } from "./PersonSelect";
import { PhotoUpload } from "./PhotoUpload";
import { Unbounded, IBM_Plex_Mono } from "next/font/google";

const headline = Unbounded({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-dossier-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dossier-mono",
});

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Exploring", value: "exploring" },
  { label: "Paused", value: "paused" },
  { label: "Not pursuing", value: "not_pursuing" },
];

const randomId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function DossierPage() {
  const searchParams = useSearchParams();
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [dossier, setDossier] = useState<DossierPayload | null>(null);
  const [chatHistory, setChatHistory] = useState<DossierChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsDraft, setDetailsDraft] = useState({
    status: "",
    how_we_met: "",
    memory_tags: "",
    start_date: "",
  });
  const [isAddingDate, setIsAddingDate] = useState(false);
  const [dateForm, setDateForm] = useState({
    when: "",
    where: "",
    notes: "",
    learnings: "",
  });
  const [chatInput, setChatInput] = useState("");
  const [chatPending, setChatPending] = useState(false);
  const [datePrep, setDatePrep] = useState<DatePrep | null>(null);
  const [datePrepLoading, setDatePrepLoading] = useState(false);
  const [showDatePrep, setShowDatePrep] = useState(false);

  const fetchPeople = useCallback(async () => {
    try {
      const response = await fetch("/api/dossiers");
      const data = await response.json();
      if (data.success) {
        const list: Person[] = data.people || [];
        // Sort: active people first, then others
        const sorted = [...list].sort((a, b) => {
          const aIsActive = a.status === "active";
          const bIsActive = b.status === "active";
          if (aIsActive && !bIsActive) return -1;
          if (!aIsActive && bIsActive) return 1;
          return 0;
        });
        setPeople(sorted);
        if (sorted.length) {
          // Check URL params first, then use first person or existing selection
          const urlName = searchParams?.get("name");
          if (urlName) {
            const decodedName = decodeURIComponent(urlName);
            const found = sorted.find((p) => p.name === decodedName);
            if (found) {
              setSelectedName(decodedName);
            } else {
              setSelectedName((prev) => prev || sorted[0].name);
            }
          } else {
            setSelectedName((prev) => prev || sorted[0].name);
          }
        }
      } else {
        setError(data.error || "Unable to load dossiers");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load dossier list",
      );
    }
  }, [searchParams]);

  const fetchDossierBrief = useCallback(
    async (targetName: string) => {
      try {
        const response = await fetch(
          `/api/dossiers/${encodeURIComponent(targetName)}/brief`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (data.success && data.brief) {
          setDossier((prev) => {
            if (!prev) return prev;
            // Preserve all existing data, only update the brief
            // Explicitly preserve person data including photo_url to prevent it from disappearing
            return {
              ...prev,
              brief: data.brief,
              person: prev.person ? { ...prev.person } : prev.person,
            };
          });
        }
      } catch (err) {
        console.error("Failed to load dossier brief:", err);
        // Don't show error to user, just log it
      }
    },
    [],
  );

  const fetchDatePrep = useCallback(
    async (targetName: string) => {
      setDatePrepLoading(true);
      setShowDatePrep(true);
      try {
        const response = await fetch(
          `/api/dossiers/${encodeURIComponent(targetName)}/date-prep`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (data.success && data.datePrep) {
          setDatePrep(data.datePrep);
        } else {
          setError(data.error || "Failed to generate date prep");
          setShowDatePrep(false);
        }
      } catch (err) {
        console.error("Failed to load date prep:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate date prep",
        );
        setShowDatePrep(false);
      } finally {
        setDatePrepLoading(false);
      }
    },
    [],
  );

  const fetchDossier = useCallback(
    async (targetName?: string) => {
      if (!targetName && !selectedName) return;
      const name = targetName || selectedName;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/dossiers/${encodeURIComponent(name)}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to load dossier");
        }
        setDossier(data.data);
        if (data.data?.chatHistory) {
          setChatHistory(data.data.chatHistory);
        } else {
          setChatHistory([]);
        }
        setDetailsDraft({
          status: data.data?.person?.status || "",
          how_we_met: data.data?.person?.how_we_met || "",
          memory_tags: data.data?.person?.memory_tags || "",
          start_date: data.data?.person?.start_date || "",
        });
        
        // Fetch brief asynchronously in the background
        fetchDossierBrief(name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dossier");
      } finally {
        setLoading(false);
      }
    },
    [selectedName, fetchDossierBrief],
  );

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    if (selectedName) {
      fetchDossier(selectedName);
    }
  }, [selectedName, fetchDossier]);

  const handleSaveDetails = async () => {
    if (!dossier?.person?.name) return;
    setSecondaryLoading(true);
    try {
      const payload = {
        name: dossier.person.name,
        status: detailsDraft.status,
        how_we_met: detailsDraft.how_we_met,
        memory_tags: detailsDraft.memory_tags,
        start_date: detailsDraft.start_date,
        photo_url: dossier.person.photo_url,
      };
      const response = await fetch("/api/dashboard/update-person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Unable to save details");
      }
      await fetchDossier(dossier.person.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save details");
    } finally {
      setSecondaryLoading(false);
    }
  };

  const handleAddDate = async () => {
    if (!selectedName) return;
    if (!dateForm.when || !dateForm.where) {
      setError("Please provide both a date/time and a location.");
      return;
    }
    setSecondaryLoading(true);
    try {
      const response = await fetch(
        `/api/dossiers/${encodeURIComponent(selectedName)}/dates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dateForm),
        },
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Unable to add date");
      }
      setDateForm({ when: "", where: "", notes: "", learnings: "" });
      setIsAddingDate(false);
      await fetchDossier(selectedName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add date");
    } finally {
      setSecondaryLoading(false);
    }
  };

  const handleSendChat = async () => {
    if (!selectedName || !chatInput.trim()) return;
    const outgoing: DossierChatMessage = {
      id: randomId(),
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };
    setChatHistory((prev) => [...prev, outgoing]);
    setChatInput("");
    setChatPending(true);
    try {
      const response = await fetch(
        `/api/dossiers/${encodeURIComponent(selectedName)}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: outgoing.content }),
        },
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Chat update failed");
      }
      if (data.assistantMessage) {
        setChatHistory((prev) => [...prev, data.assistantMessage]);
      }
      if (data.dossier?.data) {
        setDossier(data.dossier.data);
      } else if (data.dossier) {
        setDossier(data.dossier);
      }
      // Refresh brief after chat update since new information may have been added
      if (selectedName) {
        fetchDossierBrief(selectedName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat update failed");
      setChatHistory((prev) =>
        prev.filter((msg) => msg.id !== outgoing.id),
      );
      setChatInput(outgoing.content);
    } finally {
      setChatPending(false);
    }
  };

  const heroSubtitle = useMemo(() => {
    if (!dossier?.person) return "";
    const parts = [
      dossier.person.status ? dossier.person.status : null,
      dossier.person.how_we_met ? `met via ${dossier.person.how_we_met}` : null,
    ].filter(Boolean);
    return parts.join(" • ");
  }, [dossier]);

  return (
    <div
      className={cn(
        "relative min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900",
        headline.variable,
        mono.variable,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#f8fafc,_#ffffff_55%)] opacity-60" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-10" />
      <div className="relative z-10 px-6 pb-16 pt-10 lg:px-12">
        <section className="mx-auto flex max-w-6xl flex-col gap-8">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="mt-3 flex items-center gap-3 text-4xl tracking-tight text-slate-900 sm:text-5xl">
                Love <Heart className="h-8 w-8 text-red-500 sm:h-10 sm:w-10" />
              </h1>
              {heroSubtitle && (
                <p className="mt-2 text-sm text-slate-600">{heroSubtitle}</p>
              )}
            </div>
            <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-end">
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <PersonSelect
                  people={people}
                  value={selectedName}
                  onChange={(name) => setSelectedName(name)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    fetchDossier(selectedName);
                    if (selectedName) {
                      fetchDossierBrief(selectedName);
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {selectedName && (
                  <Button
                    onClick={() => fetchDatePrep(selectedName)}
                    className="gap-2 rounded-full border border-fuchsia-500 bg-fuchsia-500/10 px-4 py-2 text-sm uppercase tracking-[0.2em] text-fuchsia-700 transition hover:bg-fuchsia-500/20"
                  >
                    <Calendar className="h-4 w-4" />
                    Date Prep
                  </Button>
                )}
              </div>
            </div>
          </header>

          {error && (
            <div className="rounded-md border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-fuchsia-600" />
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                calibrating dossier
              </p>
            </div>
          )}

          {!loading && dossier && (
            <main className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="space-y-8">
                <SummaryPanel 
                  dossier={dossier} 
                  onPhotoUpload={(photoUrl: string) => {
                    // Directly update the dossier state with the new photo URL
                    // without triggering a full refetch that causes brief reload
                    setDossier((prev) => {
                      if (!prev?.person) return prev;
                      return {
                        ...prev,
                        person: {
                          ...prev.person,
                          photo_url: photoUrl,
                        },
                      };
                    });
                  }}
                />
                <TimelinePanel
                  dossier={dossier}
                  isAdding={isAddingDate}
                  onToggleAdd={() => setIsAddingDate((prev) => !prev)}
                  dateForm={dateForm}
                  onFormChange={setDateForm}
                  onSubmit={handleAddDate}
                  busy={secondaryLoading}
                />
                <MemoryPanel memories={dossier.memories} />
              </section>

              <section className="space-y-8">
                <DetailsPanel
                  details={detailsDraft}
                  onChange={setDetailsDraft}
                  onSave={handleSaveDetails}
                  busy={secondaryLoading}
                  dossier={dossier}
                />
                <SignalsPanel dossier={dossier} />
                <ChatPanel
                  chatHistory={chatHistory}
                  inputValue={chatInput}
                  onInputChange={setChatInput}
                  onSend={handleSendChat}
                  pending={chatPending}
                />
              </section>
            </main>
          )}
        </section>
      </div>

      {showDatePrep && (
        <DatePrepPanel
          datePrep={datePrep}
          loading={datePrepLoading}
          onClose={() => {
            setShowDatePrep(false);
            setDatePrep(null);
          }}
          personName={selectedName}
        />
      )}
    </div>
  );
}

function SummaryPanel({ dossier, onPhotoUpload }: { dossier: DossierPayload; onPhotoUpload?: (photoUrl: string) => void }) {
  if (!dossier.person) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-6 shadow-lg backdrop-blur">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  const hasBrief = dossier.brief && dossier.brief.summary;

  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-6 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <PhotoUpload
              personName={dossier.person.name}
              currentPhotoUrl={dossier.person.photo_url}
              size="lg"
              onUploadComplete={(photoUrl: string) => {
                // Update dossier state directly with new photo URL
                if (onPhotoUpload) {
                  onPhotoUpload(photoUrl);
                }
              }}
            />
            <div className="flex-1">
              {hasBrief ? (
                <>
                  <p className="text-xs uppercase tracking-[0.4em] text-fuchsia-600">
                    {dossier.brief!.personaTone}
                  </p>
                  <h2 className="mt-2 text-3xl text-slate-900">
                    {dossier.person.name}
                  </h2>
                  <p className="mt-2 text-base text-slate-700">
                    {dossier.brief!.summary}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                    Loading analysis...
                  </p>
                  <h2 className="mt-2 text-3xl text-slate-900">
                    {dossier.person.name}
                  </h2>
                  <p className="mt-2 text-base text-slate-500">
                    Generating intelligence analysis...
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-xs uppercase tracking-[0.4em] text-slate-700">
            dossier refreshed {dossier.lastRefreshed ? new Date(dossier.lastRefreshed).toLocaleString() : "N/A"}
          </div>
        </div>

        {hasBrief && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {(dossier.brief!.signalBars || []).map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {signal.label}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-emerald-500"
                        style={{ width: `${Math.round(signal.score * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-700">
                      {Math.round(signal.score * 100)}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{signal.note}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {(dossier.brief!.highlightCards || []).map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl border bg-white p-4 text-sm text-slate-800",
                    item.tone === "violet" && "border-fuchsia-300",
                    item.tone === "emerald" && "border-emerald-300",
                    item.tone === "amber" && "border-amber-300",
                  )}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-600">
                next moves
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {(dossier.brief!.actionItems || []).map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Sparkles className="mt-1 h-4 w-4 text-fuchsia-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface TimelineProps {
  dossier: DossierPayload;
  isAdding: boolean;
  onToggleAdd: () => void;
  dateForm: {
    when: string;
    where: string;
    notes: string;
    learnings: string;
  };
  onFormChange: (form: TimelineProps["dateForm"]) => void;
  onSubmit: () => void;
  busy: boolean;
}

function TimelinePanel({
  dossier,
  isAdding,
  onToggleAdd,
  dateForm,
  onFormChange,
  onSubmit,
  busy,
}: TimelineProps) {
  if (!dossier) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
            Date timeline
          </p>
          <h3 className="text-xl text-slate-900">Field Intel</h3>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={onToggleAdd}
          className="gap-2 rounded-full border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
        >
          <Plus className="h-4 w-4" />
          Add new date
        </Button>
      </div>

      {isAdding && (
        <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs uppercase text-slate-600">
              Date & time
              <Input
                type="datetime-local"
                value={dateForm.when}
                onChange={(e) =>
                  onFormChange({ ...dateForm, when: e.target.value })
                }
                className="mt-2 border-slate-300 bg-white text-slate-900"
              />
            </label>
            <label className="text-xs uppercase text-slate-600">
              Location
              <Input
                placeholder="Bar, gallery, trail..."
                value={dateForm.where}
                onChange={(e) =>
                  onFormChange({ ...dateForm, where: e.target.value })
                }
                className="mt-2 border-slate-300 bg-white text-slate-900"
              />
            </label>
          </div>
          <label className="text-xs uppercase text-slate-600">
            Notes
            <textarea
              rows={3}
              value={dateForm.notes}
              onChange={(e) =>
                onFormChange({ ...dateForm, notes: e.target.value })
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </label>
          <label className="text-xs uppercase text-slate-600">
            Things learned
            <textarea
              rows={2}
              value={dateForm.learnings}
              onChange={(e) =>
                onFormChange({ ...dateForm, learnings: e.target.value })
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onToggleAdd}
              className="text-slate-600"
            >
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Save date
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {(!dossier.dates || dossier.dates.length === 0) && (
          <p className="text-sm text-slate-500">
            No recorded dates yet. Start logging to build her story.
          </p>
        )}
        {(dossier.dates || []).map((entry) => (
          <div
            key={`${entry.when}-${entry.where}-${entry.id ?? ""}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
              <Clock3 className="h-4 w-4 text-fuchsia-600" />
              {new Date(entry.when).toLocaleString()}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <MapPin className="h-4 w-4 text-emerald-600" />
              {entry.where}
            </div>
            {entry.notes && (
              <p className="mt-3 text-sm text-slate-700">{entry.notes}</p>
            )}
            {entry.learnings && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                Learned: {entry.learnings}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MemoryPanel({ memories }: { memories: MemoryRecordLite[] }) {
  const featured = (memories || []).slice(0, 6);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
            Memory reel
          </p>
          <h3 className="text-xl text-slate-900">Signals from memory server</h3>
        </div>
        <Bookmark className="h-5 w-5 text-fuchsia-600" />
      </div>
      {featured.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No memories synced yet. Add intel through the chat to seed this grid.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {featured.map((memory) => (
            <div
              key={memory.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                {memory.memory_type}
              </p>
              <p className="mt-2 text-sm">{memory.text}</p>
              <div className="mt-3 text-xs text-slate-500">
                {memory.event_date
                  ? new Date(memory.event_date).toLocaleDateString()
                  : "no date"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DetailsPanelProps {
  details: {
    status: string;
    how_we_met: string;
    memory_tags: string;
    start_date: string;
  };
  onChange: (next: DetailsPanelProps["details"]) => void;
  onSave: () => void;
  busy: boolean;
}

function DetailsPanel({ details, onChange, onSave, busy, dossier }: DetailsPanelProps & { dossier: DossierPayload }) {
  if (!dossier.person) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
            dossier fields
          </p>
          <h3 className="text-xl text-slate-900">Key facts</h3>
        </div>
        <Button
          size="sm"
          className="rounded-full bg-slate-900 text-white hover:bg-slate-800"
          onClick={onSave}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Save dossier
        </Button>
      </div>
      <div className="mt-6 grid gap-4">
        <label className="text-xs uppercase text-slate-600">
          Status
          <select
            value={details.status}
            onChange={(e) =>
              onChange({ ...details, status: e.target.value })
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Select status</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs uppercase text-slate-600">
          How you met
          <Input
            value={details.how_we_met}
            onChange={(e) =>
              onChange({ ...details, how_we_met: e.target.value })
            }
            className="mt-2 border-slate-300 bg-white text-slate-900"
          />
        </label>
        <label className="text-xs uppercase text-slate-600">
          Start date
          <Input
            type="date"
            value={details.start_date || ""}
            onChange={(e) =>
              onChange({ ...details, start_date: e.target.value })
            }
            className="mt-2 border-slate-300 bg-white text-slate-900"
          />
        </label>
        <label className="text-xs uppercase text-slate-600">
          Memory tags
          <Input
            value={details.memory_tags}
            onChange={(e) =>
              onChange({ ...details, memory_tags: e.target.value })
            }
            placeholder="christina, hiking, morning-person"
            className="mt-2 border-slate-300 bg-white text-slate-900"
          />
        </label>
      </div>
    </div>
  );
}

function SignalsPanel({ dossier }: { dossier: DossierPayload }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-fuchsia-50 to-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-600">
          Context digest
        </p>
        <span className="text-xs text-slate-500">
          {dossier.memoryStats?.total || 0} memories indexed
        </span>
      </div>
      <div className="mt-4 text-sm text-slate-700">
        The dossier fuses Redis dating data + agent memory server.
      </div>
      {dossier.memoryStats?.lastUpdated && (
        <div className="mt-2 text-xs text-slate-500">
          Last memory sync:{" "}
          {new Date(dossier.memoryStats.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
}

interface ChatPanelProps {
  chatHistory: DossierChatMessage[];
  inputValue: string;
  pending: boolean;
  onInputChange: (next: string) => void;
  onSend: () => void;
}

function ChatPanel({
  chatHistory,
  inputValue,
  onInputChange,
  onSend,
  pending,
}: ChatPanelProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
            Field updates
          </p>
          <h3 className="text-xl text-slate-900">Add intel via chat</h3>
        </div>
      </div>
      <div className="mt-4 h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        {chatHistory.length === 0 && (
          <p className="text-sm text-slate-500">
            Log anything you learn — we&apos;ll push it into memory instantly.
          </p>
        )}
        {chatHistory.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "assistant" ? "justify-start" : "justify-end",
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                message.role === "assistant"
                  ? "bg-white text-slate-800 border border-slate-200"
                  : "bg-fuchsia-500 text-white",
              )}
            >
              <p>{message.content}</p>
              <span className="mt-2 block text-[10px] uppercase tracking-[0.3em] text-slate-500">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <textarea
          rows={2}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="She opened up about loving sunrise hikes..."
          className="flex-1 rounded-2xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
        />
        <Button
          onClick={onSend}
          disabled={pending || !inputValue.trim()}
          className="h-full rounded-2xl bg-fuchsia-500 text-white hover:bg-fuchsia-600"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

