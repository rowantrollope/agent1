"use client";

import { Header } from "@/components/Header";
import { CalendarPage } from "@/components/calendar/CalendarPage";

export default function Calendar() {
    return (
        <div className="min-h-screen bg-background flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1">
                <CalendarPage />
            </main>
        </div>
    );
}

