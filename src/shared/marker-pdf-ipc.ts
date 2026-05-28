export type MarkerConvertPdfRequest = {
  filePath: string
  markerCommand?: string
  markerExtraArgs?: string
}

export type MarkerConvertPdfResponse =
  | { ok: true; markdown: string; stderr: string }
  | { ok: false; error: string; stderr: string }
