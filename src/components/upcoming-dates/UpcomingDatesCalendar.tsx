"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpcomingDate } from "@/lib/types";
import { EditDateModal } from "./EditDateModal";

interface UpcomingDatesCalendarProps {
    dates: UpcomingDate[];
    onDateUpdated: () => void;
}

export function UpcomingDatesCalendar({
    dates,
    onDateUpdated,
}: UpcomingDatesCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<UpcomingDate | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const monthStart = useMemo(() => {
        return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    }, [currentMonth]);

    const monthEnd = useMemo(() => {
        return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    }, [currentMonth]);

    const daysInMonth = monthEnd.getDate();
    const firstDayOfWeek = monthStart.getDay();

    const datesByDay = useMemo(() => {
        const map = new Map<number, UpcomingDate[]>();
        dates.forEach((date) => {
            const dateObj = new Date(date.when);
            if (
                dateObj.getMonth() === currentMonth.getMonth() &&
                dateObj.getFullYear() === currentMonth.getFullYear()
            ) {
                const day = dateObj.getDate();
                if (!map.has(day)) {
                    map.set(day, []);
                }
                map.get(day)!.push(date);
            }
        });
        return map;
    }, [dates, currentMonth]);

    const navigateMonth = (direction: "prev" | "next") => {
        setCurrentMonth((prev) => {
            const newDate = new Date(prev);
            if (direction === "prev") {
                newDate.setMonth(prev.getMonth() - 1);
            } else {
                newDate.setMonth(prev.getMonth() + 1);
            }
            return newDate;
        });
    };

    const handleDateClick = (date: UpcomingDate) => {
        setSelectedDate(date);
        setShowEditModal(true);
    };

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <>
            <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 border-b p-4 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateMonth("prev")}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold">
                        {currentMonth.toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                        })}
                    </h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateMonth("next")}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-7 gap-px bg-border">
                    {weekDays.map((day) => (
                        <div
                            key={day}
                            className="bg-muted/30 p-2 text-center text-sm font-medium"
                        >
                            {day}
                        </div>
                    ))}

                    {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="bg-background min-h-[100px]" />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                        const day = idx + 1;
                        const dayDates = datesByDay.get(day) || [];

                        return (
                            <div
                                key={day}
                                className="bg-background min-h-[100px] border-t border-l p-2 space-y-1"
                            >
                                <div className="text-sm font-medium mb-1">{day}</div>
                                {dayDates.map((date) => (
                                    <button
                                        key={date.id}
                                        onClick={() => handleDateClick(date)}
                                        className="w-full text-left p-2 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/20 text-xs space-y-1 transition-colors"
                                    >
                                        <div className="font-semibold truncate">{date.person_name}</div>
                                        {date.where && (
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <MapPin className="h-3 w-3" />
                                                <span className="truncate">{date.where}</span>
                                            </div>
                                        )}
                                        <div className="text-muted-foreground">
                                            {new Date(date.when).toLocaleTimeString("en-US", {
                                                hour: "numeric",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {showEditModal && selectedDate && (
                <EditDateModal
                    date={selectedDate}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedDate(null);
                    }}
                    onDateUpdated={onDateUpdated}
                />
            )}
        </>
    );
}



