"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateLogEntry, Person } from "@/lib/types";
import { DateCard } from "./DateCard";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

interface CalendarDate extends DateLogEntry {
  id: string;
  person_name: string;
  completed: boolean;
}

interface DatingCalendarProps {
  dates: CalendarDate[];
  people: Person[];
  onDateClick: (date: CalendarDate) => void;
  onDateUpdated: () => void;
}

export function DatingCalendar({
  dates,
  people,
  onDateClick,
  onDateUpdated,
}: DatingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const monthStart = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  }, [currentMonth]);

  const monthEnd = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  }, [currentMonth]);

  const daysInMonth = monthEnd.getDate();
  const firstDayOfWeek = monthStart.getDay();

  const datesByDay = useMemo(() => {
    const map = new Map<number, CalendarDate[]>();
    dates.forEach((date) => {
      try {
        const dateObj = new Date(date.when);
        if (isNaN(dateObj.getTime())) {
          return; // Skip invalid dates
        }
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
      } catch (e) {
        console.error("Error parsing date:", date.when, e);
        // Skip invalid dates
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

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const peopleMap = useMemo(() => {
    const map = new Map<string, Person>();
    people.forEach((person) => {
      map.set(person.name, person);
    });
    return map;
  }, [people]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const dateId = active.id as string;
    const targetDay = over.id as string;

    // Extract day number from targetDay (format: "day-{number}")
    if (!targetDay.startsWith("day-")) return;

    const dayNumber = parseInt(targetDay.replace("day-", ""), 10);
    if (isNaN(dayNumber)) return;

    // Find the date being dragged
    const draggedDate = dates.find((d) => d.id === dateId);
    if (!draggedDate) return;

    // Create new date with updated day
    const newDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      dayNumber
    );

    // Preserve the time from the original date
    const originalDate = new Date(draggedDate.when);
    newDate.setHours(originalDate.getHours());
    newDate.setMinutes(originalDate.getMinutes());
    newDate.setSeconds(originalDate.getSeconds());

    const isoString = newDate.toISOString();

    // Update the date via API
    try {
      const response = await fetch(`/api/calendar/dates/${dateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          when: isoString,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onDateUpdated();
      }
    } catch (error) {
      console.error("Failed to update date:", error);
    }
  };

  const activeDate = activeId ? dates.find((d) => d.id === activeId) : null;
  const activePerson = activeDate
    ? peopleMap.get(activeDate.person_name)
    : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
          <div key={`empty-${idx}`} className="bg-background min-h-[120px]" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const dayDates = datesByDay.get(day) || [];
          const dayDate = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day
          );
          const isToday =
            dayDate.toDateString() === new Date().toDateString();

          const dayId = `day-${day}`;

          return (
            <DroppableDay
              key={day}
              dayId={dayId}
              day={day}
              isToday={isToday}
            >
              {dayDates.map((date) => {
                const person = peopleMap.get(date.person_name);
                return (
                  <DraggableDateCard
                    key={date.id}
                    date={date}
                    person={person}
                    onClick={() => onDateClick(date)}
                    className="text-xs"
                  />
                );
              })}
            </DroppableDay>
          );
        })}
      </div>

      <DragOverlay>
        {activeDate && activePerson ? (
          <div className="opacity-50">
            <DateCard
              date={activeDate}
              person={activePerson}
              className="text-xs"
            />
          </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
  );
}

// Droppable wrapper for calendar day cells
function DroppableDay({
  dayId,
  day,
  isToday,
  children,
}: {
  dayId: string;
  day: number;
  isToday: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dayId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        bg-background min-h-[120px] border-t border-l p-2 space-y-1
        ${isToday ? "bg-primary/5" : ""}
        ${isOver ? "bg-primary/10 border-primary" : ""}
      `}
    >
      <div
        className={`
          text-sm font-medium mb-1
          ${isToday ? "text-primary font-bold" : ""}
        `}
      >
        {day}
      </div>
      {children}
    </div>
  );
}

// Draggable wrapper for DateCard
function DraggableDateCard({
  date,
  person,
  onClick,
  className,
}: {
  date: CalendarDate;
  person?: Person;
  onClick?: () => void;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: date.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? "opacity-50" : ""}
    >
      <DateCard
        date={date}
        person={person}
        onClick={onClick}
        className={className}
      />
    </div>
  );
}

