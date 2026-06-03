/** Max authors shown on citation cards before "et al." — aligned with bundled CSL where applicable. */
export function authorPreviewLimits(styleId: string | null | undefined): {
  maxShown: number
  etAlThreshold: number
} {
  if (styleId === 'vancouver') {
    return { maxShown: 6, etAlThreshold: 7 }
  }
  return { maxShown: 3, etAlThreshold: 4 }
}
