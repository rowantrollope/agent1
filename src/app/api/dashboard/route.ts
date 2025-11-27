import { NextResponse } from 'next/server';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function GET() {
  try {
    // Call the Python backend to get dashboard data
    // The backend will use MCP tools to fetch the data
    const response = await fetch(`${PYTHON_BACKEND_URL}/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        statistics: {
          total_people: 0,
          active_count: 0,
          not_pursuing_count: 0,
          paused_count: 0,
          exploring_count: 0,
        },
        activePeople: [],
        analytics: {
          dates_per_person: [],
          date_locations: [],
          dates_by_month: [],
          relationship_durations: [],
          date_frequency_distribution: [],
        },
      },
      { status: 500 }
    );
  }
}


