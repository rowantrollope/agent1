"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, List, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateLogEntry, Person } from "@/lib/types";
import { DatingCalendar } from "./DatingCalendar";
import { DatingCalendarList } from "./DatingCalendarList";
import { CreateDateModal } from "./CreateDateModal";
import { DateDetailsModal } from "./DateDetailsModal";

type ViewMode = "calendar" | "list";
type FilterMode = "all" | "active" | string; // string is person name

interface CalendarDate extends DateLogEntry {
    id: string;
    person_name: string;
    completed: boolean;
}

export function CalendarPage() {
    const [viewMode, setViewMode] = useState<ViewMode>("calendar");
    const [filterMode, setFilterMode] = useState<FilterMode>("all");
    const [dates, setDates] = useState<CalendarDate[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<CalendarDate | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const fetchDates = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filterMode === "active") {
                params.append("active_only", "true");
            } else if (filterMode !== "all") {
                params.append("person_name", filterMode);
            }

            const response = await fetch(`/api/calendar/dates?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                const datesList: CalendarDate[] = (data.data || []).map((date: any) => ({
                    ...date,
                    id: date.id || crypto.randomUUID(),
                    person_name: date.person_name || "",
                    completed: date.completed ?? false,
                }));
                setDates(datesList);
            } else {
                setError(data.error || "Failed to load dates");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load dates");
        } finally {
            setIsLoading(false);
        }
    }, [filterMode]);

    const fetchPeople = useCallback(async () => {
        try {
            const response = await fetch("/api/dossiers");
            const data = await response.json();
            if (data.success) {
                setPeople(data.people || []);
            }
        } catch (err) {
            console.error("Failed to load people:", err);
        }
    }, []);

    useEffect(() => {
        fetchPeople();
    }, [fetchPeople]);

    useEffect(() => {
        fetchDates();
    }, [fetchDates]);

    const handleDateClick = (date: CalendarDate) => {
        setSelectedDate(date);
        setShowDetailsModal(true);
    };

    const handleDateUpdated = () => {
        fetchDates();
    };

    const handleDateCreated = () => {
        fetchDates();
    };

    const activePeople = (people || []).filter((p) => p.status === "active");

    return (
        <div className="container mx-auto px-4 py-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Dating Calendar</h1>
                <Button onClick={() => setShowCreateModal(true)}>
                    Create Date
                </Button>
            </div>

            {/* View Toggle and Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 border rounded-lg p-1">
                    <Button
                        variant={viewMode === "calendar" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("calendar")}
                    >
                        <Calendar className="h-4 w-4 mr-2" />
                        Calendar
                    </Button>
                    <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                    >
                        <List className="h-4 w-4 mr-2" />
                        List
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                        value={filterMode}
                        onChange={(e) => setFilterMode(e.target.value)}
                        className="rounded-md border bg-background px-3 py-1.5 text-sm"
                    >
                        <option value="all">All Dates</option>
                        <option value="active">Active People Only</option>
                        {activePeople.map((person) => (
                            <option key={person.name} value={person.name}>
                                {person.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Loading dates...</p>
                </div>
            ) : (
                <>
                    {viewMode === "calendar" ? (
                        <DatingCalendar
                            dates={dates || []}
                            people={people || []}
                            onDateClick={handleDateClick}
                            onDateUpdated={handleDateUpdated}
                        />
                    ) : (
                        <DatingCalendarList
                            dates={dates || []}
                            people={people || []}
                            onDateClick={handleDateClick}
                            onDateUpdated={handleDateUpdated}
                        />
                    )}
                </>
            )}

            {showCreateModal && (
                <CreateDateModal
                    people={activePeople}
                    onClose={() => setShowCreateModal(false)}
                    onDateCreated={handleDateCreated}
                />
            )}

            {showDetailsModal && selectedDate && (
                <DateDetailsModal
                    date={selectedDate}
                    people={people}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedDate(null);
                    }}
                    onDateUpdated={handleDateUpdated}
                />
            )}
        </div>
    );
}

