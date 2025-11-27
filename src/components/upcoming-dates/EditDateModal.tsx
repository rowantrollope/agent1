"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UpcomingDate } from "@/lib/types";

interface EditDateModalProps {
  date: UpcomingDate;
  onClose: () => void;
  onDateUpdated: () => void;
}

export function EditDateModal({
  date,
  onClose,
  onDateUpdated,
}: EditDateModalProps) {
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!when.trim()) {
      setError("Date and time are required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Convert datetime-local to ISO string
      const dateObj = new Date(when);
      const isoString = dateObj.toISOString();

      // If date has an id, update via calendar dates API (unified model)
      if (date.id) {
        const response = await fetch(`/api/calendar/dates/${date.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            when: isoString,
            where: where.trim() || "",
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to update date");
        }
      } else {
        // Legacy: create a new date entry via calendar API
        const response = await fetch("/api/calendar/dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            person_name: date.person_name,
            when: isoString,
            where: where.trim() || "",
            completed: false,
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to create date");
        }
      }

      onDateUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update date");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-lg border bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Edit Date</h2>
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
            <label className="text-sm font-medium mb-1 block">
              Person
            </label>
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
              Location
            </label>
            <Input
              id="where"
              type="text"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="Optional"
              disabled={isSaving}
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
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

