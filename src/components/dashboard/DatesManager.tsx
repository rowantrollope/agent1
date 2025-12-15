"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateLogEntry } from "@/lib/types";

interface DatesManagerProps {
    dates?: DateLogEntry[];
    onSave: (dates: DateLogEntry[]) => Promise<void>;
    formatDate: (dateString?: string) => string;
}

const emptyDate: DateLogEntry = {
    where: "",
    when: "",
    notes: "",
};

export function DatesManager({
    dates = [],
    onSave,
    formatDate,
}: DatesManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [entries, setEntries] = useState<DateLogEntry[]>(dates);
    const [newDate, setNewDate] = useState<DateLogEntry>(emptyDate);
    const [isSaving, setIsSaving] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setEntries(dates);
    }, [dates]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isOpen &&
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const persistDates = async (updated: DateLogEntry[]) => {
        setIsSaving(true);
        try {
            await onSave(updated);
            setEntries(updated);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAdd = async () => {
        if (!newDate.where.trim() || !newDate.when.trim()) {
            return;
        }
        const updated = [...entries, { ...newDate }];
        await persistDates(updated);
        setNewDate(emptyDate);
    };

    const handleDelete = async (index: number) => {
        const updated = entries.filter((_, idx) => idx !== index);
        await persistDates(updated);
    };

    return (
        <div className="relative inline-flex" ref={containerRef}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen((prev) => !prev)}
                className="h-7 px-2 text-xs"
            >
                {entries.length > 0 ? `${entries.length} logged` : "Log a date"}
            </Button>

            {isOpen && (
                <div className="absolute z-20 top-9 right-0 w-72 rounded-md border bg-background shadow-xl p-3 space-y-3">
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {entries.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No dates logged yet.
                            </p>
                        ) : (
                            entries.map((entry, index) => (
                                <div
                                    key={`${entry.where}-${entry.when}-${index}`}
                                    className="border rounded-md p-2 text-xs space-y-1"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="font-semibold truncate">{entry.where}</div>
                                        <button
                                            className="text-muted-foreground hover:text-destructive text-[10px]"
                                            onClick={() => handleDelete(index)}
                                            disabled={isSaving}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <div className="text-muted-foreground">
                                        {formatDate(entry.when)}
                                    </div>
                                    {entry.notes && (
                                        <p className="text-muted-foreground/80 whitespace-pre-wrap">
                                            {entry.notes}
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="space-y-2 border-t pt-2">
                        <Input
                            type="text"
                            className="h-7 text-xs"
                            placeholder="Where"
                            value={newDate.where}
                            onChange={(event) =>
                                setNewDate((prev) => ({ ...prev, where: event.target.value }))
                            }
                            disabled={isSaving}
                        />
                        <Input
                            type="date"
                            className="h-7 text-xs"
                            value={newDate.when}
                            onChange={(event) =>
                                setNewDate((prev) => ({ ...prev, when: event.target.value }))
                            }
                            disabled={isSaving}
                        />
                        <textarea
                            className="w-full rounded-md border bg-transparent p-2 text-xs"
                            placeholder="Notes (optional)"
                            value={newDate.notes || ""}
                            onChange={(event) =>
                                setNewDate((prev) => ({ ...prev, notes: event.target.value }))
                            }
                            disabled={isSaving}
                            rows={2}
                        />
                        <Button
                            size="sm"
                            className="w-full h-7 text-xs"
                            onClick={handleAdd}
                            disabled={
                                isSaving || !newDate.where.trim() || !newDate.when.trim()
                            }
                        >
                            Save Date
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}







