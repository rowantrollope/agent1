import { NextResponse } from "next/server";

const PYTHON_BACKEND_URL =
    process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json();
        const { id } = await params;

        const response = await fetch(`${PYTHON_BACKEND_URL}/calendar/dates/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                where: body.where,
                when: body.when,
                notes: body.notes,
                learnings: body.learnings,
                completed: body.completed,
            }),
        });

        if (!response.ok) {
            const errorData = await response
                .json()
                .catch(() => ({ detail: "Unknown error" }));
            throw new Error(errorData.detail || `Backend error ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error updating calendar date:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to update calendar date",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const response = await fetch(`${PYTHON_BACKEND_URL}/calendar/dates/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            const errorData = await response
                .json()
                .catch(() => ({ detail: "Unknown error" }));
            throw new Error(errorData.detail || `Backend error ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error deleting calendar date:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to delete calendar date",
            },
            { status: 500 }
        );
    }
}

