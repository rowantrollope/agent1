"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface EditableTextProps {
  value?: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
}

export function EditableText({
  value = "",
  onSave,
  placeholder = "—",
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    if (!isEditing) {
      setCurrentValue(value);
    }
  }, [value, isEditing]);

  const handleSave = async () => {
    if (currentValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(currentValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save text:", error);
      setCurrentValue(value); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setCurrentValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        type="text"
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSave();
          } else if (e.key === "Escape") {
            handleCancel();
          }
        }}
        autoFocus
        disabled={isSaving}
        className="h-6 text-xs px-2"
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
      onClick={() => setIsEditing(true)}
    >
      {value || placeholder}
    </span>
  );
}

