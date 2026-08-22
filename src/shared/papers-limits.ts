/** Shared caps for the Masdar Papers folder-scan attach flow (#19). */

/** Upper bound on PDFs considered in one folder scan. */
export const MAX_PAPERS_SCAN_FILES = 200

/** Per-PDF size cap — larger files are skipped during the scan. */
export const MAX_PAPERS_FILE_BYTES = 50 * 1024 * 1024

/** Recursion depth guard for the folder walk. */
export const MAX_PAPERS_SCAN_DEPTH = 6
