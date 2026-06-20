# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api.spec.ts >> Auth API >> unauthenticated access to protected endpoints
- Location: e2e/api.spec.ts:196:7

# Error details

```
Error: apiRequestContext.get: connect ECONNREFUSED ::1:3000
Call log:
  - → GET http://localhost:3000/api/notes
    - user-agent: Playwright/1.61.0 (x64; debian 13) node/24.16
    - accept: */*
    - accept-encoding: gzip,deflate,br

```