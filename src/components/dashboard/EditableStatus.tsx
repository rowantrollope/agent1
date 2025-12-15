"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface EditableStatusProps {
    value?: string;
    onSave: (value: string) => Promise<void>;
    getStatusColor: (status?: string) => string;
}

const STATUS_OPTIONS = [
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "exploring", label: "Exploring" },
    { value: "not_pursuing", label: "Not Pursuing" },
];

const normalizeStatus = (status?: string) =>
    status === "past" ? "not_pursuing" : status || "active";

export function EditableStatus({
    value = "active",
    onSave,
    getStatusColor,
}: EditableStatusProps) {
    const normalizedValue = normalizeStatus(value);
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(normalizedValue);
    const [isSaving, setIsSaving] = useState(false);

    // Sync with prop changes
    useEffect(() => {
        if (!isEditing) {
            setCurrentValue(normalizeStatus(value));
        }
    }, [value, isEditing]);

    const handleSave = async () => {
        if (currentValue === normalizedValue) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            await onSave(currentValue);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save status:", error);
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
            <select
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
                className="h-6 text-xs rounded border border-input bg-background px-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
                {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        );
    }

    return (
        <Badge
            variant="outline"
            className={`${
                getStatusColor(normalizeStatus(value))
            } text-xs cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => setIsEditing(true)}
        >
            {STATUS_OPTIONS.find((opt) => opt.value === normalizeStatus(value))
                ?.label || value}
        </Badge>
    );
}

