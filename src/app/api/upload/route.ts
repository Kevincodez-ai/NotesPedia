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
      // Basic PDF text extraction: look for text between stream markers
      // For production, use a proper PDF parser like pdf-parse
      try {
        const rawText = fileBuffer.toString(
          "utf-8",
          0,
          Math.min(fileBuffer.length, 100000),
        );
        const textMatches = rawText.match(/BT\s([\s\S]*?)ET/g);
        if (textMatches) {
          extractedText = textMatches
            .map((m) =>
              m
                .replace(/BT\s|ET/g, "")
                .replace(/\([^)]*\)/g, (match) => match.slice(1, -1)),
            )
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 50000);
        }
      } catch {
        // Text extraction failed — that's OK, note will still be uploaded
      }
    }

    // Try Supabase Storage first, fall back to local disk
    let uploadedStorageKey: string | null = null;
    let uploadedFilePath: string | null = null;

    if (isStorageConfigured()) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storageKey, fileBuffer, {
            contentType: file.type,
            upsert: false,
          });

        if (!uploadError) {
          uploadedStorageKey = storageKey;
        } else {
          console.warn(
            "Supabase upload failed, falling back to local:",
            uploadError.message,
          );
        }
      }
    }

    // If Supabase upload failed or isn't configured, save to local disk
    if (!uploadedStorageKey) {
      try {
        if (!existsSync(localDir)) {
          await mkdir(localDir, { recursive: true });
        }
        await writeFile(localPath, fileBuffer);
        uploadedFilePath = filePath;
      } catch (diskError) {
        console.error("Local file save failed:", diskError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to save uploaded file. Please try again.",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      filePath: uploadedFilePath,
      storageKey: uploadedStorageKey,
      fileType,
      fileSize: file.size,
      originalName: file.name,
      extractedText: extractedText || undefined,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 },
    );
  }
}

// DELETE - Clean up an orphaned uploaded file
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { filePath } = await request.json();
    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json(
        { success: false, error: "filePath is required" },
        { status: 400 },
      );
    }

    // Sanitize path to prevent traversal
    if (!filePath.startsWith("/uploads/") || filePath.includes("..")) {
      return NextResponse.json(
        { success: false, error: "Invalid file path" },
        { status: 400 },
      );
    }

    // Delete from local disk
    const fullPath = join(process.cwd(), "public", filePath);
    try {
      await unlink(fullPath);
    } catch {
      // File might not exist — that's fine
    }

    return NextResponse.json({ success: true, message: "File deleted" });
  } catch (error) {
    console.error("File delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete file" },
      { status: 500 },
    );
  }
}
