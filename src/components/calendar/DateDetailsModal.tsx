"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateLogEntry, Person } from "@/lib/types";

interface CalendarDate extends DateLogEntry {
    id: string;
    person_name: string;
    completed: boolean;
}

interface DateDetailsModalProps {
    date: CalendarDate;
    people: Person[];
    onClose: () => void;
    onDateUpdated: () => void;
}

export function DateDetailsModal({
    date,
    people,
    onClose,
    onDateUpdated,
}: DateDetailsModalProps) {
    const [when, setWhen] = useState(() => {
        // Convert ISO string to datetime-local format
        const dateObj = new Date(date.when);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        const hours = String(dateObj.getHours()).padStart(2, "0");
        const minutes = String(dateObj.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    });
    const [where, setWhere] = useState(date.where || "");
    const [notes, setNotes] = useState(date.notes || "");
    const [learnings, setLearnings] = useState(date.learnings || "");
    const [completed, setCompleted] = useState(date.completed ?? false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const person = people.find((p) => p.name === date.person_name);

    const handleSave = async () => {
        if (!when.trim()) {
            setError("Date and time are required");
            return;
        }

        if (!where.trim()) {
            setError("Location is required");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            // Convert datetime-local to ISO string
            const dateObj = new Date(when);
            const isoString = dateObj.toISOString();

            const response = await fetch(`/api/calendar/dates/${date.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    when: isoString,
                    where: where.trim(),
                    notes: notes.trim() || "",
                    learnings: learnings.trim() || "",
                    completed: completed,
                }),
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || "Failed to update date");
            }

            onDateUpdated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update date");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this date?")) {
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            const response = await fetch(`/api/calendar/dates/${date.id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || "Failed to delete date");
            }

            onDateUpdated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete date");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md rounded-lg border bg-background shadow-lg">
                {/* Header */}
                <div className="flex items-center justify-between border-b p-4">
                    <h2 className="text-lg font-semibold">Date Details</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-6 w-6"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Person</label>
                        <div className="text-sm text-muted-foreground">
                            {date.person_name}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="when" className="text-sm font-medium mb-1 block">
                            Date & Time *
                        </label>
                        <Input
                            id="when"
                            type="datetime-local"
                            value={when}
                            onChange={(e) => setWhen(e.target.value)}
                            disabled={isSaving}
                        />
                    </div>

                    <div>
                        <label htmlFor="where" className="text-sm font-medium mb-1 block">
                            Location *
                        </label>
                        <Input
                            id="where"
                            type="text"
                            value={where}
                            onChange={(e) => setWhere(e.target.value)}
                            disabled={isSaving}
                        />
                    </div>

                    <div>
                        <label htmlFor="notes" className="text-sm font-medium mb-1 block">
                            Notes
                        </label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={isSaving}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="learnings"
                            className="text-sm font-medium mb-1 block"
                        >
                            Learnings
                        </label>
                        <textarea
                            id="learnings"
                            value={learnings}
                            onChange={(e) => setLearnings(e.target.value)}
                            disabled={isSaving}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="completed"
                            checked={completed}
                            onChange={(e) => setCompleted(e.target.checked)}
                            disabled={isSaving}
                            className="h-4 w-4 rounded border-gray-300"
                        />
                        <label htmlFor="completed" className="text-sm font-medium">
                            Completed (I went on this date)
                        </label>
                    </div>

                    {error && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t p-4">
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isSaving || isDeleting}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving || isDeleting}>
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

