import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin, isStorageConfigured, STORAGE_BUCKET } from '@/lib/supabase';

const ALLOWED_TYPES: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'text/plain': ['txt'],
  'text/markdown': ['md'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const DANGEROUS_EXTENSIONS = ['html', 'htm', 'svg', 'js', 'mjs', 'xml', 'xhtml', 'shtml', 'php', 'asp', 'aspx', 'jsp', 'exe', 'bat', 'cmd', 'sh', 'py', 'rb', 'pl', 'cgi'];

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    // Validate file type
    const fileType = file.type;
    const allowedExtensions = ALLOWED_TYPES[fileType];
    if (!allowedExtensions) {
      const allowedTypes = Object.values(ALLOWED_TYPES).flat().join(', ');
      return NextResponse.json({
        success: false,
        error: `File type not allowed. Allowed types: ${allowedTypes}`,
      }, { status: 400 });
    }

    // Get file extension and enforce it matches the allowed MIME type
    const originalName = file.name;
    const providedExt = originalName.split('.').pop()?.toLowerCase() || '';

    let ext: string;
    if (providedExt && (allowedExtensions.includes(providedExt) || allowedExtensions.includes(providedExt.replace('jpg', 'jpeg')))) {
      ext = providedExt;
    } else {
      ext = allowedExtensions[0];
    }

    // Block dangerous extensions
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      return NextResponse.json({
        success: false,
        error: `File extension ".${ext}" is not allowed for security reasons`,
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${randomStr}.${ext}`;

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure upload directory exists and save locally
    const path = await import('path');
    const { writeFile, mkdir } = await import('fs/promises');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Extract text from TXT/MD files
    let extractedText: string | null = null;
    if (fileType === 'text/plain' || fileType === 'text/markdown' || ext === 'txt' || ext === 'md') {
      extractedText = buffer.toString('utf-8');
      if (extractedText.length > 50000) {
        extractedText = extractedText.slice(0, 50000);
      }
    }

    // If Supabase Storage is configured, upload to cloud storage
    let storageKey: string | null = null;
    if (isStorageConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          storageKey = `uploads/${user.id}/${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storageKey, buffer, {
              contentType: fileType || 'application/octet-stream',
              upsert: false,
            });

          if (uploadError) {
            console.error('Supabase Storage upload error:', uploadError);
            storageKey = null;
          }
        }
      } catch (err) {
        console.error('Supabase Storage upload error:', err);
        storageKey = null;
      }
    }

    // Determine file type category
    let fileTypeCategory = ext;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      fileTypeCategory = 'image';
    }

    return NextResponse.json({
      success: true,
      filePath: `/uploads/${fileName}`,
      storageKey,
      fileType: fileTypeCategory,
      fileSize: file.size,
      originalName,
      extractedText,
    }, { status: 201 });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 500 });
  }
}
