import type { Response } from "express";

interface PgError {
  code?: string;
  constraint?: string;
  detail?: string;
}

function isPgError(err: unknown): err is PgError {
  return typeof err === "object" && err !== null && "code" in err;
}

/**
 * drizzle-orm wraps the underlying pg driver error in its own error class
 * (e.g. DrizzleQueryError), with the original `pg` error — the one that
 * actually carries the Postgres error `code` (23505, 23503, etc.) — attached
 * as `.cause`. Unwrap that before checking the code.
 */
function unwrapPgError(err: unknown): PgError | undefined {
  if (isPgError(err)) return err;
  if (err instanceof Error && err.cause !== undefined && isPgError(err.cause)) return err.cause;
  return undefined;
}

/**
 * Translates common Postgres constraint violations (unique, foreign key)
 * into sensible HTTP responses. Returns true when the error was handled
 * (response has been sent), false when the caller should rethrow / let the
 * default error handler take over.
 */
export function handleDbError(err: unknown, res: Response): boolean {
  const pgError = unwrapPgError(err);
  if (!pgError) return false;

  if (pgError.code === "23505") {
    res.status(409).json({
      error: "conflict",
      message: "A record with these values already exists.",
    });
    return true;
  }

  if (pgError.code === "23503") {
    res.status(400).json({
      error: "invalid_reference",
      message: "The referenced record does not exist, or is still referenced by other records.",
    });
    return true;
  }

  return false;
}
