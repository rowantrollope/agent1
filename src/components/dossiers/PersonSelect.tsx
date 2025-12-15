"use client";

import * as React from "react";
import {
    ChevronDown,
    Search,
    Check,
    X,
    Activity,
    PauseCircle,
    Archive,
    HelpCircle,
    Scan
} from "lucide-react";
import { Person } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PersonSelectProps = {
    people: Person[];
    value?: string;
    onChange: (name: string) => void;
    placeholder?: string;
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; order: number }> = {
    active: { color: 'text-emerald-600', icon: Activity, order: 0 },
    exploring: { color: 'text-cyan-600', icon: Scan, order: 1 },
    paused: { color: 'text-amber-600', icon: PauseCircle, order: 2 },
    not_pursuing: { color: 'text-slate-400', icon: Archive, order: 3 },
    past: { color: 'text-indigo-600', icon: Archive, order: 4 },
    unknown: { color: 'text-fuchsia-600', icon: HelpCircle, order: 99 },
};

const getInitials = (name?: string) => {
    if (!name) return "??";
    const parts = name.split(" ").filter(Boolean);
    if (!parts.length) return name.slice(0, 2).toUpperCase();
    const [first, second] = parts;
    return (first[0] + (second?.[0] || first[1] || "")).toUpperCase();
};

const getStatusKey = (status?: string): string => {
    if (!status) return 'unknown';
    return STATUS_CONFIG[status] ? status : 'unknown';
};

function Avatar({ person, size = 'md', className }: { person?: Person; size?: 'sm' | 'md' | 'lg'; className?: string }) {
    const initials = React.useMemo(() => getInitials(person?.name), [person?.name]);

    const sizeClasses = {
        sm: "h-8 w-8 text-[10px]",
        md: "h-10 w-10 text-xs",
        lg: "h-12 w-12 text-sm",
    };

    return (
        <div className={cn(
            "relative overflow-hidden rounded-full bg-slate-100 ring-1 ring-black/5 flex items-center justify-center font-mono font-bold tracking-wider text-slate-600 shadow-sm",
            sizeClasses[size],
            className
        )}>
            {person?.photo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                    src={person.photo_url}
                    alt={person.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="bg-gradient-to-br from-slate-200 to-slate-300 w-full h-full flex items-center justify-center">
                    {initials}
                </div>
            )}

            {/* Status Indicator Dot */}
            {person?.status && (
                <div className={cn(
                    "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white",
                    person.status === 'active' ? "bg-emerald-500" :
                    person.status === 'exploring' ? "bg-cyan-500" :
                    person.status === 'paused' ? "bg-amber-500" :
                    "bg-slate-400"
                )} />
            )}
        </div>
    );
}

export function PersonSelect({
    people,
    value,
    onChange,
    placeholder = "Select Subject",
}: PersonSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    // Filter and group people
    const filteredAndGrouped = React.useMemo(() => {
        const query = search.toLowerCase().trim();
        const filtered = !query
            ? people
            : people.filter(p => p.name.toLowerCase().includes(query));

        const groups: Record<string, Person[]> = {};
        filtered.forEach(p => {
            const key = getStatusKey(p.status);
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });

        // Sort people within each group
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => a.name.localeCompare(b.name));
        });

        return groups;
    }, [people, search]);

    const selectedPerson = React.useMemo(
        () => people.find(p => p.name === value),
        [people, value]
    );

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch("");
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleSelect = (name: string) => {
        onChange(name);
        setIsOpen(false);
        setSearch("");
    };


    return (
        <div className="relative z-50" ref={wrapperRef}>

            {/* Trigger Button */}
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={isOpen}
                className={cn(
                    "group relative flex w-full min-w-[280px] items-center justify-between overflow-hidden rounded-2xl border bg-white p-1.5 pr-4 text-left transition-all duration-300 ease-out h-auto",
                    isOpen
                        ? "border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.15)] ring-1 ring-fuchsia-500/20"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-md shadow-sm"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <Avatar person={selectedPerson} size="md" />
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-sm font-bold tracking-tight text-slate-900 group-hover:text-fuchsia-900 transition-colors",
                            !selectedPerson && "text-slate-400 font-normal"
                        )}>
                            {selectedPerson?.name || placeholder}
                        </span>
                    </div>
                </div>

                <ChevronDown className={cn(
                    "h-4 w-4 text-slate-400 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </Button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-[380px] origin-top-right animate-in fade-in zoom-in-95 duration-200">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.3)] ring-1 ring-black/5 backdrop-blur-xl max-h-96">

                        {/* Search Header */}
                        <div className="relative border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                            <div className="relative flex items-center gap-3">
                                <Search className="h-4 w-4 text-slate-400" />
                                <Input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search database..."
                                    className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-sm text-slate-900 placeholder:text-slate-400 font-mono h-8 px-0"
                                    autoFocus
                                />
                                {search && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                                        onClick={() => setSearch("")}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Options List */}
                        <div className="overflow-y-auto max-h-80">
                            {Object.keys(STATUS_CONFIG)
                                .sort((a, b) => STATUS_CONFIG[a].order - STATUS_CONFIG[b].order)
                                .map(statusKey => {
                                    const groupPeople = filteredAndGrouped[statusKey];
                                    if (!groupPeople || groupPeople.length === 0) return null;

                                    return (
                                        <div key={statusKey}>
                                            {/* Group Items */}
                                            {groupPeople.map((person) => {
                                                const isSelected = person.name === value;
                                                return (
                                                    <Button
                                                        key={person.name}
                                                        variant="ghost"
                                                        className={cn(
                                                            "w-full flex items-center gap-4 px-4 py-3 text-left justify-start h-auto",
                                                            isSelected ? "bg-fuchsia-50" : "hover:bg-slate-50"
                                                        )}
                                                        onClick={() => handleSelect(person.name)}
                                                    >
                                                        <Avatar
                                                            person={person}
                                                            size="sm"
                                                            className={cn("ring-2", isSelected ? "ring-fuchsia-500" : "ring-slate-100")}
                                                        />

                                                        <div className="flex-1 min-w-0 text-left">
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    "truncate text-sm font-medium transition-colors",
                                                                    isSelected ? "text-fuchsia-700" : "text-slate-700"
                                                                )}>
                                                                    {person.name}
                                                                </span>
                                                            </div>
                                                            {person.how_we_met && (
                                                                <div className="text-[10px] text-slate-500 truncate uppercase tracking-wider opacity-70">
                                                                    Via {person.how_we_met}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {isSelected && (
                                                            <Check className="h-4 w-4 text-fuchsia-600" />
                                                        )}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    );
                                })}

                            {Object.keys(filteredAndGrouped).length === 0 && (
                                <div className="flex items-center justify-center py-8 text-slate-400">
                                    <div className="text-center">
                                        <Search className="mx-auto h-8 w-8 opacity-20 mb-2" />
                                        <p className="text-xs uppercase tracking-widest">No Intelligence Found</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
