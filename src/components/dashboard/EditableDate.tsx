"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface EditableDateProps {
    value?: string;
    onSave: (value: string) => Promise<void>;
    formatDate: (dateString?: string) => string;
}

export function EditableDate({
    value,
    onSave,
    formatDate,
}: EditableDateProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(
        value ? value.split("T")[0] : ""
    );
    const [isSaving, setIsSaving] = useState(false);

    // Sync with prop changes
    useEffect(() => {
        if (!isEditing) {
            setCurrentValue(value ? value.split("T")[0] : "");
        }
    }, [value, isEditing]);

    const handleSave = async () => {
        if (currentValue === (value ? value.split("T")[0] : "")) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            await onSave(currentValue || "");
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save date:", error);
            setCurrentValue(value ? value.split("T")[0] : ""); // Revert on error
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setCurrentValue(value ? value.split("T")[0] : "");
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <Input
                type="date"
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
            />
        );
    }

    return (
        <span
            className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            onClick={() => setIsEditing(true)}
        >
            {formatDate(value)}
        </span>
    );
}

