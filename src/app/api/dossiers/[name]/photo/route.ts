import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    try {
        const { name } = await params;
        const personName = decodeURIComponent(name);
        
        if (!personName) {
            return NextResponse.json(
                { success: false, error: 'Person name is required' },
                { status: 400 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('photo') as File;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { success: false, error: 'File must be an image' },
                { status: 400 }
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, error: 'File size must be less than 5MB' },
                { status: 400 }
            );
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = personName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const filename = `${sanitizedName}_${timestamp}.${fileExtension}`;
        const filepath = join(uploadsDir, filename);

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // Generate URL path
        const photoUrl = `/uploads/${filename}`;

        // Update person record with photo URL
        const updateResponse = await fetch(`${PYTHON_BACKEND_URL}/dashboard/update-person`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: personName,
                photo_url: photoUrl,
            }),
        });

        if (!updateResponse.ok) {
            // File was saved but update failed - we could delete the file here
            const errorData = await updateResponse.json().catch(() => ({ detail: 'Unknown error' }));
            return NextResponse.json(
                { 
                    success: false, 
                    error: errorData.detail || 'Failed to update person record',
                },
                { status: 500 }
            );
        }

        const updateData = await updateResponse.json();
        
        return NextResponse.json({
            success: true,
            photo_url: photoUrl,
            data: updateData.data,
        });
    } catch (error) {
        console.error('Error uploading photo:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to upload photo',
            },
            { status: 500 }
        );
    }
}






