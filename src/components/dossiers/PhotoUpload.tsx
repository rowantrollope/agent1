"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
    personName: string;
    currentPhotoUrl?: string;
    onUploadComplete?: (photoUrl: string) => void;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function PhotoUpload({
    personName,
    currentPhotoUrl,
    onUploadComplete,
    size = "md",
    className,
}: PhotoUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync preview with currentPhotoUrl prop when it changes
    useEffect(() => {
        if (currentPhotoUrl !== undefined) {
            setPreview(currentPhotoUrl || null);
        }
    }, [currentPhotoUrl]);

    const sizeClasses = {
        sm: "w-16 h-16",
        md: "w-32 h-32",
        lg: "w-48 h-48",
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            setError("Please select an image file");
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setError("File size must be less than 5MB");
            return;
        }

        setError(null);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload file
        handleUpload(file);
    };

    const handleUpload = async (file: File) => {
        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("photo", file);

            const response = await fetch(
                `/api/dossiers/${encodeURIComponent(personName)}/photo`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to upload photo");
            }

            setPreview(data.photo_url);
            // Wait a moment for the update to be committed before refreshing
            setTimeout(() => {
                if (onUploadComplete) {
                    onUploadComplete(data.photo_url);
                }
            }, 100);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to upload photo");
            // Reset preview on error
            setPreview(currentPhotoUrl || null);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async () => {
        setUploading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/dashboard/update-person`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: personName,
                        photo_url: "",
                    }),
                }
            );

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to remove photo");
            }

            setPreview(null);
            if (onUploadComplete) {
                onUploadComplete("");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to remove photo");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={cn("flex flex-col items-center gap-3", className)}>
            <div className="relative">
                <div
                    className={cn(
                        "relative rounded-full border-2 border-slate-300 bg-slate-100 overflow-hidden cursor-pointer transition-all hover:border-slate-400 hover:scale-105",
                        sizeClasses[size],
                        uploading && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && !uploading) {
                            e.preventDefault();
                            fileInputRef.current?.click();
                        }
                    }}
                    aria-label={preview ? "Change photo" : "Upload photo"}
                >
                    {preview ? (
                        <img
                            src={preview}
                            alt={personName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-1/3 h-1/3 text-slate-500" />
                        </div>
                    )}
                    {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
                        </div>
                    )}
                    {!uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/0 hover:bg-white/60 transition-colors">
                            <Upload className="w-6 h-6 text-slate-700 opacity-0 hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                </div>
                {preview && !uploading && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemove();
                        }}
                        className="absolute -top-1 -right-1 rounded-full bg-red-500 p-1.5 hover:bg-red-600 transition-colors z-10"
                        type="button"
                        aria-label="Remove photo"
                    >
                        <X className="w-3 h-3 text-white" />
                    </button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
            />

            {error && (
                <p className="text-xs text-red-400 text-center max-w-xs">{error}</p>
            )}
        </div>
    );
}

