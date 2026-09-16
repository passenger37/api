/**
 * A DM report is scoped to the message + channel (like a server MessageReport
 * but without server/member context). For STANDARD channels `reportPackage`
 * holds nothing special (the server already stores plaintext). For
 * PRIVATE_E2EE channels the client decrypts locally and deliberately includes
 * the decrypted content inside `reportPackage` — the server stores it verbatim
 * but never scans DM plaintext proactively (spec #38 "Reporting a Message").
 */
export interface ReportPackageLike {
  /** Decrypted body at the time of reporting (PRIVATE_E2EE only; STANDARD can omit). */
  body?: string | null;
  /** Optional client list of attachments included in the package. */
  attachments?: unknown[];
  /** Client-chosen verbosity of the report. */
  verbosity?: 'minimal' | 'detail';
  /** Free-form detail the reporter chose to include. */
  detailText?: string | null;
  /** Reason the reporter selected, echoed for the reviewer. */
  reason?: string | null;
}
