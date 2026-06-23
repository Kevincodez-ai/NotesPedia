feat(ai): background worker + ai lib + enqueue support

- Added src/lib/ai.ts with ZAI client, callAI wrapper, and zod schemas
- Added src/worker/ai-processor.ts — a DB-polling worker to process queued notes
- Updated ai process route to support enqueue (background processing)
- Added PDF/DOCX extraction dependencies earlier and package.json updated
