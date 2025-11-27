"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Person } from "@/lib/types";

interface CreateDateModalProps {
  people: Person[];
  onClose: () => void;
  onDateCreated: () => void;
}

export function CreateDateModal({
  people,
  onClose,
  onDateCreated,
}: CreateDateModalProps) {
  const [personName, setPersonName] = useState((people && people.length > 0) ? people[0].name : "");
  const [when, setWhen] = useState(() => {
    // Default to tomorrow at 7 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    const hours = String(tomorrow.getHours()).padStart(2, "0");
    const minutes = String(tomorrow.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });
  const [where, setWhere] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!personName.trim()) {
      setError("Please select a person");
      return;
    }

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

      const response = await fetch("/api/calendar/dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_name: personName,
          when: isoString,
          where: where.trim(),
          notes: notes.trim() || "",
          completed: false,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create date");
      }

      onDateCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create date");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-lg border bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Create Date</h2>
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
            <label htmlFor="person" className="text-sm font-medium mb-1 block">
              Person *
            </label>
            <select
              id="person"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              disabled={isSaving || !people || people.length === 0}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {people && people.length > 0 ? (
                people.map((person) => (
                  <option key={person.name} value={person.name}>
                    {person.name}
                  </option>
                ))
              ) : (
                <option value="">No active people available</option>
              )}
            </select>
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
              placeholder="e.g., Coffee shop downtown"
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
              placeholder="Optional notes about the date"
              disabled={isSaving}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
              rows={3}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Creating..." : "Create Date"}
          </Button>
        </div>
      </div>
    </div>
  );
}

