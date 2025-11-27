"use client";

import { useMemo } from "react";
import { CheckCircle2, MapPin, Clock } from "lucide-react";
import { DateLogEntry, Person } from "@/lib/types";

interface CalendarDate extends DateLogEntry {
  id: string;
  person_name: string;
  completed: boolean;
}

interface DatingCalendarListProps {
  dates: CalendarDate[];
  people: Person[];
  onDateClick: (date: CalendarDate) => void;
  onDateUpdated: () => void;
}

export function DatingCalendarList({
  dates,
  people,
  onDateClick,
}: DatingCalendarListProps) {
  const peopleMap = useMemo(() => {
    const map = new Map<string, Person>();
    people.forEach((person) => {
      map.set(person.name, person);
    });
    return map;
  }, [people]);

  const groupedDates = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const sorted = [...dates].sort((a, b) => {
      try {
        const aTime = new Date(a.when).getTime();
        const bTime = new Date(b.when).getTime();
        if (isNaN(aTime) || isNaN(bTime)) {
          return 0;
        }
        return aTime - bTime;
      } catch {
        return 0;
      }
    });

    const groups: {
      label: string;
      dates: CalendarDate[];
    }[] = [
      { label: "Past", dates: [] },
      { label: "Today", dates: [] },
      { label: "Tomorrow", dates: [] },
      { label: "This Week", dates: [] },
      { label: "Later", dates: [] },
    ];

    sorted.forEach((date) => {
      try {
        const dateObj = new Date(date.when);
        if (isNaN(dateObj.getTime())) {
          return;
        }
        const dateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

        if (dateOnly < today) {
          groups[0].dates.push(date);
        } else if (dateOnly.getTime() === today.getTime()) {
          groups[1].dates.push(date);
        } else if (dateOnly.getTime() === tomorrow.getTime()) {
          groups[2].dates.push(date);
        } else if (dateOnly <= nextWeek) {
          groups[3].dates.push(date);
        } else {
          groups[4].dates.push(date);
        }
      } catch (e) {
        console.error("Error parsing date:", date.when, e);
      }
    });

    return groups.filter((group) => group.dates.length > 0);
  }, [dates]);

  const formatDateTime = (when: string) => {
    try {
      const dateObj = new Date(when);
      if (isNaN(dateObj.getTime())) {
        return { date: "Invalid", time: "" };
      }
      const date = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const time = dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      return { date, time };
    } catch {
      return { date: "Invalid", time: "" };
    }
  };

  if (dates.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">No dates found. Create your first date!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedDates.map((group) => (
        <div key={group.label} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {group.label}
          </h3>
          <div className="border rounded-lg divide-y">
            {group.dates.map((date) => {
              const person = peopleMap.get(date.person_name);
              const { date: dateStr, time } = formatDateTime(date.when);
              
              return (
                <div
                  key={date.id}
                  onClick={() => onDateClick(date)}
                  className={`
                    flex items-center gap-4 px-4 py-3 cursor-pointer
                    hover:bg-muted/50 transition-colors
                    ${date.completed ? "bg-green-50/70 dark:bg-green-950/30 border-green-200 dark:border-green-800 border-l-4" : ""}
                  `}
                >
                  {/* Photo thumbnail */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {person?.photo_url ? (
                      <img
                        src={person.photo_url}
                        alt={date.person_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-medium">
                        {date.person_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {date.person_name}
                      </span>
                      {date.completed && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {dateStr} at {time}
                      </span>
                      {date.where && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{date.where}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
