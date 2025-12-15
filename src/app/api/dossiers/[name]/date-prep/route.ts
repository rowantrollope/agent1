import { NextResponse } from "next/server";

const PYTHON_BACKEND_URL =
    process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ name: string }> },
) {
    try {
        const { name } = await params;
        const encodedName = encodeURIComponent(name);
        const response = await fetch(
            `${PYTHON_BACKEND_URL}/dossiers/${encodedName}/date-prep`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
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
        console.error("Error fetching date prep:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to load date prep",
            },
            { status: 500 },
        );
    }
}






