import { NextResponse } from "next/server";

const PYTHON_BACKEND_URL =
    process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ name: string }> },
) {
    try {
        const body = await request.json();
        if (!body?.message) {
            return NextResponse.json(
                { success: false, error: "Message is required" },
                { status: 400 },
            );
        }

        const { name } = await params;
        const encodedName = encodeURIComponent(name);
        const response = await fetch(
            `${PYTHON_BACKEND_URL}/dossiers/${encodedName}/chat`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            },
        );

        if (!response.ok) {
            const errorData = await response
                .json()
                .catch(() => ({ detail: "Unknown error" }));
            throw new Error(errorData.detail || `Backend error ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error sending dossier chat:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to process chat update",
            },
            { status: 500 },
        );
    }
}






