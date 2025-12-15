"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Person, AnalyticsData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Playfair_Display, Inter } from "next/font/google";
import { FaceCard } from "./FaceCard";

const playfair = Playfair_Display({
    subsets: ["latin"],
    weight: ["400", "600", "700"],
    variable: "--font-face-display",
});

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-face-body",
});

interface GroupedPeople {
    [key: string]: Person[];
}

const statusLabels: Record<string, string> = {
    active: "Active Dating",
    exploring: "Exploring",
    paused: "Paused",
    not_pursuing: "Not Pursuing",
    past: "Past",
};

const statusOrder = ["active", "exploring", "paused", "not_pursuing", "past"];

const FACE_SIZE_STORAGE_KEY = "face-view-size";
const MIN_COLUMNS = 3;
const MAX_COLUMNS = 12;
const DEFAULT_COLUMNS = 6;

export function FaceViewPage() {
    const [people, setPeople] = useState<Person[]>([]);
    const [dateCountMap, setDateCountMap] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [columns, setColumns] = useState(DEFAULT_COLUMNS);
    const [windowWidth, setWindowWidth] = useState(0);
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load saved preference
        const savedSize = localStorage.getItem(FACE_SIZE_STORAGE_KEY);
        if (savedSize) {
            const parsed = parseInt(savedSize, 10);
            if (parsed >= MIN_COLUMNS && parsed <= MAX_COLUMNS) {
                setColumns(parsed);
            }
        }
        fetchData();
    }, []);

    // Recalculate size on window resize
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWindowWidth(window.innerWidth);
            const handleResize = () => {
                setWindowWidth(window.innerWidth);
            };
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch both people and dashboard data in parallel
            const [peopleRes, dashboardRes] = await Promise.all([
                fetch("/api/dossiers"),
                fetch("/api/dashboard"),
            ]);
            
            const peopleData = await peopleRes.json();
            const dashboardData = await dashboardRes.json();
            
            if (peopleData.success) {
                setPeople(peopleData.people || []);
            } else {
                setError(peopleData.error || "Unable to load people");
            }
            
            // Build a map of name -> date count from analytics
            if (dashboardData.analytics?.dates_per_person) {
                const countMap = new Map<string, number>();
                dashboardData.analytics.dates_per_person.forEach((item: { name: string; count: number }) => {
                    countMap.set(item.name, item.count);
                });
                setDateCountMap(countMap);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load people");
        } finally {
            setLoading(false);
        }
    };

    const groupedPeople = useMemo(() => {
        // First, separate people with photos from those without
        const withPhotos: Person[] = [];
        const withoutPhotos: Person[] = [];

        people.forEach((person) => {
            if (person.photo_url) {
                withPhotos.push(person);
            } else {
                withoutPhotos.push(person);
            }
        });

        // Group by status
        const groupByStatus = (peopleList: Person[]): GroupedPeople => {
            const grouped: GroupedPeople = {};
            peopleList.forEach((person) => {
                const status = person.status || "not_pursuing";
                if (!grouped[status]) {
                    grouped[status] = [];
                }
                grouped[status].push(person);
            });
            return grouped;
        };

        const withPhotosGrouped = groupByStatus(withPhotos);
        const withoutPhotosGrouped = groupByStatus(withoutPhotos);

        return { withPhotosGrouped, withoutPhotosGrouped };
    }, [people]);

    const handleFaceClick = (person: Person) => {
        router.push(`/dossiers?name=${encodeURIComponent(person.name)}`);
    };

    const handleSizeChange = (newColumns: number) => {
        setColumns(newColumns);
        localStorage.setItem(FACE_SIZE_STORAGE_KEY, newColumns.toString());
    };

    const renderSection = (
        title: string,
        peopleList: Person[],
        key: string
    ) => {
        if (peopleList.length === 0) return null;

        return (
            <div key={key} className="space-y-6">
                <h2 className={cn(
                    "text-2xl font-bold text-slate-800 tracking-tight",
                    playfair.variable,
                    "font-[family-name:var(--font-face-display)]"
                )}>
                    {title}
                </h2>
                <div 
                    className="grid gap-6 p-4"
                    style={{
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                        transition: "grid-template-columns 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                >
                    {peopleList.map((person, index) => (
                        <FaceCard
                            key={`${person.name}-${index}`}
                            person={person}
                            dateCount={dateCountMap.get(person.name) || 0}
                            onClick={() => handleFaceClick(person)}
                        />
                    ))}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-600">Loading faces...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={fetchPeople}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50",
            playfair.variable,
            inter.variable
        )}>
            <div ref={containerRef} className="container mx-auto px-4 py-12 max-w-7xl">
                <div className="mb-12">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                            <ZoomOut className="h-5 w-5 text-slate-400" />
                            <div className="flex flex-col items-center gap-2 min-w-[200px]">
                                <input
                                    type="range"
                                    min={MIN_COLUMNS}
                                    max={MAX_COLUMNS}
                                    value={columns}
                                    onChange={(e) => handleSizeChange(parseInt(e.target.value, 10))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600 hover:accent-slate-700 transition-colors"
                                    style={{
                                        background: `linear-gradient(to right, rgb(71, 85, 105) 0%, rgb(71, 85, 105) ${((columns - MIN_COLUMNS) / (MAX_COLUMNS - MIN_COLUMNS)) * 100}%, rgb(226, 232, 240) ${((columns - MIN_COLUMNS) / (MAX_COLUMNS - MIN_COLUMNS)) * 100}%, rgb(226, 232, 240) 100%)`,
                                    }}
                                />
                                <span className={cn(
                                    "text-sm text-slate-600 font-medium",
                                    inter.variable,
                                    "font-[family-name:var(--font-face-body)]"
                                )}>
                                    {columns} per row
                                </span>
                            </div>
                            <ZoomIn className="h-5 w-5 text-slate-400" />
                        </div>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* People with photos, grouped by status */}
                    {statusOrder.map((status) => {
                        const peopleWithPhotos = groupedPeople.withPhotosGrouped[status] || [];
                        if (peopleWithPhotos.length === 0) return null;
                        return renderSection(
                            statusLabels[status] || status,
                            peopleWithPhotos,
                            `with-photos-${status}`
                        );
                    })}

                    {/* People without photos, grouped by status */}
                    {statusOrder.map((status) => {
                        const peopleWithoutPhotos = groupedPeople.withoutPhotosGrouped[status] || [];
                        if (peopleWithoutPhotos.length === 0) return null;
                        return renderSection(
                            `${statusLabels[status] || status} (No Photo)`,
                            peopleWithoutPhotos,
                            `without-photos-${status}`
                        );
                    })}
                </div>

                {people.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-slate-500 text-lg">No people found in the database.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
