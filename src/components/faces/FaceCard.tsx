"use client";

import { useState, useMemo } from "react";
import { Person } from "@/lib/types";

interface FaceCardProps {
    person: Person;
    dateCount?: number;
    onClick?: () => void;
    className?: string;
}

export function FaceCard({ person, dateCount = 0, onClick, className = "" }: FaceCardProps) {
    const [imageError, setImageError] = useState(false);
    
    // Generate a stable random rotation between -3 and 3 degrees based on the name
    const rotation = useMemo(() => {
        let hash = 0;
        const str = person.name || "default";
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        // Use absolute value and modulo to get 0-6, then subtract 3 for range -3 to 3
        const absHash = Math.abs(hash);
        return (absHash % 7) - 3;
    }, [person.name]);

    const photoUrl = person.photo_url;
    const personName = person.name || "Unknown";
    const showPhoto = photoUrl && !imageError;

    return (
        <div
            onClick={onClick}
            style={{ 
                transform: `rotate(${rotation}deg)`,
                boxShadow: "0 4px 14px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1)",
                border: "1px solid #e4e4e7",
            }}
            className={`
                relative
                bg-white
                text-zinc-800
                hover:scale-[1.02] hover:z-50
                transition-all duration-300
                p-2
                flex flex-col
                cursor-pointer
                w-full
                overflow-hidden
                ${className}
            `}
        >
            {/* Photo Area - Always Square */}
            <div 
                style={{
                    aspectRatio: "1 / 1",
                    width: "100%",
                    position: "relative",
                    overflow: "hidden",
                    backgroundColor: "#f4f4f5",
                    flexShrink: 0,
                }}
            >
                {showPhoto ? (
                    <img
                        src={photoUrl}
                        alt={personName}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                        className="filter sepia-[.15] contrast-[1.05] brightness-[1.05] hover:sepia-0 transition-all duration-500"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div 
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#fafafa",
                        }}
                    >
                        <span className="text-3xl font-serif italic text-zinc-300">
                            {personName.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}

                {/* Name Overlay - Bottom of photo */}
                <div 
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: "16px 8px 6px 8px",
                        background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
                    }}
                >
                    <div className="text-white font-serif font-bold text-xs drop-shadow-md truncate text-center">
                        {personName}
                    </div>
                </div>
            </div>

            {/* Metadata Area - Polaroid Chin */}
            <div 
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: "6px",
                    paddingBottom: "4px",
                    minHeight: "20px",
                    overflow: "hidden",
                }}
            >
                <div className="flex items-center justify-center text-[7px] text-zinc-400 font-medium uppercase tracking-wider leading-none gap-1.5 w-full">
                    <span>{dateCount} {dateCount === 1 ? "date" : "dates"}</span>
                </div>
            </div>
            
            {/* Tape effect decoration */}
            <div 
                style={{
                    position: "absolute",
                    top: "-6px",
                    left: "50%",
                    transform: "translateX(-50%) rotate(-2deg)",
                    width: "24px",
                    height: "12px",
                    backgroundColor: "rgba(255,255,255,0.5)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                }}
            />
        </div>
    );
}

