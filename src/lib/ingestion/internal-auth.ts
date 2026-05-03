import "server-only";
import { timingSafeEqual } from "node:crypto";

export class InternalAuthError extends Error {
  constructor(message = "unauthorized") {
    super(message);
    this.name = "InternalAuthError";
  }
}

export function assertInternalRequest(req: Request): void {
  const expected = process.env.INTERNAL_PROCESSING_SECRET;
  if (!expected) {
    throw new InternalAuthError("INTERNAL_PROCESSING_SECRET is not configured");
  }

  const provided = req.headers.get("x-internal-secret") ?? "";
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");

  if (expectedBuf.length !== providedBuf.length) {
    throw new InternalAuthError();
  }
  if (!timingSafeEqual(expectedBuf, providedBuf)) {
    throw new InternalAuthError();
  }
}
