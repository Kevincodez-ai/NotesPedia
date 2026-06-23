import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import {
  rateLimiter,
  RateLimits,
  getClientIdentifier,
} from "@/lib/rate-limiter";
import {
  getSupabaseAdmin,
  isStorageConfigured,
  STORAGE_BUCKET,
} from "@/lib/supabase";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "text/plain": "txt",
  "text/markdown": "md",
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Rate limit uploads
    const clientId = getClientIdentifier(request, user.id);
    const { allowed } = rateLimiter.check(
      `upload:${clientId}`,
      RateLimits.upload.limit,
      RateLimits.upload.windowMs,
    );
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Upload limit reached. Please try again later.",
        },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 50MB limit" },
        { status: 400 },
      );
    }

    // Validate file type
    const fileType = ALLOWED_MIME_TYPES[file.type];
    if (!fileType) {
      return NextResponse.json(
        {
          success: false,
          error: `File type "${file.type}" is not supported. Allowed: PDF, DOCX, PPTX, TXT, MD, Images`,
        },
        { status: 400 },
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueId = randomUUID();
    const storageKey = `uploads/${user.id}/${uniqueId}/${originalName}`;
    const localDir = join(process.cwd(), "public", "uploads", user.id);
    const localPath = join(localDir, `${uniqueId}_${originalName}`);
    const filePath = `/uploads/${user.id}/${uniqueId}_${originalName}`;

    let extractedText = "";

    // Extract text content from supported file types
    if (fileType === "txt" || fileType === "md") {
      extractedText = fileBuffer.toString("utf-8");
    } else if (fileType === "pdf") {
      try {
        const pdfParse = await import('pdf-parse');
        const data = await pdfParse.default(fileBuffer);
        extractedText = data?.text || '';
      } catch (e) {
        console.warn('PDF text extraction not available or failed:', e);
      }
    } else if (fileType === "docx") {
      try {
        const mammoth = await import('mammoth');
        const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = value || '';
      } catch (e) {
        console.warn('DOCX text extraction not available or failed:', e);
      }
    }

    // Ensure uploads dir exists
    if (!existsSync(localDir)) {
      await mkdir(localDir, { recursive: true });
    }

    // Save file locally (fallback when Supabase not configured)
    await writeFile(localPath, fileBuffer);

    // Create DB record for the note (simplified example)
    const note = await db.note.create({
      data: {
        title: formData.get('title') as string || originalName,
        description: (formData.get('description') as string) || null,
        uploaderId: user.id,
        filePath,
        fileType,
        extractedText: extractedText || null,
        status: 'active',
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 500 });
  }
}
