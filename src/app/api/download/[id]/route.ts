import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getSupabaseAdmin, isStorageConfigured, STORAGE_BUCKET } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const note = await db.note.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        filePath: true,
        storageKey: true,
        fileType: true,
        extractedText: true,
        status: true,
        uploaderId: true,
      },
    });

    if (!note || note.status === 'removed' || note.status === 'flagged') {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Increment download count
    await db.note.update({
      where: { id: note.id },
      data: { downloadCount: { increment: 1 } },
    });

    // Create download record (ignore if already exists due to unique constraint)
    try {
      await db.download.create({
        data: { noteId: note.id, userId: user.id },
      });
    } catch {
      // Already downloaded before - that's fine, still allow download
    }

    // Award reputation to uploader
    if (note.uploaderId !== user.id) {
      try {
        await db.profile.update({
          where: { userId: note.uploaderId },
          data: {
            downloadCount: { increment: 1 },
            reputationScore: { increment: 2 },
          },
        });
        await db.reputationLog.create({
          data: { userId: note.uploaderId, action: 'download', points: 2, noteId: note.id },
        });
      } catch {
        // Uploader may not have a profile yet
      }
    }

    // Try Supabase Storage first (if configured and note has storageKey)
    if (note.storageKey && isStorageConfigured()) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(note.storageKey, 3600); // 1 hour expiry

        if (!signedUrlError && signedUrlData?.signedUrl) {
          // Redirect to the signed URL
          return NextResponse.redirect(signedUrlData.signedUrl);
        }
      }
    }

    // If filePath exists, serve the actual file
    if (note.filePath) {
      try {
        const fullPath = join(process.cwd(), 'public', note.filePath);
        const fileBuffer = await readFile(fullPath);
        const fileName = `${note.title.replace(/[^a-zA-Z0-9]/g, '_')}.${note.fileType || 'txt'}`;

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': String(fileBuffer.length),
          },
        });
      } catch (fileError) {
        // File not found on disk - log the issue and fall through to extractedText
        console.warn(`Download: file not found on disk for note ${note.id} at path ${note.filePath}`, fileError);
      }
    }

    // If extractedText exists, generate a .txt file
    if (note.extractedText) {
      const textBuffer = Buffer.from(note.extractedText, 'utf-8');
      // Use a clear naming convention: indicate this is extracted text content
      const baseName = note.title.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${baseName}_extracted.txt`;

      return new NextResponse(textBuffer, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': String(textBuffer.length),
        },
      });
    }

    // Neither filePath nor extractedText available
    return NextResponse.json(
      { success: false, error: 'No downloadable content available for this note' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ success: false, error: 'Download failed' }, { status: 500 });
  }
}
