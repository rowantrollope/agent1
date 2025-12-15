"use client";

import { DatePrep } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
    BookOpen,
    MessageSquare,
    Heart,
    AlertTriangle,
    Sparkles,
    Calendar,
    Lightbulb,
    X,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DatePrepPanelProps {
    datePrep: DatePrep | null;
    loading: boolean;
    onClose: () => void;
    personName: string;
}

export function DatePrepPanel({
    datePrep,
    loading,
    onClose,
    personName,
}: DatePrepPanelProps) {
    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="relative mx-4 w-full max-w-4xl rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-8 shadow-2xl">
                    <div className="flex flex-col items-center justify-center gap-4 py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
                        <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-700">
                            generating date prep...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!datePrep) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="relative mx-auto w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-8 py-6 backdrop-blur">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-fuchsia-600">
                            date preparation
                        </p>
                        <h2 className="mt-2 text-3xl font-bold text-slate-900">
                            {personName}
                        </h2>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="rounded-full border border-slate-300 hover:bg-slate-100"
                    >
                        <X className="h-5 w-5 text-slate-700" />
                    </Button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto px-8 py-8" style={{ maxHeight: "calc(90vh - 120px)" }}>
                    <div className="space-y-8">
                        {/* Overview */}
                        {datePrep.overview && (
                            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <Sparkles className="h-5 w-5 text-emerald-600" />
                                    <h3 className="text-sm uppercase tracking-[0.3em] text-emerald-700">
                                        Overview
                                    </h3>
                                </div>
                                <p className="text-sm leading-relaxed text-slate-700">
                                    {datePrep.overview}
                                </p>
                            </div>
                        )}

                        {/* Key Memories */}
                        {datePrep.keyMemories && datePrep.keyMemories.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <BookOpen className="h-5 w-5 text-fuchsia-600" />
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        Key Memories to Refresh
                                    </h3>
                                </div>
                                <div className="grid gap-3">
                                    {datePrep.keyMemories.map((memory, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                                        >
                                            <p className="text-sm font-medium text-slate-900 mb-2">
                                                {memory.text}
                                            </p>
                                            <p className="text-xs text-slate-600 italic">
                                                {memory.why}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Two Column Grid for Stats */}
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Conversation Starters */}
                            {datePrep.conversationStarters &&
                                datePrep.conversationStarters.length > 0 && (
                                    <section>
                                        <div className="flex items-center gap-3 mb-4">
                                            <MessageSquare className="h-5 w-5 text-blue-600" />
                                            <h3 className="text-base font-semibold text-slate-900">
                                                Conversation Starters
                                            </h3>
                                        </div>
                                        <ul className="space-y-2">
                                            {datePrep.conversationStarters.map((starter, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-slate-700"
                                                >
                                                    <span className="mt-0.5 text-blue-600">•</span>
                                                    <span>{starter}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}

                            {/* Things She Likes */}
                            {datePrep.thingsSheLikes && datePrep.thingsSheLikes.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-4">
                                        <Heart className="h-5 w-5 text-rose-600" />
                                        <h3 className="text-base font-semibold text-slate-900">
                                            Things She Likes
                                        </h3>
                                    </div>
                                    <ul className="space-y-2">
                                        {datePrep.thingsSheLikes.map((item, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-slate-700"
                                            >
                                                <span className="mt-0.5 text-rose-600">•</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </div>

                        {/* Date History Summary */}
                        {datePrep.dateHistorySummary && (
                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <Calendar className="h-5 w-5 text-amber-600" />
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        Date History
                                    </h3>
                                </div>
                                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                                    <p className="text-sm leading-relaxed text-slate-700">
                                        {datePrep.dateHistorySummary}
                                    </p>
                                </div>
                            </section>
                        )}

                        {/* Two Column Grid for Suggestions */}
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Date Suggestions */}
                            {datePrep.dateSuggestions &&
                                datePrep.dateSuggestions.length > 0 && (
                                    <section>
                                        <div className="flex items-center gap-3 mb-4">
                                            <Sparkles className="h-5 w-5 text-emerald-600" />
                                            <h3 className="text-base font-semibold text-slate-900">
                                                Date Suggestions
                                            </h3>
                                        </div>
                                        <ul className="space-y-2">
                                            {datePrep.dateSuggestions.map((suggestion, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-slate-700"
                                                >
                                                    <span className="mt-0.5 text-emerald-600">•</span>
                                                    <span>{suggestion}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}

                            {/* Things to Avoid */}
                            {datePrep.thingsToAvoid &&
                                datePrep.thingsToAvoid.length > 0 && (
                                    <section>
                                        <div className="flex items-center gap-3 mb-4">
                                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                                            <h3 className="text-base font-semibold text-slate-900">
                                                Things to Avoid
                                            </h3>
                                        </div>
                                        <ul className="space-y-2">
                                            {datePrep.thingsToAvoid.map((item, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-slate-700"
                                                >
                                                    <span className="mt-0.5 text-amber-600">•</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                        </div>

                        {/* Tips */}
                        {datePrep.tips && datePrep.tips.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <Lightbulb className="h-5 w-5 text-cyan-600" />
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        Tips & Reminders
                                    </h3>
                                </div>
                                <div className="grid gap-3">
                                    {datePrep.tips.map((tip, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4"
                                        >
                                            <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-600" />
                                            <p className="text-sm text-slate-700">{tip}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

