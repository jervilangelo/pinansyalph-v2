import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ZodType } from 'zod'

export const ROOT = resolve(import.meta.dirname, '..', '..')
export const DATA_DIR = resolve(ROOT, 'src', 'data')

/** Identify the client honestly without personal contact details. */
export const USER_AGENT =
  'WorthItBaSaPilipinas-DataBot/1.0 (+https://github.com/jervilangelo/worthitbasapilipinas.site)'

export function dataPath(name: string): string {
  return resolve(DATA_DIR, name)
}

export function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

/** Remove volatile fields so "did the data change?" ignores the retrieval timestamp. */
function comparable(value: unknown): string {
  return JSON.stringify(value, (key, v) => (key === 'retrievedAt' ? undefined : v))
}

/**
 * Validate `next` with `schema`, then write it only if its substantive content
 * differs from what is on disk. Returns whether the file changed.
 * Throws (and leaves the existing file untouched) when validation fails.
 */
export function writeIfChanged<T>(path: string, next: T, schema: ZodType<T>): boolean {
  const parsed = schema.safeParse(next)
  if (!parsed.success) {
    throw new Error(`Validation failed for ${path}:\n${parsed.error.message}`)
  }
  const current = readJson<T>(path)
  if (current && comparable(current) === comparable(parsed.data)) return false
  writeFileSync(path, JSON.stringify(parsed.data, null, 2) + '\n', 'utf8')
  return true
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  attempts = 3,
  timeoutMs = 45_000,
): Promise<Response> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return res
    } catch (err) {
      lastError = err
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 2000 * (i + 1)))
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

/** Append a line to the GitHub Actions job summary (no-op locally). */
export function summary(line: string): void {
  console.log(line)
  const file = process.env.GITHUB_STEP_SUMMARY
  if (file) appendFileSync(file, line + '\n')
}

export function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Run a fetcher so that any failure keeps the previous dataset, reports the
 * problem, and exits non-zero only when STRICT=1 (the scheduled workflow keeps
 * going so the other datasets can still refresh).
 */
export async function runFetcher(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch (err) {
    summary(`- ⚠️ **${name}**: retrieval failed, previous dataset kept. ${(err as Error).message}`)
    if (process.env.STRICT === '1') process.exitCode = 1
  }
}
