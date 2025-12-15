import { NextResponse } from "next/server";

const PYTHON_BACKEND_URL =
    process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ name: string }> },
) {
    try {
        const body = await request.json();
        const { name } = await params;

        if (!body?.where?.trim()) {
            return NextResponse.json(
                { success: false, error: "Location is required" },
                { status: 400 },
            );
        }

        if (!body?.when?.trim()) {
            return NextResponse.json(
                { success: false, error: "Date and time are required" },
                { status: 400 },
            );
        }

        const encodedName = encodeURIComponent(name);
        const response = await fetch(
            `${PYTHON_BACKEND_URL}/dossiers/${encodedName}/dates`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    where: body.where.trim(),
                    when: body.when.trim(),
                    notes: body.notes || "",
                    learnings: body.learnings || "",
                }),
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
        console.error("Error adding date:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to add date",
            },
            { status: 500 },
        );
    }
}
