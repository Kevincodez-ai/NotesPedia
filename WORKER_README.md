# Worker & AI fields

This document explains how to run the background AI worker and the database migration that stores AI processing errors and timestamps.

## npm scripts

- `npm run worker` — run the compiled worker JavaScript (expects `./dist/worker/ai-processor.js` to exist).
- `npm run worker:dev` — run the worker via `ts-node` for development.

## Database migration (add fields to Note)

We added two nullable fields to the Prisma `Note` model:

- `aiProcessingError String?` — short error message when AI processing fails or validation fails.
- `aiProcessedAt DateTime?` — timestamp when AI processing last ran (success or failure).

To apply this change:

1. Make sure your DATABASE_URL is set.
2. Run locally:

```bash
npx prisma migrate dev --name add-ai-processing-fields
npx prisma generate
```

3. For production deploys, use:

```bash
npx prisma migrate deploy
npx prisma generate
```

Note: if you prefer `prisma db push` for a non-migration approach (development only), you can use `npx prisma db push` but migrations are recommended for production.

## Running the worker

### Development

```bash
# in dev environment
npm run worker:dev
```

### Production

1. Build the project:

```bash
npm ci
npm run build
npx prisma generate
```

2. Start the worker (example):

```bash
# after building and compiling ts -> js to ./dist
node ./dist/worker/ai-processor.js
```

Run the worker as a long-lived process with a process manager (pm2), systemd service, or on a worker platform (Render background worker, Railway worker, etc.).

## How enqueueing works

- The API route `/api/ai/process` accepts `{ noteId, enqueue: true }` and will mark the note `status = 'queued'`.
- The worker polls for `status = 'queued'`, claims it (sets `processing`), runs AI, and writes results.
- On success the worker sets `status = 'active'`, clears `aiProcessingError`, and sets `aiProcessedAt`.
- On failure the worker sets `status = 'failed'` and writes `aiProcessingError` with a short message and sets `aiProcessedAt`.

## Testing

1. Create a note with extractedText (or upload a txt/pdf/docx so extractedText is populated).
2. POST to `/api/ai/process` with `{ "noteId": "<id>", "enqueue": true }` and valid auth.
3. Watch worker logs for processing. Inspect DB for `aiProcessedAt` and `aiProcessingError` when done.

If you want, I can also add a small migration file and a PR that includes the generated migration SQL, but typically you run `prisma migrate` locally to produce the migration.
