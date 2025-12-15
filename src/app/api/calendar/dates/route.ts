import { NextResponse } from "next/server";

const PYTHON_BACKEND_URL =
    process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const personName = searchParams.get("person_name");
        const activeOnly = searchParams.get("active_only") === "true";
        const completed = searchParams.get("completed");

        const params = new URLSearchParams();
        if (personName) params.append("person_name", personName);
        if (activeOnly) params.append("active_only", "true");
        if (completed !== null) params.append("completed", completed);

        const response = await fetch(
            `${PYTHON_BACKEND_URL}/calendar/dates?${params.toString()}`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }
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
        console.error("Error fetching calendar dates:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch calendar dates",
            },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body?.person_name?.trim()) {
            return NextResponse.json(
                { success: false, error: "Person name is required" },
                { status: 400 }
            );
        }

        if (!body?.where?.trim()) {
            return NextResponse.json(
                { success: false, error: "Location is required" },
                { status: 400 }
            );
        }

        if (!body?.when?.trim()) {
            return NextResponse.json(
                { success: false, error: "Date and time are required" },
                { status: 400 }
            );
        }

        const response = await fetch(`${PYTHON_BACKEND_URL}/calendar/dates`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                person_name: body.person_name.trim(),
                where: body.where.trim(),
                when: body.when.trim(),
                notes: body.notes || "",
                learnings: body.learnings || "",
                completed: body.completed ?? false,
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
        console.error("Error creating calendar date:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to create calendar date",
            },
            { status: 500 }
        );
    }
}

