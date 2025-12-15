"use client";

import { Card } from "@/components/ui/card";
import { DateLogEntry, Person } from "@/lib/types";
import { EditableStatus } from "./EditableStatus";
import { EditableDate } from "./EditableDate";
import { EditableText } from "./EditableText";
import { DatesManager } from "./DatesManager";

interface ActiveDatingTableProps {
    activePeople: Person[];
    onUpdate?: () => void;
}

export function ActiveDatingTable({
    activePeople,
    onUpdate,
}: ActiveDatingTableProps) {
    const formatDate = (dateString?: string) => {
        if (!dateString) return "—";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        } catch {
            return dateString;
        }
    };

    const normalizeStatus = (status?: string) =>
        status === "past" ? "not_pursuing" : status;

    const getStatusColor = (status?: string) => {
        switch (normalizeStatus(status)) {
            case "active":
                return "bg-green-500/10 text-green-700 dark:text-green-400";
            case "exploring":
                return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
            case "paused":
                return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
            case "not_pursuing":
                return "bg-rose-500/10 text-rose-700 dark:text-rose-400";
            default:
                return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
        }
    };

    const handleUpdate = async (
        personName: string,
        field: "status" | "start_date" | "how_we_met",
        value: string
    ) => {
        try {
            const updateData: Record<string, string> = {
                name: personName,
                [field]: value,
            };

            const response = await fetch("/api/dashboard/update-person", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to update person");
            }

            // Refresh the data
            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            console.error("Error updating person:", error);
            throw error; // Re-throw to let the editable component handle it
        }
    };

    const handleDatesUpdate = async (
        personName: string,
        dates: DateLogEntry[]
    ) => {
        try {
            const response = await fetch("/api/dashboard/update-person", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: personName, dates }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to update dates");
            }

            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            console.error("Error updating dates:", error);
            throw error;
        }
    };

    if (activePeople.length === 0) {
        return (
            <Card className="p-3">
                <h3 className="text-lg font-semibold mb-4">Active Dating</h3>
                <div className="text-center py-4 text-muted-foreground text-sm">
                    No active dating relationships
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-3">
            <h3 className="text-lg font-semibold mb-4">Active Dating</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left p-1.5 font-semibold">Photo</th>
                            <th className="text-left p-1.5 font-semibold">Name</th>
                            <th className="text-left p-1.5 font-semibold">Status</th>
                            <th className="text-left p-1.5 font-semibold">
                                Start Date
                            </th>
                            <th className="text-left p-1.5 font-semibold">How We Met</th>
                            <th className="text-left p-1.5 font-semibold">Date Log</th>
                            <th className="text-left p-1.5 font-semibold">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activePeople.map((person, index) => (
                            <tr
                                key={index}
                                className="border-b hover:bg-muted/50 transition-colors"
                            >
                                <td className="p-1.5">
                                    {person.photo_url ? (
                                        <img
                                            src={person.photo_url}
                                            alt={person.name}
                                            className="w-10 h-10 rounded-full object-cover border border-border"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {person.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </td>
                                <td className="p-1.5 font-medium">{person.name}</td>
                                <td className="p-1.5">
                                    <EditableStatus
                                        value={normalizeStatus(person.status) || "active"}
                                        onSave={(value) =>
                                            handleUpdate(person.name, "status", value)
                                        }
                                        getStatusColor={getStatusColor}
                                    />
                                </td>
                                <td className="p-1.5">
                                    <EditableDate
                                        value={person.start_date}
                                        onSave={(value) =>
                                            handleUpdate(person.name, "start_date", value)
                                        }
                                        formatDate={formatDate}
                                    />
                                </td>
                                <td className="p-1.5">
                                    <EditableText
                                        value={person.how_we_met || person.meeting_place}
                                        onSave={(value) =>
                                            handleUpdate(person.name, "how_we_met", value)
                                        }
                                        placeholder="—"
                                    />
                                </td>
                                <td className="p-1.5">
                                    <DatesManager
                                        dates={person.dates || []}
                                        onSave={(entries) => handleDatesUpdate(person.name, entries)}
                                        formatDate={formatDate}
                                    />
                                </td>
                                <td className="p-1.5 text-muted-foreground max-w-xs">
                                    <div className="truncate" title={person.details || "—"}>
                                        {person.details || "—"}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

